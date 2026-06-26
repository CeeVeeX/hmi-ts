import {
  type BaseReadOptions,
  type BaseWriteOptions,
  type CommonOptions,
  type IResponse,
  type IRowResponse,
  type PacketFactory,
  type SubscriptionGroup,
  type SubscriptionRelation,
  RequestMethod,
  ResponseCode,
} from '@hmi-ts/core'

export enum Mc3eSubHeader {
  REQUEST = 0x5000,
  RESPONSE = 0xd000,
}

export enum Mc3eCommand {
  BATCH_READ = 0x0401,
  BATCH_WRITE = 0x1401,
}

export enum Mc3eSubCommand {
  WORD = 0x0000,
  BIT = 0x0001,
}

export enum Mc3eDeviceCode {
  M = 0x90,
  X = 0x9c,
  Y = 0x9d,
  D = 0xa8,
  W = 0xb4,
  R = 0xaf,
}

const BIT_DEVICE_SET = new Set<Mc3eDevice>(['M', 'X', 'Y'])

const DEFAULT_NETWORK_NO = 0x00
const DEFAULT_PLC_NO = 0xff
const DEFAULT_IO_NO = 0x03ff
const DEFAULT_STATION_NO = 0x00
const DEFAULT_MONITOR_TIMER = 0x0010

export type Mc3eDevice = keyof typeof Mc3eDeviceCode

export interface Mc3eRouteOptions {
  networkNo?: number
  plcNo?: number
  ioNo?: number
  stationNo?: number
}

export interface Mc3ePacketFactoryOptions {
  route?: Mc3eRouteOptions
  monitoringTimer?: number
}

export interface Mc3eCommonOptions {
  device: Mc3eDevice
  route?: Mc3eRouteOptions
  monitoringTimer?: number
}

export interface WriteBitOptions extends BaseWriteOptions, Mc3eCommonOptions {
  value: boolean | number | boolean[] | number[]
}

export interface WriteWordOptions extends BaseWriteOptions, Mc3eCommonOptions {
  value: number | number[]
}

export interface ReadBitOptions extends BaseReadOptions, Mc3eCommonOptions {}

export interface ReadWordOptions extends BaseReadOptions, Mc3eCommonOptions {}

export type Mc3eReadOptions = ReadBitOptions | ReadWordOptions
export type Mc3eWriteOptions = WriteBitOptions | WriteWordOptions

interface ParsedResponse {
  endCode: number
  payload: Uint8Array
}

function ensureUInt8(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new RangeError(`${fieldName} must be an integer in range 0..255`)
  }
}

function ensureUInt16(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new RangeError(`${fieldName} must be an integer in range 0..65535`)
  }
}

function ensureUInt24(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffff) {
    throw new RangeError(`${fieldName} must be an integer in range 0..16777215`)
  }
}

function writeUInt16LE(buffer: Uint8Array, offset: number, value: number): void {
  buffer[offset] = value & 0xff
  buffer[offset + 1] = (value >> 8) & 0xff
}

function writeUInt24LE(buffer: Uint8Array, offset: number, value: number): void {
  buffer[offset] = value & 0xff
  buffer[offset + 1] = (value >> 8) & 0xff
  buffer[offset + 2] = (value >> 16) & 0xff
}

function readUInt16LE(buffer: Uint8Array, offset: number): number {
  return buffer[offset] | (buffer[offset + 1] << 8)
}

function normalizeDevice(device: string): Mc3eDevice {
  const normalized = device.toUpperCase() as Mc3eDevice
  if (!(normalized in Mc3eDeviceCode)) {
    throw new Error(`unsupported MC device: ${device}`)
  }
  return normalized
}

function isBitDevice(device: string): boolean {
  return BIT_DEVICE_SET.has(normalizeDevice(device))
}

function getDeviceCode(device: string): number {
  return Mc3eDeviceCode[normalizeDevice(device)]
}

function toBitValues(value: WriteBitOptions['value']): Array<boolean | number> {
  if (Array.isArray(value)) {
    return value as Array<boolean | number>
  }
  return [value]
}

