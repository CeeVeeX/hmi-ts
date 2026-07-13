import { describe, expect, it } from 'vitest'
import {
  decodeBoolean,
  encodeBoolean,
  decodeBits,
  encodeBits,
  decodeUint16,
  encodeUint16,
  decodeUint32,
  encodeUint32,
  decodeFloat32,
  encodeFloat32,
  decodeFloat64,
  encodeFloat64,
  decodeAscii,
  encodeAscii,
  decodeUint16LE,
  encodeUint16LE,
} from '../src/index'
import * as bigEndian from '../src/big-endian'
import * as littleEndian from '../src/little-endian'

describe('Codec', () => {
  it('should encode and decode boolean', () => {
    const value = true
    const encoded = encodeBoolean(value)
    const decoded = decodeBoolean(encoded)
    expect(decoded).toBe(value)
  })

  it('should encode and decode bits', () => {
    const value = [true, false, true, true, false, false, true, false]
    const encoded = encodeBits(value)
    const decoded = decodeBits(encoded, value.length)
    expect(encoded).toEqual(Uint8Array.of(0x4d))
    expect(decoded).toEqual([1, 0, 1, 1, 0, 0, 1, 0])
  })

  it('should encode and decode bits with msb order', () => {
    const value = [1, 0, 1, 1, 0, 0, 1, 0]
    const encoded = encodeBits(value, 'msb')
    const decoded = decodeBits(encoded, value.length, 'msb')
    expect(encoded).toEqual(Uint8Array.of(0xb2))
    expect(decoded).toEqual(value)
  })

  it('should decode and encode bits with msb order and limited width', () => {
    expect(decodeBits(Uint8Array.of(0b00000010), 2, 'msb')).toEqual([1, 0])
    expect(encodeBits([1, 0], 'msb', 2)).toEqual(Uint8Array.of(0b00000010))
  })

  it('should encode and decode uint16', () => {
    const value = 65535
    const encoded = encodeUint16(value)
    const decoded = decodeUint16(encoded)
    expect(decoded).toBe(value)
  })

  it('should encode and decode uint16 in little-endian', () => {
    const value = 100
    const encoded = encodeUint16LE(value)
    const decoded = decodeUint16LE(encoded)
    expect(Array.from(encoded)).toEqual([0x64, 0x00])
    expect(decoded).toBe(value)
  })

  it('should provide endian module aliases', () => {
    expect(bigEndian.decodeUint16(Uint8Array.of(0x00, 0x64))).toBe(100)
    expect(littleEndian.decodeUint16(Uint8Array.of(0x64, 0x00))).toBe(100)
  })

  it('should encode and decode uint32', () => {
    const value = 4294967295
    const encoded = encodeUint32(value)
    const decoded = decodeUint32(encoded)
    expect(decoded).toBe(value)
  })

  it('should encode and decode float32', () => {
    const value = 3.14
    const encoded = encodeFloat32(value)
    const decoded = decodeFloat32(encoded)
    expect(decoded).toBeCloseTo(value, 5)
  })

  it('should encode and decode float64', () => {
    const value = 3.141592653589793
    const encoded = encodeFloat64(value)
    const decoded = decodeFloat64(encoded)
    expect(decoded).toBeCloseTo(value, 10)
  })

  it('should encode and decode ascii string', () => {
    const value = 'Hello, World!'
    const encoded = encodeAscii(value)
    const decoded = decodeAscii(encoded)
    expect(decoded).toBe(value)
  })
})
