import {
  type PacketFactory,
  ResponseCode,
  type IResponse,
  RequestMethod,
  type BaseReadOptions,
  type BaseWriteOptions,
  type SubscriptionGroup,
  type SubscriptionRelation,
} from '@hmi-ts/core'

export enum ReadFn {
  ReadCoils = 0x01,
  ReadDiscreteInputs = 0x02,
  ReadHoldingRegisters = 0x03,
  ReadInputRegisters = 0x04,
}

export enum WriteFn {
  WriteSingleCoil = 0x05,
  WriteSingleRegister = 0x06,
  WriteMultipleCoils = 0x0f,
  WriteMultipleRegisters = 0x10,
}

export interface ReadCoilsOptions extends BaseReadOptions {
  fn: ReadFn.ReadCoils
}
export interface ReadDiscreteInputsOptions extends BaseReadOptions {
  fn: ReadFn.ReadDiscreteInputs
}
export interface ReadHoldingRegistersOptions extends BaseReadOptions {
  fn: ReadFn.ReadHoldingRegisters
}
export interface ReadInputRegistersOptions extends BaseReadOptions {
  fn: ReadFn.ReadInputRegisters
}

export type ReadOptions =
  | ReadCoilsOptions
  | ReadDiscreteInputsOptions
  | ReadHoldingRegistersOptions
  | ReadInputRegistersOptions

export interface WriteCoilOptions extends BaseWriteOptions {
  fn: WriteFn.WriteSingleCoil
  value: boolean | number
}
export interface WriteRegisterOptions extends BaseWriteOptions {
  fn: WriteFn.WriteSingleRegister
  value: number
}
export interface WriteCoilsOptions extends BaseWriteOptions {
  fn: WriteFn.WriteMultipleCoils
  value: boolean[] | number[]
}
export interface WriteRegistersOptions extends BaseWriteOptions {
  fn: WriteFn.WriteMultipleRegisters
  value: number[]
}

export type WriteOptions =
  | WriteCoilOptions
  | WriteRegisterOptions
  | WriteCoilsOptions
  | WriteRegistersOptions

const ModbusExceptionToResponseCode: Record<number, Exclude<ResponseCode, ResponseCode.SUCCESS>> = {
  1: ResponseCode.OP_NOT_ALLOW,
  2: ResponseCode.ADDR_INVALID,
  3: ResponseCode.OP_NOT_ALLOW,
  4: ResponseCode.PLC_ABNORMAL,
  5: ResponseCode.PLC_ABNORMAL,
  6: ResponseCode.PLC_ABNORMAL,
  7: ResponseCode.OP_NOT_ALLOW,
  8: ResponseCode.PLC_ABNORMAL,
  10: ResponseCode.DEVICE_MISS,
  11: ResponseCode.DEVICE_MISS,
  1001: ResponseCode.RESPONSE_INVALID,
}

function lrc(bytes: Uint8Array): number {
  let sum = 0
  for (let i = 0; i < bytes.length; i += 1) {
    sum = (sum + bytes[i]) & 0xff
  }
  return (-sum & 0xff) >>> 0
}

function bytesToAsciiHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join('')
}

function asciiHexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid ASCII hex length')
  }
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function buildAsciiFrame(unitId: number, pdu: Uint8Array): Uint8Array {
  const body = new Uint8Array(1 + pdu.length + 1)
  body[0] = unitId & 0xff
  body.set(pdu, 1)
  body[body.length - 1] = lrc(body.subarray(0, body.length - 1))
  const text = `:${bytesToAsciiHex(body)}\r\n`
  return new TextEncoder().encode(text)
}

function isReadOptions<R extends ReadOptions, W extends WriteOptions>(
  options: R | W,
): options is R {
  return (
    options.fn === ReadFn.ReadCoils ||
    options.fn === ReadFn.ReadDiscreteInputs ||
    options.fn === ReadFn.ReadHoldingRegisters ||
    options.fn === ReadFn.ReadInputRegisters
  )
}

