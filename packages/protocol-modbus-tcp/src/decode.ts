import { RequestMethod } from '@hmi-ts/core'
import { ReadFn, WriteFn, MODBUS_EXCEPTION_MAP } from './type'

export type ModbusTcpPacketType = 'request' | 'response' | 'exception' | 'ambiguous' | 'invalid'

export interface DecodedModbusTcpPacket {
  packetType: ModbusTcpPacketType
  transactionId: number
  protocolId: number
  unitId: number
  mbapLength: number
  functionCode: number
  functionName: string
  method: RequestMethod | 'unknown'
  startAddress?: number
  length?: number
  byteCount?: number
  data?: Uint8Array
  value?: number
  coilValue?: boolean
  exceptionCode?: number
  exceptionMessage?: string
  warnings: string[]
}

function getFunctionName(functionCode: number): string {
  switch (functionCode) {
    case ReadFn.ReadCoils:
      return 'ReadCoils'
    case ReadFn.ReadDiscreteInputs:
      return 'ReadDiscreteInputs'
    case ReadFn.ReadHoldingRegisters:
      return 'ReadHoldingRegisters'
    case ReadFn.ReadInputRegisters:
      return 'ReadInputRegisters'
    case WriteFn.WriteSingleCoil:
      return 'WriteSingleCoil'
    case WriteFn.WriteSingleRegister:
      return 'WriteSingleRegister'
    case WriteFn.WriteMultipleCoils:
      return 'WriteMultipleCoils'
    case WriteFn.WriteMultipleRegisters:
      return 'WriteMultipleRegisters'
    default:
      return `Unknown(0x${functionCode.toString(16).toUpperCase().padStart(2, '0')})`
  }
}

function getMethod(functionCode: number): RequestMethod | 'unknown' {
  if (functionCode >= ReadFn.ReadCoils && functionCode <= ReadFn.ReadInputRegisters) {
    return RequestMethod.READ
  }

  if (
    functionCode === WriteFn.WriteSingleCoil ||
    functionCode === WriteFn.WriteSingleRegister ||
    functionCode === WriteFn.WriteMultipleCoils ||
    functionCode === WriteFn.WriteMultipleRegisters
  ) {
    return RequestMethod.WRITE
  }

  return 'unknown'
}

function readU16BE(data: Uint8Array, offset: number): number {
  return ((data[offset] ?? 0) << 8) | (data[offset + 1] ?? 0)
}

/**
 * 统一解码 Modbus TCP 报文（请求/响应/异常）。
 *
 * - 事务 ID: transactionId
 * - 站号: unitId
 * - 地址开始: startAddress
 * - 长度: length（读/写数量）
 */
export function decodePacket(frame: Uint8Array): DecodedModbusTcpPacket {
  const warnings: string[] = []

  if (frame.length < 8) {
    return {
      packetType: 'invalid',
      transactionId: 0,
      protocolId: 0,
      unitId: 0,
      mbapLength: 0,
      functionCode: 0,
      functionName: 'Unknown(0x00)',
      method: 'unknown',
      warnings: ['报文长度不足，最少需要 8 字节（MBAP 7 + 功能码 1）'],
    }
  }

  const transactionId = readU16BE(frame, 0)
  const protocolId = readU16BE(frame, 2)
  const mbapLength = readU16BE(frame, 4)
  const unitId = frame[6] ?? 0
  const expectedFrameLength = 6 + mbapLength
  const pdu = frame.subarray(7)
  const pduLength = pdu.length
  const rawFunctionCode = pdu[0] ?? 0
  const isException = (rawFunctionCode & 0x80) !== 0
  const functionCode = isException ? rawFunctionCode & 0x7f : rawFunctionCode

  if (protocolId !== 0) {
    warnings.push(`Protocol ID 非 0（当前=${protocolId}），这不是标准 Modbus TCP`)
  }

  if (expectedFrameLength !== frame.length) {
    warnings.push(`MBAP Length 与实际长度不匹配：声明 ${expectedFrameLength}，实际 ${frame.length}`)
  }

  const decoded: DecodedModbusTcpPacket = {
    packetType: isException ? 'exception' : 'invalid',
    transactionId,
    protocolId,
    unitId,
    mbapLength,
    functionCode,
    functionName: getFunctionName(functionCode),
    method: getMethod(functionCode),
    warnings,
  }

  if (isException) {
    decoded.packetType = 'exception'
    decoded.exceptionCode = pdu[1]
    if (decoded.exceptionCode !== undefined) {
      decoded.exceptionMessage =
        MODBUS_EXCEPTION_MAP[decoded.exceptionCode] ?? `未知异常码(${decoded.exceptionCode})`
    }
    if (pduLength !== 2) {
      warnings.push(`异常响应 PDU 长度应为 2，实际为 ${pduLength}`)
    }
    return decoded
  }

  switch (functionCode) {
    case ReadFn.ReadCoils:
    case ReadFn.ReadDiscreteInputs:
    case ReadFn.ReadHoldingRegisters:
    case ReadFn.ReadInputRegisters: {
      if (pduLength === 5) {
        decoded.packetType = 'request'
        decoded.startAddress = readU16BE(pdu, 1)
        decoded.length = readU16BE(pdu, 3)
        return decoded
      }

      if (pduLength >= 3) {
        decoded.packetType = 'response'
        decoded.byteCount = pdu[1]
        decoded.data = pdu.subarray(2)
        if (decoded.byteCount !== decoded.data.length) {
          warnings.push(
            `byteCount 与数据长度不一致：byteCount=${decoded.byteCount}, data=${decoded.data.length}`,
          )
        }
        return decoded
      }

      warnings.push(`读取类 PDU 长度非法：${pduLength}`)
      return decoded
    }

    case WriteFn.WriteSingleCoil:
    case WriteFn.WriteSingleRegister: {
      if (pduLength !== 5) {
        warnings.push(`写单值 PDU 长度应为 5，实际为 ${pduLength}`)
        return decoded
      }

      decoded.packetType = 'ambiguous'
      decoded.startAddress = readU16BE(pdu, 1)
      decoded.value = readU16BE(pdu, 3)
      if (functionCode === WriteFn.WriteSingleCoil) {
        decoded.coilValue = decoded.value === 0xff00
      }
      return decoded
    }

    case WriteFn.WriteMultipleCoils:
    case WriteFn.WriteMultipleRegisters: {
      if (pduLength === 5) {
        decoded.packetType = 'response'
        decoded.startAddress = readU16BE(pdu, 1)
        decoded.length = readU16BE(pdu, 3)
        return decoded
      }

      if (pduLength >= 6) {
        decoded.packetType = 'request'
        decoded.startAddress = readU16BE(pdu, 1)
        decoded.length = readU16BE(pdu, 3)
        decoded.byteCount = pdu[5]
        decoded.data = pdu.subarray(6)
        if (decoded.byteCount !== decoded.data.length) {
          warnings.push(
            `byteCount 与数据长度不一致：byteCount=${decoded.byteCount}, data=${decoded.data.length}`,
          )
        }
        return decoded
      }

      warnings.push(`写多值 PDU 长度非法：${pduLength}`)
      return decoded
    }

    default:
      warnings.push(`不支持的功能码: ${functionCode}`)
      return decoded
  }
}
