import { describe, expect, it } from 'vitest'
import { RequestMethod, ResponseCode } from '@hmi-ts/core'
import {
  Mc4eCommand,
  Mc4eDeviceCode,
  Mc4ePacketFactory,
  Mc4eSubCommand,
  Mc4eSubHeader,
  type ReadBitOptions,
  type ReadWordOptions,
  type WriteWordOptions,
} from '../src/index'

function writeUInt16LE(buffer: Uint8Array, offset: number, value: number): void {
  buffer[offset] = value & 0xff
  buffer[offset + 1] = (value >> 8) & 0xff
}

describe('Mc4ePacketFactory', () => {
  const factory = new Mc4ePacketFactory()

  function createReadWordOptions(overrides: Partial<ReadWordOptions> = {}): ReadWordOptions {
    return {
      id: 0x1234,
      unitId: 1,
      start: 100,
      length: 3,
      device: 'D',
      frame: new Uint8Array(),
      timeout: 1000,
      priority: 0,
      startAt: 0,
      ...overrides,
    }
  }

  function createReadBitOptions(overrides: Partial<ReadBitOptions> = {}): ReadBitOptions {
    return {
      id: 0x1234,
      unitId: 1,
      start: 0,
      length: 10,
      device: 'M',
      frame: new Uint8Array(),
      timeout: 1000,
      priority: 0,
      startAt: 0,
      ...overrides,
    }
  }

  function createWriteWordOptions(overrides: Partial<WriteWordOptions> = {}): WriteWordOptions {
    return {
      id: 0x0021,
      unitId: 1,
      start: 200,
      value: Uint8Array.from([0x34, 0x12, 0x78, 0x56]),
      device: 'D',
      frame: new Uint8Array(),
      timeout: 1000,
      priority: 0,
      startAt: 0,
      ...overrides,
    }
  }

  it('encodes read request frame for D words', () => {
    const opt = createReadWordOptions()

    const frame = factory.encodeRead(opt)

    expect(frame[0]).toBe(0x54)
    expect(frame[1]).toBe(0x00)
    expect(frame[2]).toBe(0x34)
    expect(frame[3]).toBe(0x12)
    expect(frame[15]).toBe(Mc4eCommand.BATCH_READ & 0xff)
    expect(frame[16]).toBe((Mc4eCommand.BATCH_READ >> 8) & 0xff)
    expect(frame[17]).toBe(Mc4eSubCommand.WORD & 0xff)
    expect(frame[18]).toBe((Mc4eSubCommand.WORD >> 8) & 0xff)
    expect(frame[22]).toBe(Mc4eDeviceCode.D)
    expect(frame[23]).toBe(0x03)
    expect(frame[24]).toBe(0x00)
  })

  it('encodes write request frame for D words', () => {
    const opt = createWriteWordOptions()

    const frame = factory.encodeWrite(opt)

    expect(frame[0]).toBe(0x54)
    expect(frame[2]).toBe(0x21)
    expect(frame[15]).toBe(Mc4eCommand.BATCH_WRITE & 0xff)
    expect(frame[17]).toBe(Mc4eSubCommand.WORD & 0xff)
    expect(frame[23]).toBe(0x02)
    expect(frame[24]).toBe(0x00)
    expect(frame[25]).toBe(0x34)
    expect(frame[26]).toBe(0x12)
    expect(frame[27]).toBe(0x78)
    expect(frame[28]).toBe(0x56)
  })

  it('decodes read success response', () => {
    const opt = createReadWordOptions({ length: 2 })

    const frame = new Uint8Array(19)
    writeUInt16LE(frame, 0, Mc4eSubHeader.RESPONSE)
    writeUInt16LE(frame, 2, 0x1234)
    frame[6] = 0
    frame[7] = 0xff
    writeUInt16LE(frame, 8, 0x03ff)
    frame[10] = 1
    writeUInt16LE(frame, 11, 6)
    writeUInt16LE(frame, 13, 0)
    frame[15] = 0x34
    frame[16] = 0x12
    frame[17] = 0x78
    frame[18] = 0x56

    const rsp = factory.decodeResponse(opt, frame)

    expect(rsp.code).toBe(ResponseCode.SUCCESS)
    expect(rsp.method).toBe(RequestMethod.READ)
    if (rsp.code === ResponseCode.SUCCESS && rsp.method === RequestMethod.READ) {
      expect(Array.from(rsp.data)).toEqual([0x34, 0x12, 0x78, 0x56])
      expect(rsp.byteCount).toBe(4)
    }
  })

  it('maps non-zero end code to error response', () => {
    const opt = createReadWordOptions({ start: 0, length: 1 })

    const frame = new Uint8Array(15)
    writeUInt16LE(frame, 0, Mc4eSubHeader.RESPONSE)
    writeUInt16LE(frame, 2, 0x0001)
    frame[6] = 0
    frame[7] = 0xff
    writeUInt16LE(frame, 8, 0x03ff)
    frame[10] = 1
    writeUInt16LE(frame, 11, 2)
    writeUInt16LE(frame, 13, 0xc051)

    const rsp = factory.decodeResponse(opt, frame)
    expect(rsp.code).toBe(ResponseCode.ADDR_INVALID)
  })

  it('rejects response when 4E fixed field is not 0000H', () => {
    const opt = createReadWordOptions({ start: 0, length: 1 })

    const frame = new Uint8Array(15)
    writeUInt16LE(frame, 0, Mc4eSubHeader.RESPONSE)
    writeUInt16LE(frame, 2, 0x0001)
    writeUInt16LE(frame, 4, 0x0001)
    frame[6] = 0
    frame[7] = 0xff
    writeUInt16LE(frame, 8, 0x03ff)
    frame[10] = 1
    writeUInt16LE(frame, 11, 2)
    writeUInt16LE(frame, 13, 0x0000)

    const rsp = factory.decodeResponse(opt, frame)
    expect(rsp.code).toBe(ResponseCode.RESPONSE_INVALID)
  })

  it('returns RESPONSE_INVALID for too-short frame without throwing', () => {
    const opt = createReadWordOptions({ start: 0, length: 1 })

    const rsp = factory.decodeResponse(opt, new Uint8Array([0xd4, 0x00, 0x34]))
    expect(rsp.code).toBe(ResponseCode.RESPONSE_INVALID)
    expect(rsp.transactionId).toBe(0)
  })

  it('mergeRead should aggressively merge same device ranges within point limit', () => {
    const reqs: ReadWordOptions[] = [
      createReadWordOptions({ start: 0, length: 1 }),
      createReadWordOptions({ start: 100, length: 2 }),
      createReadWordOptions({ start: 300, length: 5 }),
    ]

    const merged = factory.mergeRead(reqs) as ReadWordOptions[]
    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({ unitId: 1, device: 'D', start: 0, length: 305 })
  })

  it('mergeRead should split when word point limit is exceeded', () => {
    const reqs: ReadWordOptions[] = [
      createReadWordOptions({ start: 0, length: 100 }),
      createReadWordOptions({ start: 950, length: 20 }),
    ]

    const merged = factory.mergeRead(reqs) as ReadWordOptions[]
    expect(merged).toHaveLength(2)
    expect(merged[0]).toMatchObject({ unitId: 1, device: 'D', start: 0, length: 100 })
    expect(merged[1]).toMatchObject({ unitId: 1, device: 'D', start: 950, length: 20 })
  })

  it('mergeRead should keep bit and word device groups separated', () => {
    const reqs: Array<ReadWordOptions | ReadBitOptions> = [
      createReadWordOptions({ start: 0, length: 10 }),
      createReadBitOptions({ start: 0, length: 10 }),
    ]

    const merged = factory.mergeRead(reqs)
    expect(merged).toHaveLength(2)
  })
})
