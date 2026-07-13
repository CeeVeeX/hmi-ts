/**
 * 字节序调整选项。
 *
 * @example
 * ```ts
 * const options: SwapOptions = { byteSwap: true, wordSwap: false }
 * ```
 */
export interface SwapOptions {
  byteSwap?: boolean
  wordSwap?: boolean
}

/**
 * ASCII 字符串编码选项。
 *
 * @example
 * ```ts
 * const options: AsciiStringEncodeOptions = { padByte: 0x20, asciiOnly: true }
 * ```
 */
export interface AsciiStringEncodeOptions {
  padByte?: number
  asciiOnly?: boolean
  /**
   * 固定输出的字数量。如果字符串占用的字少于该值，剩余字用 padByte 填充。
   * 如果未设置或小于实际需要的字数，则按实际需要返回（除非启用 truncate）。
   *
   * @example
   * ```ts
   * // "TEXT" 占用 2 个字，但指定长度为 10，返回 10 个字（后 8 个为 0）
   * encodeAsciiBytes('TEXT', { length: 10 })
   * // 返回: [0x5445, 0x5854, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000]
   * ```
   */
  length?: number
  /**
   * 当字符串长度超过指定的 length 时，是否截断字符串。
   * - false（默认）：忽略 length 限制，返回完整字符串
   * - true：截断字符串以适配 length 限制
   *
   * @example
   * ```ts
   * // 不截断（默认行为）
   * encodeAsciiBytes('ABCDEFGHIJ', { length: 3 })
   * // 返回: [0x4142, 0x4344, 0x4546, 0x4748, 0x494a] (5 个字)
   *
   * // 截断模式
   * encodeAsciiBytes('ABCDEFGHIJ', { length: 3, truncate: true })
   * // 返回: [0x4142, 0x4344, 0x4546] (只保留前 6 个字符 'ABCDEF')
   * ```
   */
  truncate?: boolean
}

/**
 * ASCII 字解码选项。
 *
 * @example
 * ```ts
 * const options: AsciiStringDecodeOptions = { trimTrailingNull: true }
 * ```
 */
export interface AsciiStringDecodeOptions {
  asciiOnly?: boolean
  trimTrailingNull?: boolean
}

/**
 * 位顺序类型，用于指定位的排列顺序。
 * - 'lsb'：最低有效位在前（默认）。
 * - 'msb'：最高有效位在前。
 */
export type BitOrder = 'lsb' | 'msb'

function ensureByte(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new RangeError(`${field} must be an integer in range 0..255`)
  }
}

function applySwaps(bytes: Uint8Array, options: SwapOptions = {}): Uint8Array {
  const out = bytes.slice()

  if (options.byteSwap) {
    for (let i = 0; i + 1 < out.length; i += 2) {
      const a = out[i]
      out[i] = out[i + 1]
      out[i + 1] = a
    }
  }

  if (options.wordSwap) {
    const words: Uint8Array[] = []
    for (let i = 0; i < out.length; i += 2) {
      words.push(out.slice(i, i + 2))
    }
    // wordSwap 用于兼容某些 PLC 以“字”为单位的反序存储。
    words.reverse()
    return Uint8Array.from(words.flatMap((word) => [...word]))
  }

  return out
}

function getPaddedBytes(bytes: Uint8Array, size: number): Uint8Array {
  const out = new Uint8Array(size)
  out.set(bytes.subarray(0, size))
  return out
}

function toRegisters(bytes: Uint8Array): number[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const out: number[] = []
  for (let i = 0; i < bytes.length; i += 2) {
    out.push(view.getUint16(i))
  }
  return out
}

function ensureUint16(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff) {
    throw new RangeError(`${field} must be an integer in range 0..65535`)
  }
}

function ensureInt16(value: number, field: string): void {
  if (!Number.isInteger(value) || value < -0x8000 || value > 0x7fff) {
    throw new RangeError(`${field} must be an integer in range -32768..32767`)
  }
}

function ensureUint32(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(`${field} must be an integer in range 0..4294967295`)
  }
}

