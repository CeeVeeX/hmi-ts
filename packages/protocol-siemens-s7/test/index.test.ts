import { describe, expect, it } from 'vitest'
import { RequestMethod, ResponseCode } from '@hmi-ts/core'
import { S7Area, SiemensS7PacketFactory, type ReadOptions, type WriteOptions } from '../src/index'

function writeUInt16BE(buffer: Uint8Array, offset: number, value: number): void {
  buffer[offset] = (value >> 8) & 0xff
  buffer[offset + 1] = value & 0xff
}

function wrapS7AckData(pduReference: number, parameter: Uint8Array, data: Uint8Array): Uint8Array {
  const totalLength = 4 + 3 + 10 + parameter.length + data.length
  const frame = new Uint8Array(totalLength)

  frame[0] = 0x03
  frame[1] = 0x00
  writeUInt16BE(frame, 2, totalLength)

  frame[4] = 0x02
  frame[5] = 0xf0
  frame[6] = 0x80

  frame[7] = 0x32
  frame[8] = 0x03
  frame[9] = 0x00
  frame[10] = 0x00
  writeUInt16BE(frame, 11, pduReference)
  writeUInt16BE(frame, 13, parameter.length)
  writeUInt16BE(frame, 15, data.length)

  frame.set(parameter, 17)
  frame.set(data, 17 + parameter.length)

  return frame
}

describe('SiemensS7PacketFactory', () => {
  const factory = new SiemensS7PacketFactory()

  it('encodes S7 ReadVar request', () => {
    const options: ReadOptions = {
      unitId: 1,
      area: S7Area.DB,
      dbNumber: 1,
      start: 10,
      length: 4,
    }

    const frame = factory.encodeRead(0x1234, options)

    expect(frame[0]).toBe(0x03)
    expect(frame[1]).toBe(0x00)
    expect(frame[7]).toBe(0x32)
    expect(frame[8]).toBe(0x01)
    expect(frame[11]).toBe(0x12)
    expect(frame[12]).toBe(0x34)
    expect(frame[17]).toBe(0x04)
    expect(frame[18]).toBe(0x01)
    expect(frame[27]).toBe(0x84)
  })

  it('decodes S7 ReadVar response', () => {
    const options: ReadOptions = {
      unitId: 1,
      area: S7Area.DB,
      dbNumber: 1,
      start: 0,
      length: 2,
    }

    const parameter = new Uint8Array([0x04, 0x01])
    const data = new Uint8Array([0xff, 0x04, 0x00, 0x10, 0x12, 0x34])
    const frame = wrapS7AckData(0x33, parameter, data)

    const response = factory.decodeResponse(options, frame)

    expect(response.code).toBe(ResponseCode.SUCCESS)
    expect(response.method).toBe(RequestMethod.READ)
    if (response.code === ResponseCode.SUCCESS && response.method === RequestMethod.READ) {
      expect(Array.from(response.data)).toEqual([0x12, 0x34])
      expect(response.byteCount).toBe(2)
      expect(response.transactionId).toBe(0x33)
    }
  })

  it('encodes and decodes S7 WriteVar path', () => {
    const options: WriteOptions = {
      unitId: 1,
      area: S7Area.DB,
      dbNumber: 1,
      start: 0,
      value: [0x12, 0x34],
    }

    const request = factory.encodeWrite(0x66, options)
    expect(request[17]).toBe(0x05)
    expect(request[18]).toBe(0x01)

    const responseFrame = wrapS7AckData(0x66, new Uint8Array([0x05, 0x01]), new Uint8Array([0xff]))
    const response = factory.decodeResponse(options, responseFrame)

    expect(response.code).toBe(ResponseCode.SUCCESS)
    expect(response.method).toBe(RequestMethod.WRITE)
    expect(response.transactionId).toBe(0x66)
  })
})
