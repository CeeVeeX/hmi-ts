import {
  EventEmitter,
  ConnectionClosedError,
  ProtocolError,
  type IResponse,
  type PacketFactory,
  type RequestTask,
  type SubscribeOptions,
  type Transport,
  PRIORITY,
  RequestScheduler,
  SubscriptionEngine,
  ResponseCode,
  type PartialBy,
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
  defaultUnitId?: number
  defaultTimeout?: number
  defaultInterval?: number
}

interface InFlight {
  tx: number
  resolve: (response: IResponse) => void
  reject: (error: Error) => void
}

export class Client<T extends PacketFactory> extends EventEmitter<ClientEvent> {
  private scheduler = new RequestScheduler()
  private sequence = 0
  private subscriptionEngine: SubscriptionEngine<T>
  private inFlight: InFlight | null = null
  constructor(private readonly options: ClientOptions<T>) {
    super()

    options.transport.on('message', (data) => {
      try {
        // 解析响应
        // const response = decodeResponseByMode(data, 'tcp')
        const response = options.packetFactory.decodeResponse(data)
        // TCP 通过 transactionId 精确匹配；RTU/ASCII 由于串行上下文，使用当前 inFlight。
        if (
          this.inFlight &&
          (options.packetFactory.isSerial || this.inFlight.tx === response.transactionId)
        ) {
          // inFlight 用来确保按顺序匹配
          this.inFlight.resolve(response)
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

  async write(options: PartialBy<Parameters<T['encodeWrite']>[1], 'unitId'>): Promise<IResponse> {
    const tx = this.nextTx()

    const unitId = options?.unitId ?? this.options.defaultUnitId ?? 1
    const timeout = options?.timeout ?? this.options.defaultTimeout ?? 1000

    // 构建帧
    const frame = this.options.packetFactory.encodeWrite(tx, {
      ...options,
      unitId,
      timeout,
    })

    // 安排请求并等待响应
    const response = await this.scheduleRequest({
      id: tx,
      priority: options?.priority ?? PRIORITY.write,
      timeout,
      execute: () => this.performRequest(tx, frame),
      resolve: () => {},
      reject: () => {},
    })

    return response
  }

  async read(options: PartialBy<Parameters<T['encodeRead']>[1], 'unitId'>): Promise<Uint8Array> {
    const tx = this.nextTx()
    const unitId = options?.unitId ?? this.options.defaultUnitId ?? 1
    const timeout = options?.timeout ?? this.options.defaultTimeout ?? 1000

    // 构建帧
    const frame: Uint8Array = this.options.packetFactory.encodeRead(tx, {
      ...options,
      unitId,
      timeout,
    })

    // 安排请求并等待响应
    const response = await this.scheduleRequest({
      id: tx,
      priority: options?.priority ?? PRIORITY.read,
      timeout,
      execute: () => this.performRequest(tx, frame),
      resolve: () => {},
      reject: () => {},
    })

    if (response.code !== ResponseCode.SUCCESS) {
      throw new ProtocolError(`exception ${response.code}`)
    }
    return response.data ?? new Uint8Array()
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

  private async scheduleRequest(task: RequestTask<IResponse>): Promise<IResponse> {
    try {
      return await this.scheduler.schedule(task)
    } catch (error) {
      // 调度器把超时作为普通异常抛出；这里统一转成客户端 timeout 事件，
      // 让上层既能捕获异常，也能通过事件做监控或告警。
      if ((error as Error).name === 'TimeoutError') {
        this.emit('timeout', error as Error)
      }

      return Promise.reject(error)
    }
  }

  private async performRequest(tx: number, frame: Uint8Array): Promise<IResponse> {
    return new Promise<IResponse>((resolve, reject) => {
      // 当前客户端假设“单连接串行请求”：任何时刻仅保留一个 inFlight。
      // 该约束由 RequestScheduler 保证，避免响应乱序匹配。
      this.inFlight = {
        tx,
        resolve,
        reject,
      }

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