function ensureInt32(value: number, field: string): void {
  if (!Number.isInteger(value) || value < -0x80000000 || value > 0x7fffffff) {
    throw new RangeError(`${field} must be an integer in range -2147483648..2147483647`)
  }
}

/**
 * Uint8Array 转 布尔
 */
export function decodeBoolean(bytes: Uint8Array): boolean {
  if (bytes.length === 0) {
    throw new RangeError('bytes must not be empty')
  }
  return bytes[0] !== 0
}

/**
 * 将布尔值编码为单字节（0x00/0x01）。
 */
export function encodeBoolean(value: boolean): Uint8Array {
  return Uint8Array.of(value ? 1 : 0)
}

/**
 * Uint8Array 转位数组。
 */
export function decodeBits(
  bytes: Uint8Array,
  maxBits?: number,
  order: BitOrder = 'lsb',
): (0 | 1)[] {
  if (maxBits !== undefined && (!Number.isInteger(maxBits) || maxBits < 0)) {
    throw new RangeError('maxBits must be a non-negative integer')
  }

  if (maxBits !== undefined) {
    const limited: (0 | 1)[] = []
    if (order === 'lsb') {
      for (let bitPos = 0; bitPos < maxBits; bitPos += 1) {
        const byteIndex = Math.floor(bitPos / 8)
        const bitIndex = bitPos % 8
        const byte = byteIndex < bytes.length ? bytes[byteIndex] : 0
        limited.push(((byte >> bitIndex) & 1) as 0 | 1)
      }
    } else {
      for (let bitPos = maxBits - 1; bitPos >= 0; bitPos -= 1) {
        const byteIndex = Math.floor(bitPos / 8)
        const bitIndex = bitPos % 8
        const byte = byteIndex < bytes.length ? bytes[byteIndex] : 0
        limited.push(((byte >> bitIndex) & 1) as 0 | 1)
      }
    }
    return limited
  }

  const bits: (0 | 1)[] = []

  for (const byte of bytes) {
    if (order === 'lsb') {
      for (let i = 0; i < 8; i += 1) {
        bits.push(((byte >> i) & 1) as 0 | 1)
      }
    } else {
      for (let i = 7; i >= 0; i -= 1) {
        bits.push(((byte >> i) & 1) as 0 | 1)
      }
    }
  }
  return bits
}

/**
 * 位列表编码为 Uint8Array（每个元素为 0/1）。
 */
export function encodeBits(
  value: boolean[] | number[],
  order: BitOrder = 'lsb',
  bitWidth?: number,
): Uint8Array {
  if (!Array.isArray(value)) {
    throw new TypeError('value must be an array')
  }

  const bits = value.map((item, index) => {
    if (typeof item === 'boolean') {
      return (item ? 1 : 0) as 0 | 1
    }
    if (typeof item === 'number' && Number.isInteger(item) && (item === 0 || item === 1)) {
      return item as 0 | 1
    }
    throw new RangeError(`bit value at index ${index} must be boolean or 0/1`)
  })

  if (bitWidth !== undefined && (!Number.isInteger(bitWidth) || bitWidth < 0)) {
    throw new RangeError('bitWidth must be a non-negative integer')
  }

  const width = bitWidth ?? bits.length
  if (bits.length > width) {
    throw new RangeError('bitWidth must be greater than or equal to value length')
  }

  const out = new Uint8Array(Math.ceil(width / 8))
  for (let i = 0; i < bits.length; i += 1) {
    let bitPos: number
    if (order === 'lsb') {
      bitPos = i
    } else if (bitWidth === undefined) {
      bitPos = Math.floor(i / 8) * 8 + (7 - (i % 8))
    } else {
      bitPos = width - 1 - i
    }
    const byteIndex = Math.floor(bitPos / 8)
    const bitIndex = bitPos % 8
    if (bits[i] === 1) {
      out[byteIndex] |= 1 << bitIndex
    }
  }

  return out
}

/**
 * 把首个字按无符号 16 位整数解码。
 *
 * @example
 * ```ts
 * decodeUint16(Uint8Array.of(0x12, 0x34)) // 4660
 * ```
 */