function packBitValues(values: Array<boolean | number>): Uint8Array {
  const out = new Uint8Array(Math.ceil(values.length / 2))
  for (let i = 0; i < values.length; i += 1) {
    const on = values[i] === true || values[i] === 1
    const byteIndex = i >> 1
    if ((i & 0x01) === 0) {
      out[byteIndex] |= on ? 0x01 : 0x00
    } else {
      out[byteIndex] |= on ? 0x10 : 0x00
    }
  }
  return out
}

function unpackBitValues(payload: Uint8Array, pointCount: number): boolean[] {
  const out: boolean[] = []
  for (let i = 0; i < pointCount; i += 1) {
    const value = payload[i >> 1] ?? 0
    const nibble = (i & 0x01) === 0 ? value & 0x0f : (value >> 4) & 0x0f
    out.push(nibble !== 0)
  }
  return out
}

function mapEndCode(endCode: number): ResponseCode {
  if (endCode === 0x0000) {
    return ResponseCode.SUCCESS
  }

  if (endCode === 0xc051 || endCode === 0xc052) {
    return ResponseCode.ADDR_INVALID
  }

  if (endCode === 0x005b || endCode === 0x00b0) {
    return ResponseCode.PLC_ABNORMAL
  }

  return ResponseCode.OP_NOT_ALLOW
}

function buildRequestFrame(
  body: Uint8Array,
  options: { unitId: number; route?: Mc3eRouteOptions; monitoringTimer?: number },
): Uint8Array {
  const networkNo = options.route?.networkNo ?? DEFAULT_NETWORK_NO
  const plcNo = options.route?.plcNo ?? DEFAULT_PLC_NO
  const ioNo = options.route?.ioNo ?? DEFAULT_IO_NO
  const stationNo = options.route?.stationNo ?? options.unitId ?? DEFAULT_STATION_NO
  const monitorTimer = options.monitoringTimer ?? DEFAULT_MONITOR_TIMER

  ensureUInt8(networkNo, 'route.networkNo')
  ensureUInt8(plcNo, 'route.plcNo')
  ensureUInt16(ioNo, 'route.ioNo')
  ensureUInt8(stationNo, 'route.stationNo')
  ensureUInt16(monitorTimer, 'monitoringTimer')

  const frame = new Uint8Array(11 + body.length)
  writeUInt16LE(frame, 0, Mc3eSubHeader.REQUEST)
  frame[2] = networkNo
  frame[3] = plcNo
  writeUInt16LE(frame, 4, ioNo)
  frame[6] = stationNo
  writeUInt16LE(frame, 7, body.length + 2)
  writeUInt16LE(frame, 9, monitorTimer)
  frame.set(body, 11)

  return frame
}

function parseResponseFrame(frame: Uint8Array): ParsedResponse {
  if (frame.length < 11) {
    throw new Error('invalid MC 3E response: frame too short')
  }

  const subHeader = readUInt16LE(frame, 0)
  if (subHeader !== Mc3eSubHeader.RESPONSE) {
    throw new Error(`invalid MC 3E response subheader: ${subHeader}`)
  }

  const dataLength = readUInt16LE(frame, 7)
  const payloadStart = 9
  const payloadEnd = payloadStart + dataLength

  if (payloadEnd > frame.length) {
    throw new Error('invalid MC 3E response: payload length mismatch')
  }

  const endCode = readUInt16LE(frame, payloadStart)
  const payload = frame.slice(payloadStart + 2, payloadEnd)

  return {
    endCode,
    payload,
  }
}

function buildReadBody(options: Mc3eReadOptions): Uint8Array {
  ensureUInt24(options.start, 'start')
  ensureUInt16(options.length, 'length')

  const body = new Uint8Array(10)
  const subcommand = isBitDevice(options.device) ? Mc3eSubCommand.BIT : Mc3eSubCommand.WORD

  writeUInt16LE(body, 0, Mc3eCommand.BATCH_READ)
  writeUInt16LE(body, 2, subcommand)
  writeUInt24LE(body, 4, options.start)
  body[7] = getDeviceCode(options.device)
  writeUInt16LE(body, 8, options.length)

  return body
}

