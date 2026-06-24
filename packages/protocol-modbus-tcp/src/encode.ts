import {
  WriteFn,
  type ReadOptions,
  type WriteCoilOptions,
  type WriteCoilsOptions,
  type WriteRegisterOptions,
  type WriteRegistersOptions,
} from './type'

// -------------------------- 读取编码工具函数 --------------------------
export function createReadPdu(tId: number, opt: ReadOptions) {
  const pdu = new Uint8Array(5)
  pdu[0] = opt.type
  pdu.set([opt.start >> 8, opt.start & 0xff], 1)
  pdu.set([opt.length >> 8, opt.length & 0xff], 3)
  return wrapMbapHeader(pdu, tId, opt.unitId)
}

// -------------------------- 写入编码工具函数 --------------------------
export function encodeWriteSingleCoil(tId: number, opt: WriteCoilOptions): Uint8Array {
  const pdu = new Uint8Array(5)
  pdu[0] = WriteFn.WriteSingleCoil
  pdu.set([opt.start >> 8, opt.start & 0xff], 1)
  // 单线圈规范：0xFF00=开 0x0000=关
  const coilVal = opt.value ? 0xff00 : 0x0000
  pdu.set([coilVal >> 8, coilVal & 0xff], 3)
  return wrapMbapHeader(pdu, tId, opt.unitId)
}

export function encodeWriteSingleReg(tId: number, opt: WriteRegisterOptions): Uint8Array {
  const pdu = new Uint8Array(5)
  pdu[0] = WriteFn.WriteSingleRegister
  pdu.set([opt.start >> 8, opt.start & 0xff], 1)
  pdu.set([opt.value >> 8, opt.value & 0xff], 3)
  return wrapMbapHeader(pdu, tId, opt.unitId)
}

export function encodeWriteMultiCoils(tId: number, opt: WriteCoilsOptions): Uint8Array {
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
  return wrapMbapHeader(pdu, tId, opt.unitId)
}

export function encodeWriteMultiRegs(tId: number, opt: WriteRegistersOptions): Uint8Array {
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
  return wrapMbapHeader(pdu, tId, opt.unitId)
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
