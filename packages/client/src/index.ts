import { EventEmitter } from '@hmi-ts/utils'
import {
  ConnectionClosedError,
  ProtocolError,
  type IResponse,
  type PacketFactory,
  type BaseReadOptions,
  type RequestTask,
  type SubscribeOptions,
  type Transport,
  type BaseWriteOptions,
} from '@hmi-ts/core'
import {
  decodeResponseByMode,
  encodeReadCoilsByMode,
  encodeReadDiscreteInputsByMode,
  encodeReadHoldingRegistersByMode,
  encodeWriteMultipleCoilsByMode,
  encodeWriteMultipleRegistersByMode,
  encodeWriteSingleCoilByMode,
  encodeWriteSingleRegisterByMode,
  type ModbusWireMode,
} from '@hmi-ts/protocol'
import { PRIORITY, RequestScheduler } from '@hmi-ts/scheduler'
import { SubscriptionEngine } from '@hmi-ts/subscription'

export interface ClientEvent {
  connect: () => void
  disconnect: (error?: Error) => void
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
  private subscriptionEngine: SubscriptionEngine
  private inFlight: InFlight | null = null
  constructor(private readonly options: ClientOptions<T>) {
    super()

    const transportAny = options.transport as Transport & {
      onConnect?: (cb: () => void) => void
    }

    options.transport.onData((data) => {
      try {
        // 解析响应
        const response = decodeResponseByMode(data, 'tcp')
        // TCP 通过 transactionId 精确匹配；RTU/ASCII 由于串行上下文，使用当前 inFlight。
        if (this.inFlight && (this.mode !== 'tcp' || this.inFlight.tx === response.transactionId)) {
          // inFlight 用来确保按顺序匹配
          this.inFlight.resolve({
            ...response,
            transactionId: this.inFlight.tx,
          })
          this.inFlight = null
        }
      } catch (error) {
        this.emit('error', error as Error)
      }
    })

    options.transport.onClose((error) => {
      this.scheduler.clearPending(new ConnectionClosedError())
      if (this.inFlight) {
        this.inFlight.reject(new ConnectionClosedError())
        this.inFlight = null
      }
      this.emit('disconnect', error)
    })

    transportAny.onConnect?.(() => {
      this.emit('connect')
      this.subscriptionEngine.start()
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
    this.emit('connect')
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

  async write(options: Parameters<T['encodeWrite']>[0]) {
    const tx = this.nextTx()
    const unitId = options?.unitId ?? this.options.defaultUnitId ?? 1
    const timeout = options?.timeout ?? this.options.defaultTimeout ?? 1000

    // 构建帧
    const frame = this.options.packetFactory.encodeWrite(options)

    // 安排请求并等待响应
    const response = await this.scheduleRequest({
      id: tx,
      priority: options?.priority ?? PRIORITY.write,
      timeout,
      execute: () => this.performRequest(tx, frame),
      resolve: () => {},
      reject: () => {},
    })

    if (!response.success) {
      throw new ProtocolError(`modbus exception ${response.exceptionCode}`)
    }
  }

  async read(options: Parameters<T['encodeRead']>[0]): Promise<number[]> {
    const tx = this.nextTx()
    const unitId = options?.unitId ?? this.options.defaultUnitId ?? 1
    const timeout = options?.timeout ?? this.options.defaultTimeout ?? 1000

    // 构建帧
    const frame: Uint8Array = this.options.packetFactory.encodeRead(options)

    // 安排请求并等待响应
    const response = await this.scheduleRequest({
      id: tx,
      priority: options?.priority ?? PRIORITY.read,
      timeout,
      execute: () => this.performRequest(tx, frame),
      resolve: () => {},
      reject: () => {},
    })

    if (!response.success) {
      throw new ProtocolError(`exception ${response.exceptionCode}`)
    }
    return response.registers ?? []
  }

  subscribe(options: SubscribeOptions & Parameters<T['encodeRead']>[0]) {
    // 报文合并必须满足, unitId 一致, interval 一致
    // subscriptionEngine 里实现了报文合并功能
    return this.subscriptionEngine.subscribe({
      unitId: options.unitId ?? this.options.defaultUnitId ?? 1,
      start: params.start,
      length: params.length,
      interval: options.interval ?? this.options.defaultInterval ?? 1000,
      callback: options.callback,
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
      throw error
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
    // transactionId 按 16 位递增循环；0 常留作未初始化/保留值，这里跳过。
    this.sequence = (this.sequence + 1) & 0xffff
    if (this.sequence === 0) {
      this.sequence = 1
    }
    return this.sequence
  }
}
