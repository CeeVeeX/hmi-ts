import net from 'node:net'
import { describe, expect, it } from 'vitest'
import * as api from '../src/index'

describe('transport-tcp exports', () => {
  it('module is importable', () => {
    expect(api).toBeDefined()
  })

  it('forwards raw tcp chunks without protocol framing', async () => {
    const server = net.createServer((socket) => {
      socket.write(Buffer.from([0x00, 0x01, 0x00]))
      setTimeout(() => {
        socket.write(Buffer.from([0x00, 0x00, 0x00, 0x02, 0x11, 0x22]))
      }, 10)
    })

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => {
        server.off('error', reject)
        resolve()
      })
    })

    const address = server.address()
    if (!address || typeof address === 'string') {
      throw new Error('failed to get server address')
    }

    const transport = new api.TcpTransport({ host: '127.0.0.1', port: address.port })

    try {
      const chunks: number[][] = []
      const waitForTwoChunks = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timed out waiting for chunks')), 1000)
        transport.on('message', (data) => {
          chunks.push(Array.from(data))
          if (chunks.length === 2) {
            clearTimeout(timer)
            resolve()
          }
        })
      })

      await transport.connect()
      await waitForTwoChunks

      expect(chunks).toEqual([
        [0x00, 0x01, 0x00],
        [0x00, 0x00, 0x00, 0x02, 0x11, 0x22],
      ])

      await transport.close()
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})
