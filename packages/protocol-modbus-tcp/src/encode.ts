import { RequestMethod } from '@hmi-ts/core'
import {
  WriteFn,
  type ReadOptions,
  type WriteCoilOptions,
  type WriteCoilsOptions,
  type WriteRegisterOptions,
  type WriteRegistersOptions,
} from './type'

// -------------------------- 读取编码工具函数 --------------------------
export function createReadPdu(opt: ReadOptions) {
  const pdu = new Uint8Array(5)
  pdu[0] = opt.fn
  pdu.set([opt.start >> 8, opt.start & 0xff], 1)
  pdu.set([opt.length >> 8, opt.length & 0xff], 3)
  return wrapMbapHeader(pdu, opt.id, opt.unitId)
}

// -------------------------- 写入编码工具函数 --------------------------
export function encodeWriteSingleCoil(opt: WriteCoilOptions): Uint8Array {
  const pdu = new Uint8Array(5)
  pdu[0] = WriteFn.WriteSingleCoil
  pdu.set([opt.start >> 8, opt.start & 0xff], 1)
  // 单线圈规范：0xFF00=开 0x0000=关
  const coilVal = opt.value ? 0xff00 : 0x0000
  pdu.set([coilVal >> 8, coilVal & 0xff], 3)
  return wrapMbapHeader(pdu, opt.id, opt.unitId)
}

export function encodeWriteSingleReg(opt: WriteRegisterOptions): Uint8Array {
  const pdu = new Uint8Array(5)
  pdu[0] = WriteFn.WriteSingleRegister
  pdu.set([opt.start >> 8, opt.start & 0xff], 1)
  pdu.set([opt.value >> 8, opt.value & 0xff], 3)
  return wrapMbapHeader(pdu, opt.id, opt.unitId)
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
  return wrapMbapHeader(pdu, opt.id, opt.unitId)
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
  return wrapMbapHeader(pdu, opt.id, opt.unitId)
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

/**
 * 获取 Modbus TCP 响应报文的事务ID、功能码、数据区和字节数，兼容异常报文解析
 * @param data 完整的 Modbus TCP 响应报文
 * @returns 解析后的响应对象，包含事务ID、功能码、数据区、字节数、异常码（无异常则为null）
 */
export function parseModbusTcpResponse(data: Uint8Array): {
  transactionId: number
  functionCode: number
  data: Uint8Array
  byteCount: number
  exceptionCode: number | null
} {
  function generateErrorResponse() {
    return {
      transactionId: 0,
      functionCode: 0,
      data: new Uint8Array(0),
      byteCount: 0,
      exceptionCode: 1001,
    }
  }
  // Modbus-TCP 最小合法报文：MBAP7字节 + PDU最少2字节(功能码+异常码) = 9字节
  if (data.length < 9) {
    // throw new Error(`Modbus TCP 响应 [HEX: ${uint8ToHex(data)}]: 太短，最小长度 9`)
    return generateErrorResponse()
  }

  // MBAP 事务ID 0~1字节
  const transactionId = (data[0] << 8) | data[1]
  // UnitID = data[6]，此处无需使用
  const pduFirstByte = data[7]

  // 判断是否异常响应：功能码最高位为1 (>=0x80)
  const isException = pduFirstByte >= 0x80
  const originFuncCode = pduFirstByte & 0x7f

  if (isException) {
    // 异常报文结构：MBAP(7) + 异常功能码(1) + 异常码(1)
    if (data.length !== 9) {
      // throw new Error(`Modbus TCP 响应 [HEX: ${uint8ToHex(data)}]: 长度错误`)
      return generateErrorResponse()
    }
    const exceptionCode = data[8]
    return {
      transactionId,
      functionCode: originFuncCode,
      data: new Uint8Array(0),
      byteCount: 0,
      exceptionCode,
    }
  }

  // 正常响应逻辑（原有读寄存器类03/02等带byteCount的报文）
  const byteCount = data[8]
  const responseData = data.subarray(9)

  if (responseData.length !== byteCount) {
    // throw new Error(`Modbus TCP 响应 [HEX: ${uint8ToHex(data)}]: 字节计数不匹配`)
    return generateErrorResponse()
  }

  return {
    transactionId,
    functionCode: pduFirstByte,
    data: responseData,
    byteCount,
    exceptionCode: null,
  }
}

/**
 * 获取根据功能ID获取读或写
 */
export function getMethodByFnCode(functionCode: number): RequestMethod {
  if (functionCode >= 1 && functionCode <= 4) {
    return RequestMethod.READ
  } else if (functionCode >= 5 && functionCode <= 16) {
    return RequestMethod.WRITE
  } else {
    throw new Error(`Unknown function code: ${functionCode}`)
  }
}
