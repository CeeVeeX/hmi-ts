import { EventEmitter } from '@hmi-ts/utils'

/**
 * 传输层事件类型。
 *
 * @example
 * ```ts
 * transport.on('connected', () => console.log('connected'))
 * transport.on('disconnected', (err) => console.log(err?.message))
 * transport.on('destroyed', (err) => console.log(err?.message))
 * transport.on('message', (data) => console.log(data.length))
 * transport.on('error', (err) => console.log(err.message))
 * ```
 */
export interface TransportEvent {
  /**
   * 连接建立事件。
   *
   * @example
   * ```ts
   * transport.on('connected', () => console.log('connected'))
   * ```
   */
  connected: () => void
  /**
   * 连接关闭事件。
   *
   * @example
   * ```ts
   * transport.on('disconnected', (err) => console.log(err?.message))
   * ```
   */
  disconnected: (error: Error) => void
  /**
   * 传输实例销毁事件。
   *
   * @example
   * ```ts
   * transport.on('destroyed', (err) => console.log(err?.message))
   * ```
   */
  destroyed: (error: Error) => void
  /**
   * 接收到数据事件。
   *
   * @example
   * ```ts
   * transport.on('message', (data) => console.log(data.length))
   * ```
   */
  message: (data: Uint8Array) => void
  /**
   * 传输错误事件。
   *
   * @example
   * ```ts
   * transport.on('error', (err) => console.log(err.message))
   * ```
   */
  error: (error: Error) => void
}

/**
 * 传输层统一接口。
 *
 * @example
 * ```ts
 * async function bootstrap(transport: Transport) {
 *   await transport.connect()
 *   await transport.send(Uint8Array.from([0x01, 0x03]))
 * }
 * ```
 */
export interface Transport extends EventEmitter<TransportEvent> {
  /**
   * 建立连接。
   *
   * @example
   * ```ts
   * await transport.connect()
   * ```
   */
  connect(): Promise<void>
  /**
   * 关闭连接。
   *
   * @example
   * ```ts
   * await transport.close()
   * ```
   */
  close(): Promise<void>
  /**
   * 销毁传输实例，释放资源。
   *
   * @example
   * ```ts
   * await transport.destroy()
   * ```
   */
  destroy(): Promise<void>
  /**
   * 发送数据。
   *
   * @example
   * ```ts
   * await transport.send(Uint8Array.from([0x01, 0x03]))
   * ```
   */
  send(data: Uint8Array): Promise<void>
}

/**
 * 传输错误异常，用于 socket/ws/ipc 层失败。
 *
 * @example
 * ```ts
 * throw new TransportError('send failed')
 * ```
 */
export class TransportError extends Error {
  constructor(message = 'transport error') {
    super(message)
    this.name = 'TransportError'
  }
}
