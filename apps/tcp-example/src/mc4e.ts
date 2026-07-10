import { Client } from '@hmi-ts/client'
import { TcpTransport } from '@hmi-ts/transport-tcp'
import { Mc4ePacketFactory } from '@hmi-ts/protocol-mc-4e'
import { DebugAgent } from '@hmi-ts/debug-agent'
import { encodeAscii, encodeBits, encodeUint16, uint8ToHex } from '@hmi-ts/codec'

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
    clientId: 'mc-4e-client',
    packetFactory: new Mc4ePacketFactory(),
    transport,
    debugAgent,
    maxQueueSize: 10,
    defaultUnitId: 1,
    defaultTimeout: 1000,
  })

  client.on('connected', async () => {
    console.log('connected')

    const a = await client.read({
      device: 'D',
      start: 0,
      length: 1,
    })

    console.log('request frame:', uint8ToHex(a.options.frame))
    console.log('response frame:', a)
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
