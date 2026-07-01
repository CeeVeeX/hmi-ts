import {
  type BaseReadOptions,
  type BaseWriteOptions,
  type IResponse,
  type PacketFactory,
  RequestMethod,
  ResponseCode,
  type SubscriptionGroup,
  type SubscriptionRelation,
} from '@hmi-ts/core'

const S7_PROTOCOL_ID = 0x32
const ROSCTR_JOB = 0x01
const ROSCTR_ACK_DATA = 0x03
const FUNCTION_READ_VAR = 0x04
const FUNCTION_WRITE_VAR = 0x05
const SYNTAX_ID_S7ANY = 0x10
const TRANSPORT_SIZE_BYTE_WORD_DWORD = 0x02
const DATA_TRANSPORT_SIZE_BYTE_WORD_DWORD = 0x04
const READ_MAX_BYTES = 200

export enum S7Area {
  PE = 0x81,
  PA = 0x82,
  MK = 0x83,
  DB = 0x84,
}

export interface S7ReadOptions extends BaseReadOptions {
  area: S7Area
  dbNumber?: number
}

export interface S7WriteOptions extends BaseWriteOptions {
  area: S7Area
  dbNumber?: number
}

export type ReadOptions = S7ReadOptions
export type WriteOptions = S7WriteOptions

function isReadOptions<R extends ReadOptions, W extends WriteOptions>(
  options: R | W,
): options is R {
  return 'length' in options
}

interface ParsedS7Frame {
  rosctr: number
  pduReference: number
  parameter: Uint8Array
  data: Uint8Array
}

function writeUInt16BE(buffer: Uint8Array, offset: number, value: number): void {
  buffer[offset] = (value >> 8) & 0xff
  buffer[offset + 1] = value & 0xff
}

function readUInt16BE(buffer: Uint8Array, offset: number): number {
  return ((buffer[offset] ?? 0) << 8) | (buffer[offset + 1] ?? 0)
}

function mapItemReturnCode(code: number): ResponseCode {
  if (code === 0xff) {
    return ResponseCode.SUCCESS
  }

  if (code === 0x05) {
    return ResponseCode.ADDR_INVALID
  }

  if (code === 0x0a) {
    return ResponseCode.OP_NOT_ALLOW
  }

  if (code === 0x01 || code === 0x03) {
    return ResponseCode.PLC_ABNORMAL
  }

  return ResponseCode.OP_NOT_ALLOW
}

function buildS7AnyItem(options: {
  area: S7Area
  dbNumber?: number
  start: number
  length: number
}): Uint8Array {
  const item = new Uint8Array(12)
  item[0] = 0x12
  item[1] = 0x0a
  item[2] = SYNTAX_ID_S7ANY
  item[3] = TRANSPORT_SIZE_BYTE_WORD_DWORD
  writeUInt16BE(item, 4, options.length)
  writeUInt16BE(item, 6, options.dbNumber ?? 0)
  item[8] = options.area

  const bitAddress = options.start * 8
  item[9] = (bitAddress >> 16) & 0xff
  item[10] = (bitAddress >> 8) & 0xff
  item[11] = bitAddress & 0xff

  return item
}

function buildS7Frame(
  rosctr: number,
  pduReference: number,
  parameter: Uint8Array,
  data: Uint8Array,
): Uint8Array {
  const s7Length = 10 + parameter.length + data.length
  const totalLength = 4 + 3 + s7Length

  const frame = new Uint8Array(totalLength)
  frame[0] = 0x03
  frame[1] = 0x00
  writeUInt16BE(frame, 2, totalLength)

  frame[4] = 0x02
  frame[5] = 0xf0
  frame[6] = 0x80

  frame[7] = S7_PROTOCOL_ID
  frame[8] = rosctr
  frame[9] = 0x00
  frame[10] = 0x00
  writeUInt16BE(frame, 11, pduReference)
  writeUInt16BE(frame, 13, parameter.length)
  writeUInt16BE(frame, 15, data.length)

  frame.set(parameter, 17)
  frame.set(data, 17 + parameter.length)

  return frame
}

