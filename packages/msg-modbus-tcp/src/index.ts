import type { BaseWriteOptions, BaseReadOptions, PacketFactory, IResponse } from '@hmi-ts/core'
// import { Client } from '@hmi-ts/client'

// Modbus 读取功能码
export enum ReadFn {
  ReadCoils = 0x01,
  ReadDiscreteInputs = 0x02,
  ReadHoldingRegisters = 0x03,
  ReadInputRegisters = 0x04,
}

// Modbus 写入功能码
export enum WriteFn {
  WriteSingleCoil = 0x05,
  WriteSingleRegister = 0x06,
  WriteMultipleCoils = 0x0f,
  WriteMultipleRegisters = 0x10,
}

// -------------------------- 读取类型（带判别type） --------------------------
export interface ReadCoilsOptions extends BaseReadOptions {
  type: ReadFn.ReadCoils
}
export interface ReadDiscreteInputsOptions extends BaseReadOptions {
  type: ReadFn.ReadDiscreteInputs
}
export interface ReadHoldingRegistersOptions extends BaseReadOptions {
  type: ReadFn.ReadHoldingRegisters
}
export interface ReadInputRegistersOptions extends BaseReadOptions {
  type: ReadFn.ReadInputRegisters
}

export type ReadOptions =
  | ReadCoilsOptions
  | ReadDiscreteInputsOptions
  | ReadHoldingRegistersOptions
  | ReadInputRegistersOptions

// -------------------------- 写入类型（带判别type） --------------------------
export interface WriteCoilOptions extends BaseWriteOptions {
  type: WriteFn.WriteSingleCoil
  value: boolean | number // 单线圈 0/1
}
export interface WriteRegisterOptions extends BaseWriteOptions {
  type: WriteFn.WriteSingleRegister
  value: number // 单寄存器 0~65535
}
export interface WriteCoilsOptions extends BaseWriteOptions {
  type: WriteFn.WriteMultipleCoils
  value: boolean[] | number[] // 多线圈数组
}
export interface WriteRegistersOptions extends BaseWriteOptions {
  type: WriteFn.WriteMultipleRegisters
  value: number[] // 多寄存器数组
}

export type WriteOptions =
  | WriteCoilOptions
  | WriteRegisterOptions
  | WriteCoilsOptions
  | WriteRegistersOptions

// -------------------------- 读取编码工具函数 --------------------------
export function createReadPdu(funcCode: ReadFn, start: number, length: number) {
  const pdu = new Uint8Array(5)
  pdu[0] = funcCode
  pdu.set([start >> 8, start & 0xff], 1)
  pdu.set([length >> 8, length & 0xff], 3)
  return wrapMbapHeader(pdu)
}

// -------------------------- 写入编码工具函数 --------------------------
export function encodeWriteSingleCoil(opt: WriteCoilOptions): Uint8Array {
  const pdu = new Uint8Array(5)
  pdu[0] = WriteFn.WriteSingleCoil
  pdu.set([opt.start >> 8, opt.start & 0xff], 1)
  // 单线圈规范：0xFF00=开 0x0000=关
  const coilVal = opt.value ? 0xff00 : 0x0000
  pdu.set([coilVal >> 8, coilVal & 0xff], 3)
  return wrapMbapHeader(pdu)
}

export function encodeWriteSingleReg(opt: WriteRegisterOptions): Uint8Array {
  const pdu = new Uint8Array(5)
  pdu[0] = WriteFn.WriteSingleRegister
  pdu.set([opt.start >> 8, opt.start & 0xff], 1)
  pdu.set([opt.value >> 8, opt.value & 0xff], 3)
  return wrapMbapHeader(pdu)
}

export function encodeWriteMultiCoils(opt: WriteCoilsOptions): Uint8Array {
  const coilCount = opt.value.length
  const byteCount = Math.ceil(coilCount / 8)
  const pdu = new Uint8Array(6 + byteCount)
  pdu[0] = WriteFn.WriteMultipleCoils
  pdu.set([opt.start >> 8, opt.start & 0xff], 1)
  pdu.set([coilCount >> 8, coilCount & 0xff], 3)
  pdu[5] = byteCount
  // 填充线圈bit
  let byteIdx = 6
  let bit = 0
  let curr = 0
  for (const v of opt.value) {
    if (v) curr |= 1 << bit
    bit++
    if (bit >= 8) {
      pdu[byteIdx++] = curr
      curr = 0
      bit = 0
    }
  }
  if (bit > 0) pdu[byteIdx] = curr
  return wrapMbapHeader(pdu)
}

export function encodeWriteMultiRegs(opt: WriteRegistersOptions): Uint8Array {
  const regCount = opt.value.length
  const byteCount = regCount * 2
  const pdu = new Uint8Array(6 + byteCount)
  pdu[0] = WriteFn.WriteMultipleRegisters
  pdu.set([opt.start >> 8, opt.start & 0xff], 1)
  pdu.set([regCount >> 8, regCount & 0xff], 3)
  pdu[5] = byteCount
  let offset = 6
  for (const val of opt.value) {
    pdu.set([val >> 8, val & 0xff], offset)
    offset += 2
  }
  return wrapMbapHeader(pdu)
}

