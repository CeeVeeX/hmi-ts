import 'dotenv/config'
import { Client } from '@hmi-ts/client'
import { decodeAsciiString, encodeAsciiString } from '@hmi-ts/codec'
import { TcpTransport } from '@hmi-ts/transport-tcp'
import { ModbusTcpPacketFactory } from '@hmi-ts/msg-modbus-tcp'

// client.connect() 错误后，延迟一秒再次尝试连接
function retryConnect(client: Client<ModbusTcpPacketFactory>, delayMs = 1000): void {
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
  const host = process.env.MODBUS_HOST ?? '127.0.0.1'
  const port = Number.parseInt(process.env.MODBUS_PORT ?? '502', 10)

  console.log(`Connecting to ${host}:${port}...`)

  const transport = new TcpTransport({
    host,
    port: Number.isNaN(port) ? 502 : port,
  })

  const client = new Client({
    packetFactory: new ModbusTcpPacketFactory(),
    transport,
    defaultUnitId: 1,
    defaultTimeout: 1000,
  })

  client.on('connect', () => console.log('connected'))
  client.on('disconnect', () => console.log('disconnected'))
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
