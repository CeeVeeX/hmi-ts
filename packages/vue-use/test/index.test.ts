import { describe, expect, it, vi } from 'vitest'
import { ResponseCode } from '@hmi-ts/core'
import {
  useDataRef,
  BooleanTranscoder,
  BitsTranscoder,
  Uint16Transcoder,
  Int16Transcoder,
  Uint32Transcoder,
  Int32Transcoder,
  Float32Transcoder,
  Float64Transcoder,
  Uint16ArrayTranscoder,
  AsciiTranscoder,
} from '../src/index'

describe('Transcoder', () => {
  it('BooleanTranscoder', () => {
    const transcoder = new BooleanTranscoder()
    expect(transcoder.decode(new Uint8Array([0x00]))).toBe(false)
    expect(transcoder.decode(new Uint8Array([0x01]))).toBe(true)
    expect(transcoder.encode(false)).toEqual(new Uint8Array([0x00]))
    expect(transcoder.encode(true)).toEqual(new Uint8Array([0x01]))
  })

  it('BitsTranscoder', () => {
    const transcoder = new BitsTranscoder(2, 'msb')
    const transcoder2 = new BitsTranscoder(2, 'lsb')

    expect(transcoder.decode(new Uint8Array([0b10]))).toEqual([1, 0])
    expect(transcoder.encode([1, 0])).toEqual(new Uint8Array([0b10]))

    expect(transcoder2.decode(new Uint8Array([0b10]))).toEqual([0, 1])
    expect(transcoder2.encode([0, 1])).toEqual(new Uint8Array([0b10]))
  })

  it('Uint16Transcoder', () => {
    const transcoder = new Uint16Transcoder()
    expect(transcoder.decode(new Uint8Array([0x01, 0x02]))).toBe(258)
    expect(transcoder.encode(258)).toEqual(new Uint8Array([0x01, 0x02]))
  })

  it('Int16Transcoder', () => {
    const transcoder = new Int16Transcoder()
    expect(transcoder.decode(new Uint8Array([0xff, 0xfe]))).toBe(-2)
    expect(transcoder.encode(-2)).toEqual(new Uint8Array([0xff, 0xfe]))
  })

  it('Uint32Transcoder', () => {
    const transcoder = new Uint32Transcoder()
    expect(transcoder.decode(new Uint8Array([0x01, 0x02, 0x03, 0x04]))).toBe(16909060)
    expect(transcoder.encode(16909060)).toEqual(new Uint8Array([0x01, 0x02, 0x03, 0x04]))
  })

  it('Int32Transcoder', () => {
    const transcoder = new Int32Transcoder()
    expect(transcoder.decode(new Uint8Array([0xff, 0xff, 0xff, 0xfe]))).toBe(-2)
    expect(transcoder.encode(-2)).toEqual(new Uint8Array([0xff, 0xff, 0xff, 0xfe]))
  })

  it('Float32Transcoder', () => {
    const transcoder = new Float32Transcoder()
    expect(transcoder.decode(new Uint8Array([0x3f, 0x80, 0x00, 0x00]))).toBeCloseTo(1.0)
    expect(transcoder.encode(1.0)).toEqual(new Uint8Array([0x3f, 0x80, 0x00, 0x00]))
  })

  it('Float64Transcoder', () => {
    const transcoder = new Float64Transcoder()
    expect(
      transcoder.decode(new Uint8Array([0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])),
    ).toBeCloseTo(1.0)
    expect(transcoder.encode(1.0)).toEqual(
      new Uint8Array([0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]),
    )
  })

  it('Uint16ArrayTranscoder', () => {
    const transcoder = new Uint16ArrayTranscoder()
    expect(transcoder.decode(new Uint8Array([0x01, 0x02, 0x03, 0x04]))).toEqual([258, 772])
    expect(transcoder.encode([258, 772])).toEqual(new Uint8Array([0x01, 0x02, 0x03, 0x04]))
  })

  it('AsciiTranscoder', () => {
    const transcoder = new AsciiTranscoder()
    expect(transcoder.decode(new Uint8Array([0x48, 0x45, 0x4c, 0x4c, 0x4f]))).toBe('HELLO')
    expect(transcoder.encode('HELLO')).toEqual(new Uint8Array([0x48, 0x45, 0x4c, 0x4c, 0x4f, 0x00]))
  })

  it('useDataRef should not re-apply same value from subscribe callback', () => {
    let onData: ((data: { code: ResponseCode; data: Uint8Array }) => void) | undefined
    const write = vi.fn()

    const client = {
      subscribe: vi.fn(
        (opts: { callback: (data: { code: ResponseCode; data: Uint8Array }) => void }) => {
          onData = opts.callback
          return () => {}
        },
      ),
      write,
    }

    const dataRef = useDataRef({
      client: client as never,
      getOptions: {} as never,
      setOptions: {} as never,
      transcoder: new Uint16Transcoder(),
      value: 0,
    })

    dataRef.value = 2
    expect(write).toHaveBeenCalledTimes(1)

    onData?.({ code: ResponseCode.SUCCESS, data: new Uint8Array([0x00, 0x02]) })
    expect(dataRef.value).toBe(2)
    expect(write).toHaveBeenCalledTimes(1)
  })

  it('useDataRef should skip write for array values with same content', () => {
    const write = vi.fn()

    const client = {
      subscribe: vi.fn(() => () => {}),
      write,
    }

    const dataRef = useDataRef({
      client: client as never,
      getOptions: {} as never,
      setOptions: {} as never,
      transcoder: new BitsTranscoder(2, 'msb'),
      value: [1, 0] as (0 | 1)[],
    })

    dataRef.value = [1, 0]
    expect(write).toHaveBeenCalledTimes(0)

    dataRef.value = [0, 1]
    expect(write).toHaveBeenCalledTimes(1)
  })
})
