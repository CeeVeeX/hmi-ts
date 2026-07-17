import { Client } from '@hmi-ts/client'
import { TcpTransport } from '@hmi-ts/transport-tcp'
import { Mc4ePacketFactory } from '@hmi-ts/protocol-mc-4e'
import { DebugAgent } from '@hmi-ts/debug-agent'
import { decodeBits, uint8ToHex } from '@hmi-ts/codec'
import { decodeInt16, decodeFloat32, decodeInt32, encodeInt16 } from '@hmi-ts/codec/little-endian'

function retryConnect(client: Client<Mc4ePacketFactory>, delayMs = 1000): void {
  setTimeout(async () => {
    try {
      await client.connect()
    } catch {
      console.error('connect failed, retrying in', delayMs, 'ms')
      retryConnect(client, delayMs)
    }
  }, delayMs)
}

async function main(): Promise<void> {
  const host = '192.168.10.21'
  const port = 5300

  console.log(`Connecting to ${host}:${port}...`)

  const transport = new TcpTransport({
    host,
    port,
  })

  const debugAgent = new DebugAgent<Mc4ePacketFactory>({
    deviceAddress: host + ':' + port,
  })

  const client = new Client({
    clientId: 'mc4e-client',
    packetFactory: new Mc4ePacketFactory({
      route: {
        networkNo: 0x00,
        plcNo: 0xff,
        ioNo: 0x03ff,
        stationNo: 0x00,
      },
    }),
    transport,
    debugAgent,
    maxQueueSize: 10,
    // MC 3E/4E direct connection normally uses multidrop station No. 00H.
    defaultUnitId: 0,
    defaultTimeout: 1000,
  })

  let initialized = false

  client.on('connected', async () => {
    console.log('connected')

    if (initialized) {
      // 传输层会自动重连并再次触发 connected，这里避免重复注册订阅/定时器。
      return
    }
    initialized = true

    try {
      const a = await client.read({
        device: 'D',
        start: 0,
        length: 1,
      })

      if (a.code === 0) {
        console.log('request frame:', uint8ToHex(a.options.frame))
        console.log('response frame:', uint8ToHex(a.responseFrame!))
        console.log('response data:', decodeInt16(a.data))
      }

      client.subscribe({
        device: 'D',
        start: 0,
        length: 2,
        callback: (a) => {
          if (a.code === 0) {
            console.log('D0 response data:', decodeFloat32(a.data))
          }
        },
      })

      client.subscribe({
        device: 'D',
        start: 200,
        length: 4,
        callback: (a) => {
          if (a.code === 0) {
            console.log('D200 response data:', decodeInt32(a.data))
          }
        },
      })

      client.subscribe({
        device: 'M',
        start: 420,
        length: 4,
        callback: (a) => {
          if (a.code === 0) {
            console.log('M0 response data:', decodeBits(a.data, 4))
          }
        },
      })

      setInterval(() => {
        void (async () => {
          try {
            await client.write({
              device: 'D',
              start: 0,
              value: encodeInt16(Math.floor(Math.random() * 100)),
            })

            await client.write({
              device: 'D',
              start: 200,
              value: encodeInt16(Math.floor(Math.random() * 100)),
            })

            await client.write({
              device: 'M',
              start: 420,
              value: Uint8Array.from([Math.random() > 0.5 ? 1 : 0]),
            })
          } catch (error) {
            console.error('periodic write failed:', error)
          }
        })()
      }, 100)
    } catch (error) {
      console.error('connected init failed:', error)
    }
  })
  client.on('disconnected', () => console.log('disconnected'))
  client.on('timeout', (err) => console.warn('timeout', err.message))
  client.on('error', (err) => console.error('error', err))

  try {
    setInterval(() => {}, 9999)

    retryConnect(client)
  } catch (error) {
    console.error('\n❌ Demo failed:')
    console.error(error instanceof Error ? error.message : error)
    console.error('\n💡 Tip: Make sure a Modbus TCP server is running at', `${host}:${port}`)
    console.error('   You can set environment variables in .env file:\n')
    console.error('   MODBUS_HOST=192.168.1.100')
    console.error('   MODBUS_PORT=502\n')
    await client.close()
    process.exit(1)
  }
}

void main()
