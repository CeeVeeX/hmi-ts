import { describe, expect, it } from 'vitest'
import { RequestMethod, ResponseCode } from '@hmi-ts/core'
import { ModbusRtuPacketFactory, ReadFn, wrapRtuFrame, type ReadOptions } from '../src/index'

describe('ModbusRtuPacketFactory', () => {
  const factory = new ModbusRtuPacketFactory()

  function createReadOptions(overrides: Partial<ReadOptions> = {}): ReadOptions {
    return {
      id: 0,
      fn: ReadFn.ReadHoldingRegisters,
      unitId: 1,
      start: 0,
      length: 2,
      frame: new Uint8Array(),
      timeout: 1000,
      priority: 0,
      startAt: 0,
      ...overrides,
    }
  }

  it('encodes RTU read frame with CRC', () => {
    const options = createReadOptions()

    const frame = factory.encodeRead(options)

    expect(frame[0]).toBe(0x01)
    expect(frame[1]).toBe(0x03)
    expect(frame[2]).toBe(0x00)
    expect(frame[3]).toBe(0x00)
    expect(frame[4]).toBe(0x00)
    expect(frame[5]).toBe(0x02)
    expect(frame.length).toBe(8)
  })

  it('decodes RTU read response', () => {
    const options = createReadOptions()

    const response = wrapRtuFrame(new Uint8Array([0x03, 0x04, 0x12, 0x34, 0x56, 0x78]), 1)
    const result = factory.decodeResponse(options, response)

    expect(result.code).toBe(ResponseCode.SUCCESS)
    expect(result.method).toBe(RequestMethod.READ)
    if (result.code === ResponseCode.SUCCESS && result.method === RequestMethod.READ) {
      expect(Array.from(result.data)).toEqual([0x12, 0x34, 0x56, 0x78])
      expect(result.byteCount).toBe(4)
    }
  })
})