// -------------------------- 公共工具：包装Modbus TCP MBAP头 --------------------------
/**
 * 拼接MBAP头 + PDU 成完整Modbus TCP报文
 * @param pdu 功能码+数据PDU
 * @param transId 事务ID
 * @param slaveId 从站ID
 */
export function wrapMbapHeader(pdu: Uint8Array, transId = 0, slaveId = 1): Uint8Array {
  const len = pdu.length + 1 // slaveId + pdu长度
  const frame = new Uint8Array(7 + pdu.length)
  // MBAP Header 7字节
  frame.set([transId >> 8, transId & 0xff], 0) // Transaction ID
  frame.set([0x00, 0x00], 2) // Protocol ID (0)
  frame.set([len >> 8, len & 0xff], 4) // Length
  frame[6] = slaveId // Unit ID
  // PDU
  frame.set(pdu, 7)
  return frame
}

// -------------------------- 工厂类 --------------------------
export class ModbusTcpPacketFactory implements PacketFactory {
  encodeRead(options: ReadOptions): Uint8Array {
    const { type, start, length } = options
    switch (type) {
      case ReadFn.ReadCoils:
      case ReadFn.ReadDiscreteInputs:
      case ReadFn.ReadHoldingRegisters:
      case ReadFn.ReadInputRegisters:
        return createReadPdu(type, start, length)
      default: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _exhaustive: never = options
        throw new Error(`不支持的读取功能码：${type}`)
      }
    }
  }

  encodeWrite(options: WriteOptions): Uint8Array {
    switch (options.type) {
      case WriteFn.WriteSingleCoil:
        return encodeWriteSingleCoil(options)
      case WriteFn.WriteSingleRegister:
        return encodeWriteSingleReg(options)
      case WriteFn.WriteMultipleCoils:
        return encodeWriteMultiCoils(options)
      case WriteFn.WriteMultipleRegisters:
        return encodeWriteMultiRegs(options)
      default: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _exhaustive: never = options
        throw new Error(`未知写入功能码: ${(options as WriteOptions).type}`)
      }
    }
  }

  mergeRead(options: ReadOptions[]): ReadOptions[] {
    if (!options || options.length === 0) {
      return []
    }

    // 按 unitId 和 type 分组
    const grouped = new Map<string, ReadOptions[]>()
    for (const opt of options) {
      const unitId = opt.unitId ?? 1 // 默认 unitId 为 1
      const key = `${unitId}:${opt.type}`
      const existing = grouped.get(key) || []
      existing.push(opt)
      grouped.set(key, existing)
    }

    const merged: ReadOptions[] = []

    // 对每组进行合并
    for (const [, group] of grouped) {
      // 按 start 排序
      const sorted = group.sort((a, b) => a.start - b.start)

      // 合并重叠或紧邻的区间
      let current = { ...sorted[0] }

      for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i]
        const currentEnd = current.start + current.length
        const nextEnd = next.start + next.length

        // 如果下一个区间与当前区间重叠或紧邻（end >= next.start）
        if (currentEnd >= next.start) {
          // 合并：扩展当前区间到两者的最大结束位置
          current.length = Math.max(currentEnd, nextEnd) - current.start
        } else {
          // 不重叠也不紧邻，保存当前区间并开始新的区间
          merged.push(current)
          current = { ...next }
        }
      }

      // 添加最后一个区间
      merged.push(current)
    }

    return merged
  }

  decodeResponse(data: Uint8Array): IResponse {
    console.log('decodeResponse', data)
    return {
      transactionId: 0,
    } as IResponse
  }
}

// -------------------------- 使用示例 --------------------------
// const client = new Client({
//   packetFactory: new ModbusTcpPacketFactory(),
//   transport: {
//     connect: () => Promise.resolve(),
//     close: () => Promise.resolve(),
//     send: () => Promise.resolve(),
//     onData: () => {},
//     onClose: () => {},
//   },
// })

// // 读取示例
// client.read({
//   type: ReadFn.ReadCoils,
//   start: 0,
//   length: 10,
// })
// client.read({
//   type: ReadFn.ReadHoldingRegisters,
//   start: 100,
//   length: 8,
// })

// // 写入示例
// // 写单个线圈
// client.write({
//   type: WriteFn.WriteSingleCoil,
//   start: 0,
//   value: 1,
// })
// // 写单个寄存器
// client.write({
//   type: WriteFn.WriteSingleRegister,
//   start: 10,
//   value: 1234,
// })
// // 批量写线圈
// client.write({
//   type: WriteFn.WriteMultipleCoils,
//   start: 0,
//   value: [true, false, true],
// })
// // 批量写寄存器
// client.write({
//   type: WriteFn.WriteMultipleRegisters,
//   start: 20,
//   value: [100, 200, 300],
// })

// client.subscribe({
//   type: ReadFn.ReadHoldingRegisters,
//   start: 0,
//   length: 1,
//   interval: 1000,
//   callback: (v) => console.log(v),
// })
