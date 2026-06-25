import {
  EventEmitter,
  ConnectionClosedError,
  type IReadResponse,
  type IWriteResponse,
  type PacketFactory,
  type RequestTask,
  type SubscribeOptions,
  type Transport,
  PRIORITY,
  RequestScheduler,
  SubscriptionEngine,
  type PartialBy,
  type IResponse,
  QueueOverflowError,
} from '@hmi-ts/core'

export interface ClientEvent {
  connected: () => void
  disconnected: (error: Error) => void
  destroyed: (error: Error) => void
  timeout: (error: Error) => void
  error: (error: Error) => void
}

export interface ClientOptions<T> {
  packetFactory: T
  transport: Transport
  maxQueueSize?: number
  defaultUnitId?: number
  defaultTimeout?: number
  defaultInterval?: number
}

interface InFlight<T extends IResponse> {
  tk: RequestTask<T>
  resolve: (response: T | PromiseLike<T>) => void
  reject: (error: Error) => void
}

export class Client<T extends PacketFactory> extends EventEmitter<ClientEvent> {
  private scheduler: RequestScheduler
  private sequence = 0
  private subscriptionEngine: SubscriptionEngine<T>
  private inFlight: InFlight<IResponse> | null = null
  constructor(private readonly options: ClientOptions<T>) {
    super()

    this.scheduler = new RequestScheduler(this.options.maxQueueSize ?? 1000)

    // 所有响应都通过 transport 的 message 事件接收，按 transactionId 匹配到对应的请求。
    options.transport.on('message', (data) => {
      try {
        if (!this.inFlight) {
          throw new Error('no inFlight request, but received a response')
        }

        // TCP 通过 transactionId 精确匹配；RTU/ASCII 由于串行上下文，使用当前 inFlight。
        if (
          options.packetFactory.isSerial ||
          this.inFlight.tk.id === options.packetFactory.getTransactionId(data)
        ) {
          // 解析响应
          const response = options.packetFactory.decodeResponse(this.inFlight.tk.options, data)

          // inFlight 用来确保按顺序匹配
          this.inFlight.resolve({
            ...response,
            startAt: this.inFlight.tk.startAt,
            endAt: Date.now(),
          })
          this.inFlight = null
        }
      } catch (error) {
        this.emit('error', error as Error)
      }
    })

    options.transport.on('connected', () => {
      this.emit('connected')
    })

    options.transport.on('disconnected', (error) => {
      this.scheduler.clearPending(new ConnectionClosedError())
      if (this.inFlight) {
        this.inFlight.reject(new ConnectionClosedError())
        this.inFlight = null
      }
      this.emit('disconnected', error)
    })

    this.subscriptionEngine = new SubscriptionEngine({
      packetFactory: options.packetFactory,
      // 提供给订阅轮询用
      read: (options) => this.read(options),
      onError: (error) => this.emit('error', error),
    })
  }

  /**
   * 建立传输连接。
   *
   * @example
   * ```ts
   * await client.connect()
   * ```
   */
  async connect(): Promise<void> {
    await this.options.transport.connect()
    this.subscriptionEngine.start()
  }

  /**
   * 关闭连接并清理调度与订阅。
   *
   * @example
   * ```ts
   * await client.close()
   * ```
   */
  async close(): Promise<void> {
    this.subscriptionEngine.stop()
    this.scheduler.close(new ConnectionClosedError())
    await this.options.transport.close()
  }

  async destroy(): Promise<void> {
    this.subscriptionEngine.stop()
    this.scheduler.close(new ConnectionClosedError())
    await this.options.transport.destroy()
  }

  async write(
    options: PartialBy<Parameters<T['encodeWrite']>[1], 'unitId'>,
  ): Promise<IWriteResponse> {
    const tx = this.nextTx()

    const unitId = options?.unitId ?? this.options.defaultUnitId ?? 1
    const timeout = options?.timeout ?? this.options.defaultTimeout ?? 1000

    const opts = {
      ...options,
      unitId,
      timeout,
    }

    // 构建帧
    const frame = this.options.packetFactory.encodeWrite(tx, opts)

    // 安排请求并等待响应
    const response = await this.scheduleRequest<IWriteResponse>({
      id: tx,
      priority: options?.priority ?? PRIORITY.write,
      timeout,
      options: opts,
      startAt: Date.now(),
      execute: (task) => this.performRequest(task, frame),
      resolve: () => {},
      reject: () => {},
    })

    return response
  }

  async read(options: PartialBy<Parameters<T['encodeRead']>[1], 'unitId'>): Promise<IReadResponse> {
    const tx = this.nextTx()
    const unitId = options?.unitId ?? this.options.defaultUnitId ?? 1
    const timeout = options?.timeout ?? this.options.defaultTimeout ?? 1000

    const opts = {
      ...options,
      unitId,
      timeout,
    }

    // 构建帧
    const frame: Uint8Array = this.options.packetFactory.encodeRead(tx, opts)

    // 安排请求并等待响应
    const response = await this.scheduleRequest<IReadResponse>({
      id: tx,
      priority: options?.priority ?? PRIORITY.read,
      timeout,
      options: opts,
      startAt: Date.now(),
      execute: (task) => this.performRequest(task, frame),
      resolve: () => {},
      reject: () => {},
    })

    return response
  }

  subscribe(
    options: PartialBy<SubscribeOptions, 'unitId'> &
      PartialBy<Parameters<T['encodeRead']>[1], 'unitId'>,
  ) {
    const unitId = options?.unitId ?? this.options.defaultUnitId ?? 1
    const timeout = options?.timeout ?? this.options.defaultTimeout ?? 1000
    // 报文合并必须满足, unitId 一致, interval 一致
    // subscriptionEngine 里实现了报文合并功能
    return this.subscriptionEngine.subscribe({
      ...options,
      unitId,
      timeout,
    })
  }

  private async scheduleRequest<T extends IResponse>(task: RequestTask<T>): Promise<T> {
    try {
      return await this.scheduler.schedule(task)
    } catch (error) {
      // 队列溢出：系统过载，建议降低请求速率或增加超时
      if (error instanceof QueueOverflowError) {
        this.emit('error', error as Error)
      }

      // 调度器把超时作为普通异常抛出；这里统一转成客户端 timeout 事件，
      // 让上层既能捕获异常，也能通过事件做监控或告警。
      if ((error as Error).name === 'TimeoutError') {
        this.emit('timeout', error as Error)
      }

      return Promise.reject(error)
    }
  }

  private async performRequest<T extends IResponse>(
    tk: RequestTask<T>,
    frame: Uint8Array,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // 当前客户端假设“单连接串行请求”：任何时刻仅保留一个 inFlight。
      // 该约束由 RequestScheduler 保证，避免响应乱序匹配。
      this.inFlight = {
        tk,
        resolve,
        reject,
      } as unknown as InFlight<IResponse>

      void this.options.transport.send(frame).catch((error) => {
        this.inFlight = null
        reject(error as Error)
      })
    })
  }

  private nextTx(): number {
    return this.options.packetFactory.getTransactionId(++this.sequence)
  }
}
