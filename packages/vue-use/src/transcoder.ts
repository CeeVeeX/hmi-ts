import {
  decodeBoolean,
  encodeBoolean,
  decodeBits,
  encodeBits,
  decodeUint16,
  encodeUint16,
  decodeUint32,
  encodeUint32,
  decodeInt16,
  encodeInt16,
  decodeInt32,
  encodeInt32,
  decodeFloat32,
  encodeFloat32,
  decodeFloat64,
  encodeFloat64,
  decodeUint16Array,
  encodeUint16Array,
  decodeAscii,
  encodeAscii,
} from '@hmi-ts/codec'

export interface ITranscoder<T> {
  decode: (bytes: Uint8Array) => T
  encode: (value: T) => Uint8Array
}

export class BooleanTranscoder implements ITranscoder<boolean> {
  decode(bytes: Uint8Array): boolean {
    return decodeBoolean(bytes)
  }

  encode(value: boolean): Uint8Array {
    return encodeBoolean(value)
  }
}

export class BitsTranscoder implements ITranscoder<(0 | 1)[]> {
  constructor(
    private maxBits?: number,
    private order: 'lsb' | 'msb' = 'lsb',
  ) {}

  decode(bytes: Uint8Array): (0 | 1)[] {
    return decodeBits(bytes, this.maxBits, this.order)
  }

  encode(value: (0 | 1)[]): Uint8Array {
    return encodeBits(value, this.order, this.maxBits)
  }
}

export class Uint16Transcoder implements ITranscoder<number> {
  decode(bytes: Uint8Array): number {
    return decodeUint16(bytes)
  }

  encode(value: number): Uint8Array {
    return encodeUint16(value)
  }
}

export class Int16Transcoder implements ITranscoder<number> {
  decode(bytes: Uint8Array): number {
    return decodeInt16(bytes)
  }

  encode(value: number): Uint8Array {
    return encodeInt16(value)
  }
}

export class Uint32Transcoder implements ITranscoder<number> {
  decode(bytes: Uint8Array): number {
    return decodeUint32(bytes)
  }

  encode(value: number): Uint8Array {
    return encodeUint32(value)
  }
}

export class Int32Transcoder implements ITranscoder<number> {
  decode(bytes: Uint8Array): number {
    return decodeInt32(bytes)
  }

  encode(value: number): Uint8Array {
    return encodeInt32(value)
  }
}

export class Float32Transcoder implements ITranscoder<number> {
  decode(bytes: Uint8Array): number {
    return decodeFloat32(bytes)
  }

  encode(value: number): Uint8Array {
    return encodeFloat32(value)
  }
}

export class Float64Transcoder implements ITranscoder<number> {
  decode(bytes: Uint8Array): number {
    return decodeFloat64(bytes)
  }

  encode(value: number): Uint8Array {
    return encodeFloat64(value)
  }
}

export class Uint16ArrayTranscoder implements ITranscoder<number[]> {
  decode(bytes: Uint8Array): number[] {
    return decodeUint16Array(bytes)
  }

  encode(value: number[]): Uint8Array {
    return encodeUint16Array(value)
  }
}

export class AsciiTranscoder implements ITranscoder<string> {
  decode(bytes: Uint8Array): string {
    return decodeAscii(bytes)
  }

  encode(value: string): Uint8Array {
    return encodeAscii(value)
  }
}
