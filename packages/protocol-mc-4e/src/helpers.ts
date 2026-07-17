import type { PacketFactory, SubscriptionGroup, SubscriptionRelation } from '@hmi-ts/core'
import { ResponseCode } from '@hmi-ts/core'
import {
  Mc4eCommand,
  Mc4eDeviceCode,
  Mc4eSubCommand,
  Mc4eSubHeader,
  type Mc4eDevice,
  type Mc4eReadOptions,
  type Mc4eRouteOptions,
  type Mc4eWriteOptions,
  type ParsedResponse,
} from './types'

export interface Mc4eReadBlockItem {
  device: Mc4eDevice
  start: number
  length: number
}

export interface Mc4eBlockReadOptions extends Mc4eReadOptions {
  blocks: Mc4eReadBlockItem[]
}

const BIT_DEVICE_SET = new Set<Mc4eDevice>(['M', 'X', 'Y'])

const DEFAULT_NETWORK_NO = 0x00
const DEFAULT_PLC_NO = 0xff
const DEFAULT_IO_NO = 0x03ff
const DEFAULT_STATION_NO = 0x00
const DEFAULT_MONITOR_TIMER = 0x0010
const MAX_WORD_POINTS_PER_REQUEST = 960
const MAX_BIT_POINTS_PER_REQUEST = 7168
const MAX_BLOCKS_PER_REQUEST = 120

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

export function writeUInt16LE(buffer: Uint8Array, offset: number, value: number): void {
  buffer[offset] = value & 0xff
  buffer[offset + 1] = (value >> 8) & 0xff
}

function writeUInt24LE(buffer: Uint8Array, offset: number, value: number): void {
  buffer[offset] = value & 0xff
  buffer[offset + 1] = (value >> 8) & 0xff
  buffer[offset + 2] = (value >> 16) & 0xff
}

export function readUInt16LE(buffer: Uint8Array, offset: number): number {
  return buffer[offset] | (buffer[offset + 1] << 8)
}

function normalizeDevice(device: string): Mc4eDevice {
  const normalized = device.toUpperCase() as Mc4eDevice
  if (!(normalized in Mc4eDeviceCode)) {
    throw new Error(`unsupported MC device: ${device}`)
  }
  return normalized
}

export function isBitDevice(device: string): boolean {
  return BIT_DEVICE_SET.has(normalizeDevice(device))
}

function getDeviceCode(device: string): number {
  return Mc4eDeviceCode[normalizeDevice(device)]
}

function toBitValues(value: Uint8Array): number[] {
  return Array.from(value, (item) => (item ? 1 : 0))
}

