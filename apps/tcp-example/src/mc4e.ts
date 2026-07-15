import { Client } from '@hmi-ts/client'
import { TcpTransport } from '@hmi-ts/transport-tcp'
import { Mc4ePacketFactory } from '@hmi-ts/protocol-mc-4e'
import { DebugAgent } from '@hmi-ts/debug-agent'
import { uint8ToHex } from '@hmi-ts/codec'
import { decodeInt16, decodeFloat32, decodeInt32 } from '@hmi-ts/codec/little-endian'

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

  client.on('connected', async () => {
    console.log('connected')

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
          console.log('response data:', decodeFloat32(a.data))
        }
      },
    })

    client.subscribe({
      device: 'D',
      start: 2,
      length: 4,
      callback: (a) => {
        if (a.code === 0) {
          console.log('response data:', decodeInt32(a.data))
        }
      },
    })
  })
  client.on('disconnected', () => console.log('disconnected'))
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
