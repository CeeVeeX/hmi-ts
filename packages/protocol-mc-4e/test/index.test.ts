import { describe, expect, it } from 'vitest'
import { RequestMethod, ResponseCode } from '@hmi-ts/core'
import {
  Mc4eCommand,
  Mc4eDeviceCode,
  Mc4ePacketFactory,
  Mc4eSubCommand,
  Mc4eSubHeader,
  type ReadWordOptions,
  type WriteWordOptions,
} from '../src/index'

function writeUInt16LE(buffer: Uint8Array, offset: number, value: number): void {
  buffer[offset] = value & 0xff
  buffer[offset + 1] = (value >> 8) & 0xff
}

describe('Mc4ePacketFactory', () => {
  const factory = new Mc4ePacketFactory()

  it('encodes read request frame for D words', () => {
    const opt: ReadWordOptions = {
      unitId: 1,
      start: 100,
      length: 3,
      device: 'D',
    }

    const frame = factory.encodeRead(0x1234, opt)

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
    const opt: WriteWordOptions = {
      unitId: 1,
      start: 200,
      value: [0x1234, 0x5678],
      device: 'D',
    }

    const frame = factory.encodeWrite(0x0021, opt)

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
    const opt: ReadWordOptions = {
      unitId: 1,
      start: 100,
      length: 2,
      device: 'D',
    }

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
    const opt: ReadWordOptions = {
      unitId: 1,
      start: 0,
      length: 1,
      device: 'D',
    }

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
})