export function packBitValues(values: Array<number | boolean>): Uint8Array {
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

function packBitWriteValues(values: Array<number | boolean>): Uint8Array {
  const out = new Uint8Array(Math.ceil(values.length / 2))
  for (let i = 0; i < values.length; i += 1) {
    const on = values[i] === true || values[i] === 1
    const byteIndex = i >> 1
    if ((i & 0x01) === 0) {
      out[byteIndex] |= on ? 0x10 : 0x00
    } else {
      out[byteIndex] |= on ? 0x01 : 0x00
    }
  }
  return out
}

export function unpackBitValues(payload: Uint8Array, pointCount: number): boolean[] {
  const out: boolean[] = []
  for (let i = 0; i < pointCount; i += 1) {
    const value = payload[i >> 1] ?? 0
    const nibble = (i & 0x01) === 0 ? value & 0x0f : (value >> 4) & 0x0f
    out.push(nibble !== 0)
  }
  return out
}

export function mapEndCode(endCode: number): ResponseCode {
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

export function buildRequestFrame(
  transactionId: number,
  body: Uint8Array,
  options: { unitId: number; route?: Mc4eRouteOptions; monitoringTimer?: number },
): Uint8Array {
  ensureUInt16(transactionId, 'transactionId')

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

  const frame = new Uint8Array(15 + body.length)
  writeUInt16LE(frame, 0, Mc4eSubHeader.REQUEST)
  writeUInt16LE(frame, 2, transactionId)
  writeUInt16LE(frame, 4, 0x0000)

  frame[6] = networkNo
  frame[7] = plcNo
  writeUInt16LE(frame, 8, ioNo)
  frame[10] = stationNo
  writeUInt16LE(frame, 11, body.length + 2)
  writeUInt16LE(frame, 13, monitorTimer)
  frame.set(body, 15)

  return frame
}

export function parseResponseFrame(frame: Uint8Array): ParsedResponse {
  if (frame.length < 15) {
    throw new Error('invalid MC 4E response: frame too short')
  }

  const subHeader = readUInt16LE(frame, 0)
  if (subHeader !== Mc4eSubHeader.RESPONSE) {
    throw new Error(`invalid MC 4E response subheader: ${subHeader}`)
  }

  const fixedValue = readUInt16LE(frame, 4)
  if (fixedValue !== 0x0000) {
    throw new Error(`invalid MC 4E response fixed field: ${fixedValue}`)
  }

  const transactionId = readUInt16LE(frame, 2)
  const dataLength = readUInt16LE(frame, 11)
  const payloadStart = 13
  const payloadEnd = payloadStart + dataLength

  if (payloadEnd > frame.length) {
    throw new Error('invalid MC 4E response: payload length mismatch')
  }

  const endCode = readUInt16LE(frame, payloadStart)
  const payload = frame.slice(payloadStart + 2, payloadEnd)

  return {
    transactionId,
    endCode,
    payload,
  }
}

export function isBlockReadOptions(options: Mc4eReadOptions): options is Mc4eBlockReadOptions {
  return 'blocks' in options && Array.isArray((options as Mc4eBlockReadOptions).blocks)
}

function getBlockPayloadByteLength(block: Mc4eReadBlockItem): number {
  return isBitDevice(block.device) ? Math.ceil(block.length / 2) : block.length * 2
}

export function normalizeBlockReadItems(blocks: Mc4eReadBlockItem[]): Mc4eReadBlockItem[] {
  const wordBlocks = blocks.filter((block) => !isBitDevice(block.device))
  const bitBlocks = blocks.filter((block) => isBitDevice(block.device))
  return [...wordBlocks, ...bitBlocks]
}

function buildBlockReadBody(options: Mc4eBlockReadOptions): Uint8Array {
  const blocks = normalizeBlockReadItems(options.blocks)
  const wordBlocks = blocks.filter((block) => !isBitDevice(block.device))
  const bitBlocks = blocks.filter((block) => isBitDevice(block.device))

  ensureUInt8(wordBlocks.length, 'wordBlockCount')
  ensureUInt8(bitBlocks.length, 'bitBlockCount')

  const body = new Uint8Array(6 + blocks.length * 6)
  writeUInt16LE(body, 0, Mc4eCommand.BLOCK_READ)
  writeUInt16LE(body, 2, Mc4eSubCommand.WORD)
  body[4] = wordBlocks.length
  body[5] = bitBlocks.length

  let offset = 6
  for (const block of blocks) {
    ensureUInt24(block.start, 'block.start')
    ensureUInt16(block.length, 'block.length')

    writeUInt24LE(body, offset, block.start)
    body[offset + 3] = getDeviceCode(block.device)
    writeUInt16LE(body, offset + 4, block.length)
    offset += 6
  }

  return body
}

export function buildReadBody(options: Mc4eReadOptions): Uint8Array {
  if (isBlockReadOptions(options)) {
    return buildBlockReadBody(options)
  }

  ensureUInt24(options.start, 'start')
  ensureUInt16(options.length, 'length')

  const body = new Uint8Array(10)
  const subcommand = isBitDevice(options.device) ? Mc4eSubCommand.BIT : Mc4eSubCommand.WORD

  writeUInt16LE(body, 0, Mc4eCommand.BATCH_READ)
  writeUInt16LE(body, 2, subcommand)
  writeUInt24LE(body, 4, options.start)
  body[7] = getDeviceCode(options.device)
  writeUInt16LE(body, 8, options.length)

  return body
}

export function buildWriteBody(options: Mc4eWriteOptions): Uint8Array {
  ensureUInt24(options.start, 'start')

  const bit = isBitDevice(options.device)
  const values = bit ? toBitValues(options.value) : []
  const wordCount = bit ? values.length : options.value.length / 2
  if (!bit && options.value.length % 2 !== 0) {
    throw new RangeError('word write value length must be even')
  }
  ensureUInt16(wordCount, 'value.length')

  const payload = bit ? packBitWriteValues(values) : options.value

  const body = new Uint8Array(10 + payload.length)
  const subcommand = bit ? Mc4eSubCommand.BIT : Mc4eSubCommand.WORD

  writeUInt16LE(body, 0, Mc4eCommand.BATCH_WRITE)
  writeUInt16LE(body, 2, subcommand)
  writeUInt24LE(body, 4, options.start)
  body[7] = getDeviceCode(options.device)
  writeUInt16LE(body, 8, wordCount)
  body.set(payload, 10)

  return body
}

export function mergeReadOptions(options: Mc4eReadOptions[]): Mc4eReadOptions[] {
  if (options.length === 0) {
    return []
  }

  const grouped = new Map<string, Mc4eReadOptions[]>()
  for (const option of options) {
    const route = option.route ?? {}
    const key = [
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

  const merged: Mc4eReadOptions[] = []

  for (const [, group] of grouped) {
    const sorted = [...group].sort((a, b) => a.start - b.start)
    let currentOptions: Mc4eReadOptions[] = []
    let currentBlocks: Mc4eReadBlockItem[] = []
    let currentWordPoints = 0
    let currentBitPoints = 0

    const pushCurrent = () => {
      if (currentBlocks.length === 0 || currentOptions.length === 0) {
        return
      }
      const normalized = normalizeBlockReadItems(currentBlocks)
      const first = currentOptions[0]
      const totalLength = normalized.reduce((sum, block) => sum + block.length, 0)
      merged.push({
        ...first,
        blocks: normalized,
        start: normalized[0].start,
        length: totalLength,
      } as Mc4eBlockReadOptions)
    }

    for (const option of sorted) {
      const nextBlock: Mc4eReadBlockItem = {
        device: option.device,
        start: option.start,
        length: option.length,
      }
      const nextWordPoints = currentWordPoints + (isBitDevice(option.device) ? 0 : option.length)
      const nextBitPoints = currentBitPoints + (isBitDevice(option.device) ? option.length : 0)

      if (
        currentBlocks.length > 0 &&
        (currentBlocks.length >= MAX_BLOCKS_PER_REQUEST ||
          nextWordPoints > MAX_WORD_POINTS_PER_REQUEST ||
          nextBitPoints > MAX_BIT_POINTS_PER_REQUEST)
      ) {
        pushCurrent()
        currentOptions = []
        currentBlocks = []
        currentWordPoints = 0
        currentBitPoints = 0
      }

      currentOptions.push(option)
      currentBlocks.push(nextBlock)
      currentWordPoints += isBitDevice(option.device) ? 0 : option.length
      currentBitPoints += isBitDevice(option.device) ? option.length : 0
    }

    pushCurrent()
  }

  return merged
}

export function mergeSubscriptionRelations<
  T extends PacketFactory<Mc4eReadOptions, Mc4eWriteOptions>,
>(options: SubscriptionGroup<T>[]): SubscriptionRelation<T>[] {
  if (options.length === 0) {
    return []
  }

  const grouped = new Map<string, SubscriptionGroup<T>[]>()
  for (const option of options) {
    const readOption = option as unknown as Mc4eReadOptions
    const route = readOption.route ?? {}
    const key = [
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

  const relations: SubscriptionRelation<T>[] = []

  for (const [, group] of grouped) {
    const sorted = [...group].sort((a, b) => a.start - b.start)
    let currentSubscriptions: SubscriptionGroup<T>[] = []
    let currentBlocks: Mc4eReadBlockItem[] = []
    let currentWordPoints = 0
    let currentBitPoints = 0

    const pushCurrent = () => {
      if (currentSubscriptions.length === 0 || currentBlocks.length === 0) {
        return
      }

      const normalized = normalizeBlockReadItems(currentBlocks)
      const first = currentSubscriptions[0] as unknown as Mc4eReadOptions
      const totalLength = normalized.reduce((sum, block) => sum + block.length, 0)
      const range = {
        ...currentSubscriptions[0],
        device: normalized[0]?.device ?? first.device,
        start: normalized[0]?.start ?? first.start,
        length: totalLength,
        blocks: normalized,
      } as unknown as SubscriptionGroup<T>

      relations.push({
        range,
        subscriptions: currentSubscriptions,
      })
    }

    for (const option of sorted) {
      const readOption = option as unknown as Mc4eReadOptions
      const nextWordPoints =
        currentWordPoints + (isBitDevice(readOption.device) ? 0 : readOption.length)
      const nextBitPoints =
        currentBitPoints + (isBitDevice(readOption.device) ? readOption.length : 0)

      if (
        currentSubscriptions.length > 0 &&
        (currentSubscriptions.length >= MAX_BLOCKS_PER_REQUEST ||
          nextWordPoints > MAX_WORD_POINTS_PER_REQUEST ||
          nextBitPoints > MAX_BIT_POINTS_PER_REQUEST)
      ) {
        pushCurrent()
        currentSubscriptions = []
        currentBlocks = []
        currentWordPoints = 0
        currentBitPoints = 0
      }

      currentSubscriptions.push(option)
      currentBlocks.push({
        device: readOption.device,
        start: readOption.start,
        length: readOption.length,
      })
      currentWordPoints += isBitDevice(readOption.device) ? 0 : readOption.length
      currentBitPoints += isBitDevice(readOption.device) ? readOption.length : 0
    }

    pushCurrent()
  }

  return relations
}
