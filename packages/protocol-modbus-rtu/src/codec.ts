import { RequestMethod } from '@hmi-ts/core'
import {
  WriteFn,
  type ReadOptions,
  type WriteCoilOptions,
  type WriteCoilsOptions,
  type WriteOptions,
  type WriteRegisterOptions,
  type WriteRegistersOptions,
} from './type'

export function calcCrc16Modbus(payload: Uint8Array): number {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload[i]
    for (let j = 0; j < 8; j += 1) {
      if ((crc & 0x0001) !== 0) {
        crc = (crc >> 1) ^ 0xa001
      } else {
        crc >>= 1
      }
    }
  }
  return crc & 0xffff
}

export function wrapRtuFrame(pdu: Uint8Array, unitId = 1): Uint8Array {
  const frameNoCrc = new Uint8Array(1 + pdu.length)
  frameNoCrc[0] = unitId & 0xff
  frameNoCrc.set(pdu, 1)

  const crc = calcCrc16Modbus(frameNoCrc)
  const frame = new Uint8Array(frameNoCrc.length + 2)
  frame.set(frameNoCrc, 0)
  frame[frameNoCrc.length] = crc & 0xff
  frame[frameNoCrc.length + 1] = (crc >> 8) & 0xff
  return frame
}

export function createReadRtuFrame(opt: ReadOptions): Uint8Array {
  const pdu = new Uint8Array(5)
  pdu[0] = opt.fn
  pdu[1] = (opt.start >> 8) & 0xff
  pdu[2] = opt.start & 0xff
  pdu[3] = (opt.length >> 8) & 0xff
  pdu[4] = opt.length & 0xff
  return wrapRtuFrame(pdu, opt.unitId)
}

export function encodeWriteSingleCoil(opt: WriteCoilOptions): Uint8Array {
  const pdu = new Uint8Array(5)
  pdu[0] = WriteFn.WriteSingleCoil
  pdu[1] = (opt.start >> 8) & 0xff
  pdu[2] = opt.start & 0xff
  const value = opt.value ? 0xff00 : 0x0000
  pdu[3] = (value >> 8) & 0xff
  pdu[4] = value & 0xff
  return wrapRtuFrame(pdu, opt.unitId)
}

export function encodeWriteSingleReg(opt: WriteRegisterOptions): Uint8Array {
  const pdu = new Uint8Array(5)
  pdu[0] = WriteFn.WriteSingleRegister
  pdu[1] = (opt.start >> 8) & 0xff
  pdu[2] = opt.start & 0xff
  pdu[3] = (opt.value >> 8) & 0xff
  pdu[4] = opt.value & 0xff
  return wrapRtuFrame(pdu, opt.unitId)
}

export function encodeWriteMultiCoils(opt: WriteCoilsOptions): Uint8Array {
  const count = opt.value.length
  const byteCount = Math.ceil(count / 8)
  const pdu = new Uint8Array(6 + byteCount)

  pdu[0] = WriteFn.WriteMultipleCoils
  pdu[1] = (opt.start >> 8) & 0xff
  pdu[2] = opt.start & 0xff
  pdu[3] = (count >> 8) & 0xff
  pdu[4] = count & 0xff
  pdu[5] = byteCount

  let byteIndex = 6
  let bit = 0
  let current = 0
  for (const v of opt.value) {
    if (v) {
      current |= 1 << bit
    }
    bit += 1
    if (bit >= 8) {
      pdu[byteIndex++] = current
      current = 0
      bit = 0
    }
  }
  if (bit > 0) {
    pdu[byteIndex] = current
  }

  return wrapRtuFrame(pdu, opt.unitId)
}

export function encodeWriteMultiRegs(opt: WriteRegistersOptions): Uint8Array {
  const count = opt.value.length
  const byteCount = count * 2
  const pdu = new Uint8Array(6 + byteCount)

  pdu[0] = WriteFn.WriteMultipleRegisters
  pdu[1] = (opt.start >> 8) & 0xff
  pdu[2] = opt.start & 0xff
  pdu[3] = (count >> 8) & 0xff
  pdu[4] = count & 0xff
  pdu[5] = byteCount

  let offset = 6
  for (const value of opt.value) {
    pdu[offset] = (value >> 8) & 0xff
    pdu[offset + 1] = value & 0xff
    offset += 2
  }

  return wrapRtuFrame(pdu, opt.unitId)
}

export function getMethodByFnCode(fn: number): RequestMethod {
  if (fn >= 1 && fn <= 4) {
    return RequestMethod.READ
  }
  if (fn >= 5 && fn <= 16) {
    return RequestMethod.WRITE
  }
  throw new Error(`unknown function code: ${fn}`)
}

export function parseModbusRtuResponse(frame: Uint8Array): {
  unitId: number
  functionCode: number
  data: Uint8Array
  byteCount: number
  exceptionCode: number | null
} {
  if (frame.length < 5) {
    return {
      unitId: 0,
      functionCode: 0,
      data: new Uint8Array(0),
      byteCount: 0,
      exceptionCode: 1001,
    }
  }

  const dataLength = frame.length - 2
  const receivedCrc = frame[dataLength] | (frame[dataLength + 1] << 8)
  const expectedCrc = calcCrc16Modbus(frame.subarray(0, dataLength))
  if (receivedCrc !== expectedCrc) {
    return {
      unitId: 0,
      functionCode: 0,
      data: new Uint8Array(0),
      byteCount: 0,
      exceptionCode: 1001,
    }
  }

  const unitId = frame[0]
  const functionCode = frame[1]

  if ((functionCode & 0x80) !== 0) {
    return {
      unitId,
      functionCode: functionCode & 0x7f,
      data: new Uint8Array(0),
      byteCount: 0,
      exceptionCode: frame[2] ?? 1001,
    }
  }

  if (functionCode >= 1 && functionCode <= 4) {
    const byteCount = frame[2]
    const data = frame.subarray(3, 3 + byteCount)
    if (data.length !== byteCount) {
      return {
        unitId: 0,
        functionCode: 0,
        data: new Uint8Array(0),
        byteCount: 0,
        exceptionCode: 1001,
      }
    }

    return {
      unitId,
      functionCode,
      data,
      byteCount,
      exceptionCode: null,
    }
  }

  return {
    unitId,
    functionCode,
    data: frame.subarray(2, dataLength),
    byteCount: dataLength - 2,
    exceptionCode: null,
  }
}

export function encodeWriteRtuFrame(opt: WriteOptions): Uint8Array {
  switch (opt.fn) {
    case WriteFn.WriteSingleCoil:
      return encodeWriteSingleCoil(opt)
    case WriteFn.WriteSingleRegister:
      return encodeWriteSingleReg(opt)
    case WriteFn.WriteMultipleCoils:
      return encodeWriteMultiCoils(opt)
    case WriteFn.WriteMultipleRegisters:
      return encodeWriteMultiRegs(opt)
    default: {
      const exhaustive: never = opt
      throw new Error(`unsupported write option: ${String(exhaustive)}`)
    }
  }
}