function parseS7Frame(frame: Uint8Array): ParsedS7Frame {
  if (frame.length < 17) {
    throw new Error('invalid S7 frame length')
  }

  if (frame[0] !== 0x03 || frame[1] !== 0x00) {
    throw new Error('invalid TPKT header')
  }

  const declaredLength = readUInt16BE(frame, 2)
  if (declaredLength !== frame.length) {
    throw new Error('TPKT length mismatch')
  }

  if (frame[4] !== 0x02 || frame[5] !== 0xf0 || frame[6] !== 0x80) {
    throw new Error('invalid COTP header')
  }

  if (frame[7] !== S7_PROTOCOL_ID) {
    throw new Error('invalid S7 protocol id')
  }

  const rosctr = frame[8]
  const pduReference = readUInt16BE(frame, 11)
  const parameterLength = readUInt16BE(frame, 13)
  const dataLength = readUInt16BE(frame, 15)

  const parameterStart = 17
  const parameterEnd = parameterStart + parameterLength
  const dataEnd = parameterEnd + dataLength

  if (dataEnd > frame.length) {
    throw new Error('S7 payload length mismatch')
  }

  return {
    rosctr,
    pduReference,
    parameter: frame.slice(parameterStart, parameterEnd),
    data: frame.slice(parameterEnd, dataEnd),
  }
}

function encodeReadVarRequest(transactionId: number, options: ReadOptions): Uint8Array {
  const parameter = new Uint8Array(2 + 12)
  parameter[0] = FUNCTION_READ_VAR
  parameter[1] = 0x01
  parameter.set(buildS7AnyItem(options), 2)

  return buildS7Frame(ROSCTR_JOB, transactionId, parameter, new Uint8Array(0))
}

function encodeWriteVarRequest(transactionId: number, options: WriteOptions): Uint8Array {
  const raw = options.value
  const parameter = new Uint8Array(2 + 12)
  parameter[0] = FUNCTION_WRITE_VAR
  parameter[1] = 0x01
  parameter.set(
    buildS7AnyItem({
      area: options.area,
      dbNumber: options.dbNumber,
      start: options.start,
      length: raw.length,
    }),
    2,
  )

  const data = new Uint8Array(4 + raw.length)
  data[0] = 0x00
  data[1] = DATA_TRANSPORT_SIZE_BYTE_WORD_DWORD
  writeUInt16BE(data, 2, raw.length * 8)
  data.set(raw, 4)

  return buildS7Frame(ROSCTR_JOB, transactionId, parameter, data)
}

export class SiemensS7PacketFactory<
  R extends ReadOptions = ReadOptions,
  W extends WriteOptions = WriteOptions,
