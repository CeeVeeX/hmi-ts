import { describe, expect, it, vi } from 'vitest'

function createEmitter() {
  const listeners = new Map<string, Array<(...args: any[]) => void>>()
  return {
    on(event: string, cb: (...args: any[]) => void) {
      const list = listeners.get(event) ?? []
      list.push(cb)
      listeners.set(event, list)
      return this
    },
    off(event: string, cb: (...args: any[]) => void) {
      const list = listeners.get(event) ?? []
      listeners.set(
        event,
        list.filter((item) => item !== cb),
      )
      return this
    },
    once(event: string, cb: (...args: any[]) => void) {
      const wrapped = (...args: any[]) => {
        this.off(event, wrapped)
        cb(...args)
      }
      return this.on(event, wrapped)
    },
    emit(event: string, ...args: any[]) {
      const list = listeners.get(event) ?? []
      list.forEach((cb) => cb(...args))
    },
  }
}

function setupGatewayMocks() {
  const sockets: any[] = []
  const servers: any[] = []

  class MockSocket {
    destroyed = false
    private emitter = createEmitter()

    on = this.emitter.on
    off = this.emitter.off
    once = this.emitter.once
    emit = this.emitter.emit

    constructor() {
      sockets.push(this)
    }

    connect(_port: number, _host: string, cb: () => void): void {
      cb()
    }
    setNoDelay(): void {}
    write = vi.fn((_data: Buffer): void => {})
    destroy(): void {
      this.destroyed = true
      this.emit('close')
    }
  }

  class MockWSS {
    private emitter = createEmitter()
    on = this.emitter.on
    emit = this.emitter.emit

    constructor(_options: { port: number }) {
      servers.push(this)
    }

    close(cb: () => void): void {
      cb()
    }
  }

  vi.doMock('node:net', () => ({
    default: {
      Socket: MockSocket,
    },
  }))

  vi.doMock('ws', () => ({
    WebSocketServer: MockWSS,
  }))

  return { sockets, servers }
}

describe('gateway', () => {
  it('starts and stops server via ModbusGateway wrapper', async () => {
    vi.resetModules()
    setupGatewayMocks()
    const { ModbusGateway } = await import('../src/index')

    const g = new ModbusGateway({ wsPort: 18080, plcHost: '127.0.0.1', plcPort: 502 })
    await g.start()
    await expect(g.start()).resolves.toBeUndefined()
    await expect(g.stop()).resolves.toBeUndefined()
    await expect(g.stop()).resolves.toBeUndefined()
  })

  it('handles generic upstream relay and release', async () => {
    vi.resetModules()
    const { Gateway } = await import('../src/index')

    const onUpstreamMessageRef: Array<(data: Uint8Array) => void> = []
    const onUpstreamCloseRef: Array<(err?: Error) => void> = []
    const upstream = {
      send: vi.fn(async (_data: Uint8Array) => {}),
      close: vi.fn(async () => {}),
      onMessage: vi.fn((cb: (data: Uint8Array) => void) => {
        onUpstreamMessageRef[0] = cb
      }),
      onClose: vi.fn((cb: (err?: Error) => void) => {
        onUpstreamCloseRef[0] = cb
      }),
    }

    const g = new Gateway({
      wsPort: 18080,
      createUpstream: () => upstream,
    })

    const ws = createEmitter() as ReturnType<typeof createEmitter> & {
      OPEN: number
      CONNECTING: number
      readyState: number
      send: ReturnType<typeof vi.fn>
      close: ReturnType<typeof vi.fn>
      on: (event: string, handler: (...args: any[]) => void) => any
    }

    ws.OPEN = 1
    ws.CONNECTING = 0
    ws.readyState = 1
    ws.send = vi.fn()
    ws.close = vi.fn()

    await (g as any).handleConnection(ws)

    if (!onUpstreamMessageRef[0]) {
      throw new Error('onUpstreamMessage was not registered')
    }
    onUpstreamMessageRef[0](new Uint8Array([1, 2]))
    expect(ws.send).toHaveBeenCalled()

    ws.emit('message', Buffer.from([3, 4]))
    expect(upstream.send).toHaveBeenCalledWith(Buffer.from([3, 4]))

    if (!onUpstreamCloseRef[0]) {
      throw new Error('onUpstreamClose was not registered')
    }
    onUpstreamCloseRef[0](new Error('closed'))
    expect(ws.close).toHaveBeenCalled()

    ws.emit('close')
    ws.emit('error')
    expect(upstream.close).toHaveBeenCalled()
  })

  it('skips ws send when socket not open and handles arraybuffer/segments message', async () => {
    vi.resetModules()
    const { Gateway } = await import('../src/index')

    const onUpstreamMessageRef: Array<(data: Uint8Array) => void> = []
    const upstream = {
      send: vi.fn(async (_data: Uint8Array) => {}),
      close: vi.fn(async () => {}),
      onMessage: vi.fn((cb: (data: Uint8Array) => void) => {
        onUpstreamMessageRef[0] = cb
      }),
      onClose: vi.fn((_cb: (err?: Error) => void) => {}),
    }

    const g = new Gateway({
      wsPort: 18080,
      createUpstream: () => upstream,
    })

    const ws = createEmitter() as ReturnType<typeof createEmitter> & {
      OPEN: number
      readyState: number
      send: ReturnType<typeof vi.fn>
    }

    ws.OPEN = 1
    ws.readyState = 0
    ws.send = vi.fn()

    await (g as any).handleConnection(ws)

    if (!onUpstreamMessageRef[0]) {
      throw new Error('onUpstreamMessage was not registered')
    }
    onUpstreamMessageRef[0](new Uint8Array([1, 2]))
    expect(ws.send).not.toHaveBeenCalled()

    ws.emit('message', new Uint8Array([9, 8]).buffer)
    expect(upstream.send).toHaveBeenCalledWith(Buffer.from([9, 8]))

    ws.emit('message', [Buffer.from([1]), Buffer.from([2, 3])])
    expect(upstream.send).toHaveBeenCalledWith(Buffer.from([1, 2, 3]))
  })
})
