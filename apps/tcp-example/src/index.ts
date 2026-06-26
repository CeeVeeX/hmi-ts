import 'dotenv/config'
import { Client } from '@hmi-ts/client'
import { TcpTransport } from '@hmi-ts/transport-tcp'
import { ModbusTcpPacketFactory, ReadFn } from '@hmi-ts/protocol-modbus-tcp'
import { decodeBinaryString, decodeInt32 } from '@hmi-ts/codec'
import { ResponseCode } from '@hmi-ts/core'

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
    maxQueueSize: 10,
    defaultUnitId: 1,
    defaultTimeout: 1000,
  })

  client.on('connected', async () => {
    console.log('connected')
    // setInterval(async () => {
    //   try {
    //     const res = await client.write({
    //       fn: WriteFn.WriteMultipleCoils,
    //       start: 0,
    //       value: Array.from({ length: 2 }, () => Math.random() > 0.5),
    //     })

    //     console.log('write耗时:', res.endAt - res.startAt, 'ms')
    //   } catch (error) {
    //     console.error('write failed:', error)
    //   }
    // }, 20)
  })
  client.on('disconnected', () => console.log('disconnected'))
  client.on('error', (err) => console.error('error', err))

  // setInterval(async () => {
  //   try {
  //     await client.read({
  //       type: ReadFn.ReadHoldingRegisters,
  //       start: 0,
  //       length: 1,
  //     })

  //     // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //   } catch (error: any) {
  //     if (error.name !== 'TimeoutError') {
  //       console.error('write failed:', error)
  //     }
  //   }
  // }, 1000)

  // client.subscribe({
  //   fn: ReadFn.ReadHoldingRegisters,
  //   start: 100,
  //   length: 2,
  //   // interval: 2000,
  //   callback: (data) => {
  //     if (data.code !== ResponseCode.SUCCESS) {
  //       console.error('subscribe data error:', data)
  //       return
  //     }

  //     console.log(`1请求耗时:`, data.endAt - data.startAt, 'ms', '数据:', decodeInt32(data.data))
  //   },
  // })

  // client.subscribe({
  //   fn: ReadFn.ReadHoldingRegisters,
  //   start: 102,
  //   length: 2,
  //   // interval: 2000,
  //   callback: (data) => {
  //     if (data.code !== ResponseCode.SUCCESS) {
  //       console.error('subscribe data error:', data)
  //       return
  //     }

  //     console.log(`2请求耗时:`, data.endAt - data.startAt, 'ms', '数据:', decodeInt32(data.data))
  //   },
  // })

  // for (let i = 0; i < 10; i++) {
  //   client.subscribe({
  //     fn: ReadFn.ReadHoldingRegisters,
  //     start: i * 10,
  //     length: 1,
  //     // interval: 2000,
  //     callback: (data) => {
  //       if (data.code !== ResponseCode.SUCCESS) {
  //         console.error('subscribe data error:', data)
  //         return
  //       }

  //       console.log(
  //         `${i}请求耗时:`,
  //         data.endAt - data.startAt,
  //         'ms',
  //         '数据:',
  //         decodeInt16(data.data),
  //       )
  //     },
  //   })
  // }

  client.subscribe({
    fn: ReadFn.ReadCoils,
    start: 0,
    length: 4,
    // interval: 2000,
    callback: (data) => {
      if (data.code !== ResponseCode.SUCCESS) {
        console.error('subscribe data error:', data)
        return
      }

      console.log(data.options)

      console.log(
        '1请求耗时:',
        data.endAt - data.startAt,
        'ms',
        '数据:',
        decodeBinaryString(data.data, data.options.length),
        data.options.length,
      )
    },
  })

  // client.subscribe({
  //   fn: ReadFn.ReadCoils,
  //   start: 4,
  //   length: 2,
  //   // interval: 2000,
  //   callback: (data) => {
  //     if (data.code !== ResponseCode.SUCCESS) {
  //       console.error('subscribe data error:', data)
  //       return
  //     }

  //     console.log(
  //       '2请求耗时:',
  //       data.endAt - data.startAt,
  //       'ms',
  //       '数据:',
  //       decodeBinaryString(data.data, data.options.length),
  //     )
  //   },
  // })

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
