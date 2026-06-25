import { describe, expect, it } from 'vitest'
import { RequestMethod, ResponseCode } from '@hmi-ts/core'
import { ModbusAsciiPacketFactory, ReadFn, type ReadOptions } from '../src/index'

function lrc(bytes: Uint8Array): number {
  let sum = 0
  for (let i = 0; i < bytes.length; i += 1) {
    sum = (sum + bytes[i]) & 0xff
  }
  return (-sum & 0xff) >>> 0
}

function toAsciiFrame(payload: Uint8Array): Uint8Array {
  const body = new Uint8Array(payload.length + 1)
  body.set(payload, 0)
  body[payload.length] = lrc(payload)
  const hex = Array.from(body)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join('')
  return new TextEncoder().encode(`:${hex}\r\n`)
}

describe('ModbusAsciiPacketFactory', () => {
  const factory = new ModbusAsciiPacketFactory()

  it('encodes ASCII read frame', () => {
    const options: ReadOptions = {
      fn: ReadFn.ReadHoldingRegisters,
      unitId: 1,
      start: 0,
      length: 2,
    }

    const frame = factory.encodeRead(0, options)
    const text = new TextDecoder().decode(frame)

    expect(text.startsWith(':')).toBe(true)
    expect(text.endsWith('\r\n')).toBe(true)
    expect(text.includes('010300000002')).toBe(true)
  })

  it('decodes ASCII read response', () => {
    const options: ReadOptions = {
      fn: ReadFn.ReadHoldingRegisters,
      unitId: 1,
      start: 0,
      length: 2,
    }

    const response = toAsciiFrame(new Uint8Array([0x01, 0x03, 0x04, 0x12, 0x34, 0x56, 0x78]))
    const result = factory.decodeResponse(options, response)

    expect(result.code).toBe(ResponseCode.SUCCESS)
    expect(result.method).toBe(RequestMethod.READ)
    if (result.code === ResponseCode.SUCCESS && result.method === RequestMethod.READ) {
      expect(Array.from(result.data)).toEqual([0x12, 0x34, 0x56, 0x78])
      expect(result.byteCount).toBe(4)
    }
  })
})
