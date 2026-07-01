import dgram from 'node:dgram'
import net from 'node:net'
import { WebSocketServer, type RawData, type WebSocket } from 'ws'

/**
 * 网关上游连接抽象：WS 下行与任意上游传输之间的最小桥接协议。
 */
export interface GatewayUpstream {
  send(data: Uint8Array): Promise<void> | void
  close(): Promise<void> | void
  onMessage(cb: (data: Uint8Array) => void): void
  onClose(cb: (err?: Error) => void): void
}

export type GatewayUpstreamFactory = () => Promise<GatewayUpstream> | GatewayUpstream

/**
 * 通用网关选项：浏览器 WS 入站 + 可插拔上游工厂。
 */
export interface GatewayOptions {
  wsPort: number
  createUpstream: GatewayUpstreamFactory
}

/**
 * 向后兼容的 Modbus 网关选项。
 */
export interface ModbusGatewayOptions {
  wsPort: number
  plcHost: string
  plcPort: number
}

/**
 * TCP 上游配置。
 */
export interface TcpUpstreamOptions {
  host: string
  port: number
}

/**
 * UDP 上游配置。
 */
export interface UdpUpstreamOptions {
  host: string
  port: number
  bindAddress?: string
  bindPort?: number
}

class TcpUpstream implements GatewayUpstream {
  private messageCallbacks: Array<(data: Uint8Array) => void> = []
  private closeCallbacks: Array<(err?: Error) => void> = []
  private closed = false

  constructor(private readonly socket: net.Socket) {
    socket.on('data', (chunk) => {
      const payload = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength)
      this.messageCallbacks.forEach((cb) => cb(payload))
    })

    socket.on('error', (err) => {
      this.emitClose(err)
    })

    socket.on('close', () => {
      this.emitClose()
    })
  }

  async send(data: Uint8Array): Promise<void> {
    if (this.socket.destroyed) {
      throw new Error('tcp upstream closed')
    }

    await new Promise<void>((resolve, reject) => {
      this.socket.write(data, (err) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }

  async close(): Promise<void> {
    if (this.socket.destroyed) {
      return
    }

    await new Promise<void>((resolve) => {
      this.socket.once('close', () => resolve())
      this.socket.end()
      this.socket.destroy()
    })
  }

  onMessage(cb: (data: Uint8Array) => void): void {
    this.messageCallbacks.push(cb)
  }

  onClose(cb: (err?: Error) => void): void {
    this.closeCallbacks.push(cb)
  }

  private emitClose(err?: Error): void {
    if (this.closed) {
      return
    }
    this.closed = true
    this.closeCallbacks.forEach((cb) => cb(err))
  }
}

class UdpUpstream implements GatewayUpstream {
  private messageCallbacks: Array<(data: Uint8Array) => void> = []
  private closeCallbacks: Array<(err?: Error) => void> = []
  private closed = false

  constructor(
    private readonly socket: dgram.Socket,
    private readonly options: UdpUpstreamOptions,
  ) {
    socket.on('message', (msg) => {
      const data = new Uint8Array(msg.buffer, msg.byteOffset, msg.byteLength)
      this.messageCallbacks.forEach((cb) => cb(data))
    })

    socket.on('error', (err) => {
      this.emitClose(err)
    })

    socket.on('close', () => {
      this.emitClose()
    })
  }

  async send(data: Uint8Array): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.socket.send(data, this.options.port, this.options.host, (err) => {
        if (err) {
          reject(err)
          return
        }
        resolve()
      })
    })
  }

  async close(): Promise<void> {
    if (this.closed) {
      return
    }

    await new Promise<void>((resolve) => {
      this.socket.once('close', () => resolve())
      this.socket.close()
    })
  }

  onMessage(cb: (data: Uint8Array) => void): void {
    this.messageCallbacks.push(cb)
  }

  onClose(cb: (err?: Error) => void): void {
    this.closeCallbacks.push(cb)
  }

  private emitClose(err?: Error): void {
    if (this.closed) {
      return
    }
    this.closed = true
    this.closeCallbacks.forEach((cb) => cb(err))
  }
}

