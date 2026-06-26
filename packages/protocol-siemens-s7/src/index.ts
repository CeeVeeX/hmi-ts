import {
  type BaseReadOptions,
  type BaseWriteOptions,
  type IResponse,
  type IRowResponse,
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
  value: number[]
}

export type ReadOptions = S7ReadOptions
export type WriteOptions = S7WriteOptions

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

function toByteArray(value: number[]): Uint8Array {
  return Uint8Array.from(value)
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
  const raw = toByteArray(options.value)
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

export class SiemensS7PacketFactory implements PacketFactory {
  getTransactionId(sequence: number): number
  getTransactionId(response: Uint8Array): number
  getTransactionId(sequence: number | Uint8Array): number {
    if (sequence instanceof Uint8Array) {
      return readUInt16BE(sequence, 11)
    }

    return sequence & 0xffff
  }

  encodeRead(transactionId: number, options: ReadOptions): Uint8Array {
    return encodeReadVarRequest(transactionId, options)
  }

  encodeWrite(transactionId: number, options: WriteOptions): Uint8Array {
    return encodeWriteVarRequest(transactionId, options)
  }

  mergeRead(options: ReadOptions[]): ReadOptions[] {
    if (options.length === 0) {
      return []
    }

    const grouped = new Map<string, ReadOptions[]>()
    for (const option of options) {
      const key = `${option.unitId}:${option.area}:${option.dbNumber ?? 0}`
      const group = grouped.get(key) ?? []
      group.push(option)
      grouped.set(key, group)
    }

    const merged: ReadOptions[] = []

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

  mergeSubscriptionRelations(options: SubscriptionGroup[]): SubscriptionRelation[] {
    if (options.length === 0) {
      return []
    }

    const grouped = new Map<string, SubscriptionGroup[]>()
    for (const option of options) {
      const key = `${option.unitId}:${option.area}:${option.dbNumber ?? 0}`
      const group = grouped.get(key) ?? []
      group.push(option)
      grouped.set(key, group)
    }

    const relations: SubscriptionRelation[] = []

    for (const [, group] of grouped) {
      const sorted = [...group].sort((a, b) => a.start - b.start)
      let currentRange = { ...sorted[0] } as ReadOptions
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
          relations.push({ range: currentRange, subscriptions: currentSubscriptions })
          currentRange = { ...next } as ReadOptions
          currentSubscriptions = [next]
        }
      }

      relations.push({ range: currentRange, subscriptions: currentSubscriptions })
    }

    return relations
  }

  sliceReadResponse(options: ReadOptions, response: IResponse<ReadOptions>): Uint8Array | null {
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

  decodeResponse(
    options: ReadOptions | WriteOptions,
    data: Uint8Array,
  ): IRowResponse<ReadOptions | WriteOptions> {
    try {
      const parsed = parseS7Frame(data)
      const method = 'length' in options ? RequestMethod.READ : RequestMethod.WRITE

      if (parsed.rosctr !== ROSCTR_ACK_DATA) {
        return {
          options,
          transactionId: parsed.pduReference,
          method,
          row: data,
          code: ResponseCode.RESPONSE_INVALID,
        } as IRowResponse<ReadOptions | WriteOptions>
      }

      if (method === RequestMethod.READ) {
        const readOptions = options as ReadOptions

        if (parsed.parameter[0] !== FUNCTION_READ_VAR || parsed.data.length < 4) {
          return {
            options: readOptions,
            transactionId: parsed.pduReference,
            method,
            row: data,
            code: ResponseCode.RESPONSE_INVALID,
          } as IRowResponse<ReadOptions | WriteOptions>
        }

        const itemCode = parsed.data[0]
        const mapped = mapItemReturnCode(itemCode)
        if (mapped !== ResponseCode.SUCCESS) {
          return {
            options: readOptions,
            transactionId: parsed.pduReference,
            method,
            row: data,
            code: mapped,
          } as IRowResponse<ReadOptions | WriteOptions>
        }

        const bitLength = readUInt16BE(parsed.data, 2)
        const byteCount = Math.ceil(bitLength / 8)
        const payload = parsed.data.slice(4, 4 + byteCount)

        if (payload.length !== byteCount) {
          return {
            options: readOptions,
            transactionId: parsed.pduReference,
            method,
            row: data,
            code: ResponseCode.RESPONSE_INVALID,
          } as IRowResponse<ReadOptions | WriteOptions>
        }

        return {
          options: readOptions,
          transactionId: parsed.pduReference,
          method,
          row: data,
          code: ResponseCode.SUCCESS,
          data: payload,
          byteCount: payload.length,
        } as IRowResponse<ReadOptions | WriteOptions>
      }

      const writeOptions = options as WriteOptions

      if (parsed.parameter[0] !== FUNCTION_WRITE_VAR || parsed.data.length < 1) {
        return {
          options: writeOptions,
          transactionId: parsed.pduReference,
          method,
          row: data,
          code: ResponseCode.RESPONSE_INVALID,
        } as IRowResponse<ReadOptions | WriteOptions>
      }

      const code = mapItemReturnCode(parsed.data[0])
      return {
        options: writeOptions,
        transactionId: parsed.pduReference,
        method,
        row: data,
        code,
      } as IRowResponse<ReadOptions | WriteOptions>
    } catch {
      const method = 'length' in options ? RequestMethod.READ : RequestMethod.WRITE
      return {
        options,
        transactionId: 0,
        method,
        row: data,
        code: ResponseCode.RESPONSE_INVALID,
      } as IRowResponse<ReadOptions | WriteOptions>
    }
  }
}