> implements PacketFactory<R, W> {
  getTransactionId(sequence: number): number
  getTransactionId(response: Uint8Array): number
  getTransactionId(sequence: number | Uint8Array): number {
    if (sequence instanceof Uint8Array) {
      return readUInt16BE(sequence, 11)
    }

    return sequence & 0xffff
  }

  encodeRead(options: R): Uint8Array {
    return encodeReadVarRequest(options.id, options)
  }

  encodeWrite(options: W): Uint8Array {
    return encodeWriteVarRequest(options.id, options)
  }

  mergeRead(options: R[]): R[] {
    if (options.length === 0) {
      return []
    }

    const grouped = new Map<string, R[]>()
    for (const option of options) {
      const key = `${option.unitId}:${option.area}:${option.dbNumber ?? 0}`
      const group = grouped.get(key) ?? []
      group.push(option)
      grouped.set(key, group)
    }

    const merged: R[] = []

    for (const [, group] of grouped) {
      const sorted = [...group].sort((a, b) => a.start - b.start)
      let current = { ...sorted[0] }

      for (let i = 1; i < sorted.length; i += 1) {
        const next = sorted[i]
        const currentEnd = current.start + current.length
        const nextEnd = next.start + next.length
        const mergedLength = Math.max(currentEnd, nextEnd) - current.start

        if (currentEnd >= next.start && mergedLength <= READ_MAX_BYTES) {
          current.length = mergedLength
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
    if (options.length === 0) {
      return []
    }

    const subscriptions = options as unknown as SubscriptionGroup<PacketFactory<R, W>>[]

    const grouped = new Map<string, SubscriptionGroup<PacketFactory<R, W>>[]>()
    for (const option of subscriptions) {
      const typedOption = option as unknown as R
      const key = `${typedOption.unitId}:${typedOption.area}:${typedOption.dbNumber ?? 0}`
      const group = grouped.get(key) ?? []
      group.push(option)
      grouped.set(key, group)
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
        const mergedLength = Math.max(currentEnd, nextEnd) - currentRange.start

        if (currentEnd >= next.start && mergedLength <= READ_MAX_BYTES) {
          currentRange.length = mergedLength
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
      throw new Error(`response method mismatch: ${response.method}`)
    }

    if (response.code !== ResponseCode.SUCCESS) {
      return null
    }

    const offset = options.start - response.options.start
    const end = offset + options.length

    if (offset < 0 || end > response.data.length) {
      throw new Error('slice range exceeds S7 payload length')
    }

    return response.data.slice(offset, end)
  }

  decodeResponse(options: R | W, data: Uint8Array): IResponse<R, W> {
    const endAt = Date.now()
    try {
      const parsed = parseS7Frame(data)

      if (parsed.rosctr !== ROSCTR_ACK_DATA) {
        if (isReadOptions(options)) {
          return {
            options,
            transactionId: parsed.pduReference,
            method: RequestMethod.READ,
            responseFrame: data,
            startAt: options.startAt,
            endAt,
            code: ResponseCode.RESPONSE_INVALID,
          }
        }

        return {
          options,
          transactionId: parsed.pduReference,
          method: RequestMethod.WRITE,
          responseFrame: data,
          startAt: options.startAt,
          endAt,
          code: ResponseCode.RESPONSE_INVALID,
        }
      }

      if (isReadOptions(options)) {
        if (parsed.parameter[0] !== FUNCTION_READ_VAR || parsed.data.length < 4) {
          return {
            options,
            transactionId: parsed.pduReference,
            method: RequestMethod.READ,
            responseFrame: data,
            startAt: options.startAt,
            endAt,
            code: ResponseCode.RESPONSE_INVALID,
          }
        }

        const itemCode = parsed.data[0]
        const mapped = mapItemReturnCode(itemCode)
        if (mapped !== ResponseCode.SUCCESS) {
          return {
            options,
            transactionId: parsed.pduReference,
            method: RequestMethod.READ,
            responseFrame: data,
            startAt: options.startAt,
            endAt,
            code: mapped,
          }
        }

        const bitLength = readUInt16BE(parsed.data, 2)
        const byteCount = Math.ceil(bitLength / 8)
        const payload = parsed.data.slice(4, 4 + byteCount)

        if (payload.length !== byteCount) {
          return {
            options,
            transactionId: parsed.pduReference,
            method: RequestMethod.READ,
            responseFrame: data,
            startAt: options.startAt,
            endAt,
            code: ResponseCode.RESPONSE_INVALID,
          }
        }

        return {
          options,
          transactionId: parsed.pduReference,
          method: RequestMethod.READ,
          responseFrame: data,
          startAt: options.startAt,
          endAt,
          code: ResponseCode.SUCCESS,
          data: payload,
          byteCount: payload.length,
        }
      }

      if (parsed.parameter[0] !== FUNCTION_WRITE_VAR || parsed.data.length < 1) {
        return {
          options,
          transactionId: parsed.pduReference,
          method: RequestMethod.WRITE,
          responseFrame: data,
          startAt: options.startAt,
          endAt,
          code: ResponseCode.RESPONSE_INVALID,
        }
      }

      const code = mapItemReturnCode(parsed.data[0])
      return {
        options,
        transactionId: parsed.pduReference,
        method: RequestMethod.WRITE,
        responseFrame: data,
        startAt: options.startAt,
        endAt,
        code,
      }
    } catch {
      if (isReadOptions(options)) {
        return {
          options,
          transactionId: this.getTransactionId(data),
          method: RequestMethod.READ,
          responseFrame: data,
          startAt: options.startAt,
          endAt,
          code: ResponseCode.RESPONSE_INVALID,
        }
      }

      return {
        options,
        transactionId: this.getTransactionId(data),
        method: RequestMethod.WRITE,
        responseFrame: data,
        startAt: options.startAt,
        endAt,
        code: ResponseCode.RESPONSE_INVALID,
      }
    }
  }
}