export function decodeUint16(bytes: Uint8Array): number {
  const input = getPaddedBytes(bytes, 2)
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength)
  return view.getUint16(0)
}

/**
 * 把首个字按无符号 16 位整数解码（小端）。
 */
export function decodeUint16LE(bytes: Uint8Array): number {
  const input = getPaddedBytes(bytes, 2)
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength)
  return view.getUint16(0, true)
}

/**
 * 将 Uint16 编码为 2 字节（大端）。
 */
export function encodeUint16(value: number): Uint8Array {
  ensureUint16(value, 'value')
  return Uint8Array.of((value >> 8) & 0xff, value & 0xff)
}

/**
 * 将 Uint16 编码为 2 字节（小端）。
 */
export function encodeUint16LE(value: number): Uint8Array {
  ensureUint16(value, 'value')
  return Uint8Array.of(value & 0xff, (value >> 8) & 0xff)
}

/**
 * 把首个字按有符号 16 位整数解码。
 *
 * @example
 * ```ts
 * decodeInt16(Uint8Array.of(0xff, 0xff)) // -1
 * ```
 */
export function decodeInt16(bytes: Uint8Array): number {
  const input = getPaddedBytes(bytes, 2)
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength)
  return view.getInt16(0)
}

/**
 * 把首个字按有符号 16 位整数解码（小端）。
 */
export function decodeInt16LE(bytes: Uint8Array): number {
  const input = getPaddedBytes(bytes, 2)
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength)
  return view.getInt16(0, true)
}

/**
 * 将 Int16 编码为 2 字节（大端）。
 */
export function encodeInt16(value: number): Uint8Array {
  ensureInt16(value, 'value')
  const out = new Uint8Array(2)
  const view = new DataView(out.buffer)
  view.setInt16(0, value)
  return out
}

/**
 * 将 Int16 编码为 2 字节（小端）。
 */
export function encodeInt16LE(value: number): Uint8Array {
  ensureInt16(value, 'value')
  const out = new Uint8Array(2)
  const view = new DataView(out.buffer)
  view.setInt16(0, value, true)
  return out
}

/**
 * 将两个字解码为无符号 32 位整数。
 *
 * @example
 * ```ts
 * decodeUint32(Uint8Array.of(0x12, 0x34, 0x56, 0x78)) // 0x12345678
 * ```
 */
export function decodeUint32(bytes: Uint8Array, options?: SwapOptions): number {
  const input = applySwaps(getPaddedBytes(bytes, 4), options)
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength)
  return view.getUint32(0)
}

/**
 * 将两个字解码为无符号 32 位整数（小端）。
 */
export function decodeUint32LE(bytes: Uint8Array, options?: SwapOptions): number {
  const input = applySwaps(getPaddedBytes(bytes, 4), options)
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength)
  return view.getUint32(0, true)
}

/**
 * 将 Uint32 编码为 4 字节。
 */
export function encodeUint32(value: number, options?: SwapOptions): Uint8Array {
  ensureUint32(value, 'value')
  const bytes = new Uint8Array(4)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, value)
  return applySwaps(bytes, options)
}

/**
 * 将 Uint32 编码为 4 字节（小端）。
 */
export function encodeUint32LE(value: number, options?: SwapOptions): Uint8Array {
  ensureUint32(value, 'value')
  const bytes = new Uint8Array(4)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, value, true)
  return applySwaps(bytes, options)
}

/**
 * 将两个字解码为有符号 32 位整数。
 *
 * @example
 * ```ts
 * decodeInt32(Uint8Array.of(0xff, 0xff, 0xff, 0xfe)) // -2
 * ```
 */
export function decodeInt32(bytes: Uint8Array, options?: SwapOptions): number {
  const input = applySwaps(getPaddedBytes(bytes, 4), options)
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength)
  return view.getInt32(0)
}

/**
 * 将两个字解码为有符号 32 位整数（小端）。
 */
export function decodeInt32LE(bytes: Uint8Array, options?: SwapOptions): number {
  const input = applySwaps(getPaddedBytes(bytes, 4), options)
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength)
  return view.getInt32(0, true)
}

