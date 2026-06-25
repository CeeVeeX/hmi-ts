import { describe, expect, it } from 'vitest'
import { RequestMethod, ResponseCode } from '@hmi-ts/core'
import { Mc3ePacketFactory, Mc3eSubHeader, type ReadWordOptions } from '../src/index'

function writeUInt16LE(buffer: Uint8Array, offset: number, value: number): void {
  buffer[offset] = value & 0xff
  buffer[offset + 1] = (value >> 8) & 0xff
}

describe('Mc3ePacketFactory', () => {
  const factory = new Mc3ePacketFactory()

  it('encodes MC 3E read request', () => {
    const options: ReadWordOptions = {
      unitId: 1,
      start: 100,
      length: 2,
      device: 'D',
    }

    const frame = factory.encodeRead(0, options)

    expect(frame[0]).toBe(0x00)
    expect(frame[1]).toBe(0x50)
    expect(frame[11]).toBe(0x01)
    expect(frame[12]).toBe(0x04)
    expect(frame[18]).toBe(0xa8)
    expect(frame[19]).toBe(0x02)
  })

  it('decodes MC 3E read response', () => {
    const options: ReadWordOptions = {
      unitId: 1,
      start: 100,
      length: 2,
      device: 'D',
    }

    const frame = new Uint8Array(15)
    writeUInt16LE(frame, 0, Mc3eSubHeader.RESPONSE)
    frame[2] = 0x00
    frame[3] = 0xff
    writeUInt16LE(frame, 4, 0x03ff)
    frame[6] = 0x01
    writeUInt16LE(frame, 7, 6)
    writeUInt16LE(frame, 9, 0)
    frame[11] = 0x34
    frame[12] = 0x12
    frame[13] = 0x78
    frame[14] = 0x56

    const result = factory.decodeResponse(options, frame)

    expect(result.code).toBe(ResponseCode.SUCCESS)
    expect(result.method).toBe(RequestMethod.READ)
    if (result.code === ResponseCode.SUCCESS && result.method === RequestMethod.READ) {
      expect(Array.from(result.data)).toEqual([0x34, 0x12, 0x78, 0x56])
      expect(result.byteCount).toBe(4)
    }
  })
})