function buildWriteBody(options: Mc3eWriteOptions): Uint8Array {
  ensureUInt24(options.start, 'start')

  const bit = isBitDevice(options.device)
  const values = bit
    ? toBitValues((options as WriteBitOptions).value)
    : Array.isArray(options.value)
      ? options.value
      : [options.value]
  ensureUInt16(values.length, 'value.length')

  const payload = bit
    ? packBitValues(values)
    : (() => {
        const bytes = new Uint8Array(values.length * 2)
        for (let i = 0; i < values.length; i += 1) {
          const word = Number(values[i])
          ensureUInt16(word, `value[${i}]`)
          writeUInt16LE(bytes, i * 2, word)
        }
        return bytes
      })()

  const body = new Uint8Array(10 + payload.length)
  const subcommand = bit ? Mc3eSubCommand.BIT : Mc3eSubCommand.WORD

  writeUInt16LE(body, 0, Mc3eCommand.BATCH_WRITE)
  writeUInt16LE(body, 2, subcommand)
  writeUInt24LE(body, 4, options.start)
  body[7] = getDeviceCode(options.device)
  writeUInt16LE(body, 8, values.length)
  body.set(payload, 10)

  return body
}

function mergeReadOptions(options: Mc3eReadOptions[]): Mc3eReadOptions[] {
  if (options.length === 0) {
    return []
  }

  const grouped = new Map<string, Mc3eReadOptions[]>()
  for (const option of options) {
    const route = option.route ?? {}
    const key = [
      option.device.toUpperCase(),
      route.networkNo ?? DEFAULT_NETWORK_NO,
      route.plcNo ?? DEFAULT_PLC_NO,
      route.ioNo ?? DEFAULT_IO_NO,
      route.stationNo ?? option.unitId,
    ].join(':')

    const group = grouped.get(key)
    if (group) {
      group.push(option)
    } else {
      grouped.set(key, [option])
    }
  }

  const merged: Mc3eReadOptions[] = []

  for (const [, group] of grouped) {
    const sorted = [...group].sort((a, b) => a.start - b.start)
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

function mergeSubscriptionRelations(options: SubscriptionGroup[]): SubscriptionRelation[] {
  if (options.length === 0) {
    return []
  }

  const grouped = new Map<string, SubscriptionGroup[]>()
  for (const option of options) {
    const readOption = option as unknown as Mc3eReadOptions
    const route = readOption.route ?? {}
    const key = [
      readOption.device.toUpperCase(),
      route.networkNo ?? DEFAULT_NETWORK_NO,
      route.plcNo ?? DEFAULT_PLC_NO,
      route.ioNo ?? DEFAULT_IO_NO,
      route.stationNo ?? readOption.unitId,
    ].join(':')

    const group = grouped.get(key)
    if (group) {
      group.push(option)
    } else {
      grouped.set(key, [option])
    }
  }

  const relations: SubscriptionRelation[] = []

  for (const [, group] of grouped) {
    const sorted = [...group].sort((a, b) => a.start - b.start)
    let currentRange = { ...sorted[0] } as unknown as Mc3eReadOptions
    let currentSubscriptions = [sorted[0]]

    for (let i = 1; i < sorted.length; i += 1) {
      const next = sorted[i] as unknown as Mc3eReadOptions
      const currentEnd = currentRange.start + currentRange.length
      const nextEnd = next.start + next.length

      if (currentEnd >= next.start) {
        currentRange.length = Math.max(currentEnd, nextEnd) - currentRange.start
        currentSubscriptions.push(sorted[i])
      } else {
        relations.push({ range: currentRange, subscriptions: currentSubscriptions })
        currentRange = { ...next } as unknown as Mc3eReadOptions
        currentSubscriptions = [sorted[i]]
      }
    }

    relations.push({ range: currentRange, subscriptions: currentSubscriptions })
  }

  return relations
}

export class Mc3ePacketFactory implements PacketFactory {
  readonly isSerial = true

  constructor(private readonly options: Mc3ePacketFactoryOptions = {}) {}

  getTransactionId(sequence: number): number
  getTransactionId(response: Uint8Array): number
  getTransactionId(sequence: number | Uint8Array): number {
    if (sequence instanceof Uint8Array) {
      return 0
    }

    return sequence & 0xffff
  }

  encodeRead(_transactionId: number, options: BaseReadOptions): Uint8Array {
    const readOptions = options as Mc3eReadOptions
    const body = buildReadBody(readOptions)
    return buildRequestFrame(body, {
      unitId: readOptions.unitId,
      route: readOptions.route ?? this.options.route,
      monitoringTimer: readOptions.monitoringTimer ?? this.options.monitoringTimer,
    })
  }

  encodeWrite(_transactionId: number, options: BaseWriteOptions): Uint8Array {
    const writeOptions = options as Mc3eWriteOptions
    const body = buildWriteBody(writeOptions)
    return buildRequestFrame(body, {
      unitId: writeOptions.unitId,
      route: writeOptions.route ?? this.options.route,
      monitoringTimer: writeOptions.monitoringTimer ?? this.options.monitoringTimer,
    })
  }

  mergeRead(options: BaseReadOptions[]): BaseReadOptions[] {
    return mergeReadOptions(options as Mc3eReadOptions[])
  }

  mergeSubscriptionRelations(options: SubscriptionGroup[]): SubscriptionRelation[] {
    return mergeSubscriptionRelations(options)
  }

  sliceReadResponse(
    options: BaseReadOptions,
    response: IResponse<BaseReadOptions>,
  ): Uint8Array | null {
    const req = options as Mc3eReadOptions
    const rsp = response as IResponse<Mc3eReadOptions>

    if (rsp.method !== RequestMethod.READ) {
      throw new Error(`response method mismatch: ${rsp.method}`)
    }

    if (rsp.code !== ResponseCode.SUCCESS) {
      return null
    }

    const offset = req.start - rsp.options.start
    if (offset < 0) {
      throw new Error('slice offset cannot be negative')
    }

    if (isBitDevice(req.device)) {
      const bits = unpackBitValues(rsp.data, rsp.options.length)
      const part = bits.slice(offset, offset + req.length)
      if (part.length !== req.length) {
        throw new Error('slice range exceeds bit payload')
      }
      return packBitValues(part)
    }

    const startIndex = offset * 2
    const endIndex = startIndex + req.length * 2
    if (endIndex > rsp.data.length) {
      throw new Error('slice range exceeds word payload')
    }

    return rsp.data.slice(startIndex, endIndex)
  }

  decodeResponse(
    opt: CommonOptions,
    data: Uint8Array,
  ): IRowResponse<Mc3eReadOptions | Mc3eWriteOptions> {
    const requestOptions = opt as Mc3eReadOptions | Mc3eWriteOptions
    const transactionId = 0

    try {
      const parsed = parseResponseFrame(data)
      const code = mapEndCode(parsed.endCode)

      if ('length' in requestOptions) {
        if (code !== ResponseCode.SUCCESS) {
          return {
            options: requestOptions,
            transactionId,
            method: RequestMethod.READ,
            row: data,
            code,
          }
        }

        return {
          options: requestOptions,
          transactionId,
          method: RequestMethod.READ,
          row: data,
          code,
          data: parsed.payload,
          byteCount: parsed.payload.length,
        }
      }

      if (code !== ResponseCode.SUCCESS) {
        return {
          options: requestOptions,
          transactionId,
          method: RequestMethod.WRITE,
          row: data,
          code,
        }
      }

      return {
        options: requestOptions,
        transactionId,
        method: RequestMethod.WRITE,
        row: data,
        code,
      }
    } catch {
      if ('length' in requestOptions) {
        return {
          options: requestOptions,
          transactionId,
          method: RequestMethod.READ,
          row: data,
          code: ResponseCode.RESPONSE_INVALID,
        }
      }

      return {
        options: requestOptions,
        transactionId,
        method: RequestMethod.WRITE,
        row: data,
        code: ResponseCode.RESPONSE_INVALID,
      }
    }
  }
}