/**
 * 将 Int32 编码为 4 字节。
 */
export function encodeInt32(value: number, options?: SwapOptions): Uint8Array {
  ensureInt32(value, 'value')
  const bytes = new Uint8Array(4)
  const view = new DataView(bytes.buffer)
  view.setInt32(0, value)
  return applySwaps(bytes, options)
}

/**
 * 将 Int32 编码为 4 字节（小端）。
 */
export function encodeInt32LE(value: number, options?: SwapOptions): Uint8Array {
  ensureInt32(value, 'value')
  const bytes = new Uint8Array(4)
  const view = new DataView(bytes.buffer)
  view.setInt32(0, value, true)
  return applySwaps(bytes, options)
}

/**
 * 将两个字解码为 Float32。
 *
 * @example
 * ```ts
 * const bytes = Uint8Array.of(0x41, 0x48, 0x00, 0x00)
 * const value = decodeFloat32(bytes)
 * ```
 */
export function decodeFloat32(bytes: Uint8Array, options?: SwapOptions): number {
  const input = applySwaps(getPaddedBytes(bytes, 4), options)
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength)
  return view.getFloat32(0)
}

/**
 * 将两个字解码为 Float32（小端）。
 */
export function decodeFloat32LE(bytes: Uint8Array, options?: SwapOptions): number {
  const input = applySwaps(getPaddedBytes(bytes, 4), options)
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength)
  return view.getFloat32(0, true)
}

/**
 * 将四个字解码为 Float64。
 *
 * @example
 * ```ts
 * const bytes = Uint8Array.of(0x40, 0x5e, 0xdd, 0x2f, 0x1a, 0x9f, 0xbe, 0x77)
 * const value = decodeFloat64(bytes)
 * ```
 */
export function decodeFloat64(bytes: Uint8Array, options?: SwapOptions): number {
  const input = applySwaps(getPaddedBytes(bytes, 8), options)
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength)
  return view.getFloat64(0)
}

/**
 * 将四个字解码为 Float64（小端）。
 */
export function decodeFloat64LE(bytes: Uint8Array, options?: SwapOptions): number {
  const input = applySwaps(getPaddedBytes(bytes, 8), options)
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength)
  return view.getFloat64(0, true)
}

/**
 * 把 Float32 编码为两个字。
 *
 * @example
 * ```ts
 * const regs = encodeFloat32(3.14, { wordSwap: true })
 * ```
 */
export function encodeFloat32(value: number, options?: SwapOptions): Uint8Array {
  const bytes = new Uint8Array(4)
  const view = new DataView(bytes.buffer)
  view.setFloat32(0, value)
  return applySwaps(bytes, options)
}

/**
 * 把 Float32 编码为两个字（小端）。
 */
export function encodeFloat32LE(value: number, options?: SwapOptions): Uint8Array {
  const bytes = new Uint8Array(4)
  const view = new DataView(bytes.buffer)
  view.setFloat32(0, value, true)
  return applySwaps(bytes, options)
}

/**
 * 把 Float64 编码为四个字。
 *
 * @example
 * ```ts
 * const regs = encodeFloat64(3.1415926)
 * ```
 */
export function encodeFloat64(value: number, options?: SwapOptions): Uint8Array {
  const bytes = new Uint8Array(8)
  const view = new DataView(bytes.buffer)
  view.setFloat64(0, value)
  return applySwaps(bytes, options)
}

/**
 * 把 Float64 编码为四个字（小端）。
 */
export function encodeFloat64LE(value: number, options?: SwapOptions): Uint8Array {
  const bytes = new Uint8Array(8)
  const view = new DataView(bytes.buffer)
  view.setFloat64(0, value, true)
  return applySwaps(bytes, options)
}

/**
 * 将 ASCII 字符串编码为字节数组（每 2 字节一组）。
 *
 * @example
 * ```ts
 * encodeAscii('HELLO', { padByte: 0x20 })
 * encodeAscii('TEXT', { length: 10 }) // 固定 10 个字，未使用的填充 0
 * encodeAscii('ABCDEFGHIJ', { length: 3, truncate: true }) // 截断为前 6 个字符
 * ```
 */