function isWriteOptions<R extends ReadOptions, W extends WriteOptions>(
  options: R | W,
): options is W {
  return (
    options.fn === WriteFn.WriteSingleCoil ||
    options.fn === WriteFn.WriteSingleRegister ||
    options.fn === WriteFn.WriteMultipleCoils ||
    options.fn === WriteFn.WriteMultipleRegisters
  )
}

function parseModbusAsciiResponse(frame: Uint8Array): {
  functionCode: number
  data: Uint8Array
  byteCount: number
  exceptionCode: number | null
} {
  const invalid = {
    functionCode: 0,
    data: new Uint8Array(0),
    byteCount: 0,
    exceptionCode: 1001,
  }

  try {
    const text = new TextDecoder().decode(frame)
    if (!text.startsWith(':') || !text.endsWith('\r\n')) {
      return invalid
    }

    const payloadHex = text.slice(1, -2)
    const bytes = asciiHexToBytes(payloadHex)
    if (bytes.length < 3) {
      return invalid
    }

    const payload = bytes.subarray(0, bytes.length - 1)
    const lrcByte = bytes[bytes.length - 1]
    if (lrc(payload) !== lrcByte) {
      return invalid
    }

    const fnRaw = payload[1]
    const pduPayload = payload.subarray(2)
    const isException = fnRaw >= 0x80
    const functionCode = fnRaw & 0x7f

    if (isException) {
      if (pduPayload.length !== 1) {
        return invalid
      }
      return {
        functionCode,
        data: new Uint8Array(0),
        byteCount: 0,
        exceptionCode: pduPayload[0],
      }
    }

    if (functionCode >= 1 && functionCode <= 4) {
      if (pduPayload.length < 1) {
        return invalid
      }
      const byteCount = pduPayload[0]
      const responseData = pduPayload.subarray(1)
      if (responseData.length !== byteCount) {
        return invalid
      }
      return {
        functionCode,
        data: responseData,
        byteCount,
        exceptionCode: null,
      }
    }

    if (functionCode >= 5 && functionCode <= 16) {
      if (pduPayload.length !== 4) {
        return invalid
      }
      return {
        functionCode,
        data: new Uint8Array(0),
        byteCount: 0,
        exceptionCode: null,
      }
    }

    return invalid
  } catch {
    return invalid
  }
}

function createReadPdu(opt: ReadOptions): Uint8Array {
  const pdu = new Uint8Array(5)
  pdu[0] = opt.fn
  pdu.set([opt.start >> 8, opt.start & 0xff], 1)
  pdu.set([opt.length >> 8, opt.length & 0xff], 3)
  return pdu
}

function encodeWriteSingleCoil(opt: WriteCoilOptions): Uint8Array {
  const pdu = new Uint8Array(5)
  pdu[0] = WriteFn.WriteSingleCoil
  pdu.set([opt.start >> 8, opt.start & 0xff], 1)
  const coilVal = opt.value ? 0xff00 : 0x0000
  pdu.set([coilVal >> 8, coilVal & 0xff], 3)
  return pdu
}

function encodeWriteSingleReg(opt: WriteRegisterOptions): Uint8Array {
  const pdu = new Uint8Array(5)
  pdu[0] = WriteFn.WriteSingleRegister
  pdu.set([opt.start >> 8, opt.start & 0xff], 1)
  pdu.set([opt.value >> 8, opt.value & 0xff], 3)
  return pdu
}

function encodeWriteMultiCoils(opt: WriteCoilsOptions): Uint8Array {
  const coilCount = opt.value.length
  const byteCount = Math.ceil(coilCount / 8)
  const pdu = new Uint8Array(6 + byteCount)
  pdu[0] = WriteFn.WriteMultipleCoils
  pdu.set([opt.start >> 8, opt.start & 0xff], 1)
  pdu.set([coilCount >> 8, coilCount & 0xff], 3)
  pdu[5] = byteCount
  let byteIdx = 6
  let bit = 0
  let curr = 0
  for (const v of opt.value) {
    if (v) curr |= 1 << bit
    bit += 1
    if (bit >= 8) {
      pdu[byteIdx++] = curr
      curr = 0
      bit = 0
    }
  }
  if (bit > 0) pdu[byteIdx] = curr
  return pdu
}

