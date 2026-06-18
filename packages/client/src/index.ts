import { EventEmitter } from '@hmi-ts/utils'
import {
  ConnectionClosedError,
  ProtocolError,
  type IResponse,
  type ReadOptions,
  type RequestTask,
  type SubscribeOptions,
  type Transport,
  type WriteOptions,
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
  timeout: () => void
  error: (error: Error) => void
}

export interface ClientOptions {
  transport: Transport
  defaultUnitId?: number
  defaultTimeout?: number
}

interface InFlight {
  tx: number
  resolve: (response: IResponse) => void
  reject: (error: Error) => void
}

export class Client extends EventEmitter<ClientEvent> {
  private scheduler = new RequestScheduler()
  private sequence = 0
  private subscriptionEngine: SubscriptionEngine
  private inFlight: InFlight | null = null
  constructor(private readonly options: ClientOptions) {
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

  async write(options: WriteOptions) {
    const tx = this.nextTx()
  }

  async read(options: ReadOptions): Promise<number[]> {
    const tx = this.nextTx()

    return []
  }

  subscribe(options: SubscribeOptions) {}

  private nextTx(): number {
    // transactionId 按 16 位递增循环；0 常留作未初始化/保留值，这里跳过。
    this.sequence = (this.sequence + 1) & 0xffff
    if (this.sequence === 0) {
      this.sequence = 1
    }
    return this.sequence
  }
}