export function createTcpUpstreamFactory(options: TcpUpstreamOptions): GatewayUpstreamFactory {
  return async () => {
    const socket = new net.Socket()
    await new Promise<void>((resolve, reject) => {
      socket.once('error', reject)
      socket.connect(options.port, options.host, () => {
        socket.off('error', reject)
        resolve()
      })
    })
    socket.setNoDelay(true)
    return new TcpUpstream(socket)
  }
}

export function createUdpUpstreamFactory(options: UdpUpstreamOptions): GatewayUpstreamFactory {
  return async () => {
    const socket = dgram.createSocket('udp4')
    await new Promise<void>((resolve, reject) => {
      socket.once('error', reject)
      socket.bind(options.bindPort ?? 0, options.bindAddress, () => {
        socket.off('error', reject)
        resolve()
      })
    })
    return new UdpUpstream(socket, options)
  }
}

/**
 * 网关运行选项。
 *
 * @example
 * ```ts
 * const options: GatewayOptions = { wsPort: 18080, plcHost: '127.0.0.1', plcPort: 502 }
 * ```
 */
function rawDataToBuffer(message: RawData): Buffer {
  // ws 的 message 可能是 Buffer / ArrayBuffer / Buffer[]，统一归一化后再写 TCP。
  if (Buffer.isBuffer(message)) {
    return message
  }
  if (message instanceof ArrayBuffer) {
    return Buffer.from(message)
  }
  return Buffer.concat(message.map((part) => Buffer.from(part)))
}

/**
 * Modbus WebSocket 网关：把浏览器二进制帧转发到 PLC TCP。
 *
 * @example
 * ```ts
 * const gateway = new ModbusGateway({ wsPort: 18080, plcHost: '127.0.0.1', plcPort: 502 })
 * await gateway.start()
 * ```
 */
export class ModbusGateway {
  private readonly gateway: Gateway

  constructor(options: ModbusGatewayOptions) {
    this.gateway = new Gateway({
      wsPort: options.wsPort,
      createUpstream: createTcpUpstreamFactory({
        host: options.plcHost,
        port: options.plcPort,
      }),
    })
  }

  async start(): Promise<void> {
    await this.gateway.start()
  }

  async stop(): Promise<void> {
    await this.gateway.stop()
  }
}

/**
 * 通用 WS 桥接网关：
 * 浏览器侧只走 WS，上游可插拔为 TCP / UDP / 其他协议适配器。
 */
export class Gateway {
  private wss: WebSocketServer | null = null
  private readonly upstreams = new Set<GatewayUpstream>()

  constructor(private readonly options: GatewayOptions) {}

  async start(): Promise<void> {
    if (this.wss) {
      return
    }

    this.wss = new WebSocketServer({ port: this.options.wsPort })
    this.wss.on('connection', (ws) => {
      void this.handleConnection(ws)
    })
  }

  async stop(): Promise<void> {
    if (!this.wss) {
      return
    }

    await new Promise<void>((resolve) => {
      this.wss?.close(() => resolve())
    })
    this.wss = null

    const all = [...this.upstreams]
    this.upstreams.clear()
    await Promise.all(all.map((upstream) => Promise.resolve(upstream.close())))
  }

  private async handleConnection(ws: WebSocket): Promise<void> {
    const upstream = await this.options.createUpstream()
    this.upstreams.add(upstream)
    let released = false

    const releaseOnce = (): void => {
      if (released) {
        return
      }
      released = true
      this.upstreams.delete(upstream)
      void Promise.resolve(upstream.close())
    }

    upstream.onMessage((chunk) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(chunk)
      }
    })

    upstream.onClose(() => {
      releaseOnce()
      if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) {
        ws.close(1011, 'upstream closed')
      }
    })

    ws.on('message', (message: RawData) => {
      void Promise.resolve(upstream.send(rawDataToBuffer(message))).catch(() => {
        releaseOnce()
        if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) {
          ws.close(1011, 'upstream send failed')
        }
      })
    })

    ws.on('close', () => {
      releaseOnce()
    })

    ws.on('error', () => {
      releaseOnce()
    })
  }
}