function encodeWriteMultiRegs(opt: WriteRegistersOptions): Uint8Array {
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
  return pdu
}

export class ModbusAsciiPacketFactory<
  R extends ReadOptions = ReadOptions,
  W extends WriteOptions = WriteOptions,
> implements PacketFactory<R, W> {
  readonly isSerial = true

  getTransactionId(sequence: number): number
  getTransactionId(response: Uint8Array): number
  getTransactionId(sequence: number | Uint8Array): number {
    if (sequence instanceof Uint8Array) {
      return 0
    }

    return sequence & 0xffff
  }

  encodeRead(options: R): Uint8Array {
    return buildAsciiFrame(options.unitId, createReadPdu(options))
  }

  encodeWrite(options: W): Uint8Array {
    switch (options.fn) {
      case WriteFn.WriteSingleCoil:
        return buildAsciiFrame(options.unitId, encodeWriteSingleCoil(options))
      case WriteFn.WriteSingleRegister:
        return buildAsciiFrame(options.unitId, encodeWriteSingleReg(options))
      case WriteFn.WriteMultipleCoils:
        return buildAsciiFrame(options.unitId, encodeWriteMultiCoils(options))
      case WriteFn.WriteMultipleRegisters:
        return buildAsciiFrame(options.unitId, encodeWriteMultiRegs(options))
      default: {
        const _exhaustive: never = options
        throw new Error(`Unknown write fn: ${_exhaustive}`)
      }
    }
  }

  mergeRead(options: R[]): R[] {
    if (!options || options.length === 0) {
      return []
    }

    const grouped = new Map<string, R[]>()
    for (const opt of options) {
      const unitId = opt.unitId ?? 1
      const key = `${unitId}:${opt.fn}`
      const existing = grouped.get(key) || []
      existing.push(opt)
      grouped.set(key, existing)
    }

    const merged: R[] = []
    for (const [, group] of grouped) {
      const sorted = group.sort((a, b) => a.start - b.start)
      let current = { ...sorted[0] }

      for (let i = 1; i < sorted.length; i += 1) {
        const next = sorted[i]
        const currentEnd = current.start + current.length
        const nextEnd = next.start + next.length

        if (currentEnd >= next.start) {
          current.length = Math.max(currentEnd, nextEnd) - current.start
        } else {
          merged.push(current)
          current = { ...next }
        }
      }

      merged.push(current)
    }

    return merged
  }

  mergeSubscriptionRelations(options: R[]): SubscriptionRelation<PacketFactory<R, W>>[] {
    if (!options || options.length === 0) {
      return []
    }

    const subscriptions = options as unknown as SubscriptionGroup<PacketFactory<R, W>>[]

    const grouped = new Map<string, SubscriptionGroup<PacketFactory<R, W>>[]>()
    for (const opt of subscriptions) {
      const unitId = opt.unitId ?? 1
      const key = `${unitId}:${(opt as unknown as R).fn}`
      const existing = grouped.get(key) || []
      existing.push(opt)
      grouped.set(key, existing)
    }

    const relations: SubscriptionRelation<PacketFactory<R, W>>[] = []
    for (const [, group] of grouped) {
      const sorted = [...group].sort((a, b) => a.start - b.start)
      let currentRange = { ...sorted[0] } as unknown as R
      let currentSubscriptions = [sorted[0]]

      for (let i = 1; i < sorted.length; i += 1) {
        const next = sorted[i]
        const currentEnd = currentRange.start + currentRange.length
        const nextEnd = next.start + next.length

        if (currentEnd >= next.start) {
          currentRange.length = Math.max(currentEnd, nextEnd) - currentRange.start
          currentSubscriptions.push(next)
        } else {
          relations.push({
            range: currentRange,
            subscriptions: currentSubscriptions,
          } as SubscriptionRelation<PacketFactory<R, W>>)
          currentRange = { ...next } as unknown as R
          currentSubscriptions = [next]
        }
      }

      relations.push({
        range: currentRange,
        subscriptions: currentSubscriptions,
      } as SubscriptionRelation<PacketFactory<R, W>>)
    }

    return relations
  }

  sliceReadResponse(options: R, response: IResponse<R, W>): Uint8Array | null {
    if (response.method !== RequestMethod.READ) {
      throw new Error(`Method mismatch: ${response.method}`)
    }

    if (response.code !== ResponseCode.SUCCESS) {
      return null
    }

    const { start, length, fn } = options
    const { data, byteCount } = response
    const startAddress = response.options.start

    if (data.length < byteCount) {
      throw new Error(`Data length mismatch: ${data.length} < ${byteCount}`)
    }

    if (fn === ReadFn.ReadCoils || fn === ReadFn.ReadDiscreteInputs) {
      const offset = (startAddress ?? 0) === start ? 0 : start - (startAddress ?? 0)
      const startBit = offset
      const endBit = startBit + length
      const totalBits = data.length * 8

      if (endBit > totalBits) {
        throw new Error(`Bit range out of bounds: ${endBit} > ${totalBits}`)
      }

      const out = new Uint8Array(Math.ceil(length / 8))
      for (let i = 0; i < length; i += 1) {
        const sourceBit = startBit + i
        const sourceByte = data[sourceBit >> 3] ?? 0
        const sourceMask = 1 << (sourceBit & 0x07)
        if ((sourceByte & sourceMask) !== 0) {
          out[i >> 3] |= 1 << (i & 0x07)
        }
      }
      return out
    }

    const relativeOffset = start - (startAddress ?? 0)
    const startIndex = relativeOffset * 2
    const endIndex = startIndex + length * 2

    if (startIndex < 0 || endIndex > data.length) {
      throw new Error(`Byte range out of bounds: ${startIndex}..${endIndex}/${data.length}`)
    }

    return data.slice(startIndex, endIndex)
  }

  decodeResponse(options: R | W, data: Uint8Array): IResponse<R, W> {
    const parsed = parseModbusAsciiResponse(data)
    const endAt = Date.now()

    if (parsed.exceptionCode !== null) {
      if (isReadOptions(options)) {
        return {
          options,
          transactionId: 0,
          method: RequestMethod.READ,
          responseFrame: data,
          startAt: options.startAt,
          endAt,
          code: ModbusExceptionToResponseCode[parsed.exceptionCode] ?? ResponseCode.OP_NOT_ALLOW,
        }
      }

      if (isWriteOptions(options)) {
        return {
          options,
          transactionId: 0,
          method: RequestMethod.WRITE,
          responseFrame: data,
          startAt: options.startAt,
          endAt,
          code: ModbusExceptionToResponseCode[parsed.exceptionCode] ?? ResponseCode.OP_NOT_ALLOW,
        }
      }

      throw new Error('Unknown function code in exception response')
    }

    if (isReadOptions(options)) {
      if (parsed.functionCode !== options.fn) {
        return {
          options,
          transactionId: 0,
          method: RequestMethod.READ,
          responseFrame: data,
          startAt: options.startAt,
          endAt,
          code: ResponseCode.RESPONSE_INVALID,
        }
      }

      return {
        options,
        transactionId: 0,
        method: RequestMethod.READ,
        responseFrame: data,
        startAt: options.startAt,
        endAt,
        code: ResponseCode.SUCCESS,
        data: parsed.data,
        byteCount: parsed.byteCount,
      }
    }

    if (isWriteOptions(options)) {
      if (parsed.functionCode !== options.fn) {
        return {
          options,
          transactionId: 0,
          method: RequestMethod.WRITE,
          responseFrame: data,
          startAt: options.startAt,
          endAt,
          code: ResponseCode.RESPONSE_INVALID,
        }
      }

      return {
        options,
        transactionId: 0,
        method: RequestMethod.WRITE,
        responseFrame: data,
        startAt: options.startAt,
        endAt,
        code: ResponseCode.SUCCESS,
      }
    }

    throw new Error('Unknown function code')
  }
}