export function encodeAscii(value: string, options: AsciiStringEncodeOptions = {}): Uint8Array {
  const padByte = options.padByte ?? 0x00
  const asciiOnly = options.asciiOnly ?? true
  const fixedLength = options.length
  const truncate = options.truncate ?? false
  ensureByte(padByte, 'padByte')

  // 计算实际需要的字数量
  const requiredLength = Math.ceil(value.length / 2)

  // 确定最终输出的字数量
  let outputLength: number
  let truncatedValue: string = value

  if (fixedLength !== undefined) {
    if (truncate && requiredLength > fixedLength) {
      // 截断模式：限制输出长度并截断字符串
      outputLength = fixedLength
      const maxChars = fixedLength * 2
      truncatedValue = value.substring(0, maxChars)
    } else {
      // 默认模式：自动扩展以容纳完整字符串
      outputLength = Math.max(fixedLength, requiredLength)
    }
  } else {
    // 未指定 length，按实际需要返回
    outputLength = requiredLength
  }

  const out = new Uint8Array(outputLength * 2)
  let offset = 0

  // 编码字符串字符到字
  for (let i = 0; i < truncatedValue.length; i += 2) {
    const hi = truncatedValue.charCodeAt(i)
    if (asciiOnly && hi > 0x7f) {
      throw new RangeError(`non-ASCII character at index ${i}`)
    }
    ensureByte(hi, `charCodeAt(${i})`)

    let lo = padByte
    if (i + 1 < truncatedValue.length) {
      lo = truncatedValue.charCodeAt(i + 1)
      if (asciiOnly && lo > 0x7f) {
        throw new RangeError(`non-ASCII character at index ${i + 1}`)
      }
      ensureByte(lo, `charCodeAt(${i + 1})`)
    }

    out[offset++] = hi
    out[offset++] = lo
  }

  // 如果指定了固定长度，用 padByte 填充剩余字节
  while (offset < out.length) {
    out[offset++] = padByte
  }

  return out
}

/**
 * 将 Uint16 数组编码为连续字节数组（大端）。
 */
export function encodeUint16Array(values: number[]): Uint8Array {
  const out = new Uint8Array(values.length * 2)
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i]
    ensureUint16(value, `values[${i}]`)
    out[i * 2] = (value >> 8) & 0xff
    out[i * 2 + 1] = value & 0xff
  }
  return out
}

/**
 * 将连续字节数组按 Uint16（大端）解码为数组。
 */
export function decodeUint16Array(bytes: Uint8Array): number[] {
  const padded = bytes.length % 2 === 0 ? bytes : getPaddedBytes(bytes, bytes.length + 1)
  return toRegisters(padded)
}

/**
 * 将字数组解码为 ASCII 字符串。
 *
 * @example
 * ```ts
 * decodeAscii(Uint8Array.of(0x48, 0x45, 0x4c, 0x4c, 0x4f, 0x00)) // 'HELLO'
 * ```
 */
export function decodeAscii(bytes: Uint8Array, options: AsciiStringDecodeOptions = {}): string {
  const asciiOnly = options.asciiOnly ?? true
  const trimTrailingNull = options.trimTrailingNull ?? true

  let end = bytes.length
  if (trimTrailingNull) {
    while (end > 0 && bytes[end - 1] === 0x00) {
      end -= 1
    }
  }

  let out = ''
  for (let i = 0; i < end; i++) {
    const byte = bytes[i]
    if (asciiOnly && byte > 0x7f) {
      throw new RangeError(`non-ASCII byte at index ${i}`)
    }
    out += String.fromCharCode(byte)
  }

  return out
}

/**
 * 将 Uint8Array 转换为十六进制字符串。
 * @param arr 要转换的 Uint8Array
 * @param separator 可选的分隔符，默认为空格
 * @returns 转换后的十六进制字符串
 */
export function uint8ToHex(arr: Uint8Array | number[], separator?: string): string {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(separator ?? ' ')
}
