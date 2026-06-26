import {
  type PacketFactory,
  ResponseCode,
  type IResponse,
  RequestMethod,
  type IRowResponse,
  type SubscriptionGroup,
  type SubscriptionRelation,
} from '@hmi-ts/core'
import {
  createReadRtuFrame,
  encodeWriteRtuFrame,
  getMethodByFnCode,
  parseModbusRtuResponse,
} from './codec'
import {
  ModbusExceptionToResponseCode,
  ReadFn,
  WriteFn,
  type ReadOptions,
  type WriteOptions,
} from './type'

export { ReadFn, WriteFn, type ReadOptions, type WriteOptions }
export * from './type'
export * from './codec'

export class ModbusRtuPacketFactory implements PacketFactory {
  readonly isSerial = true

  getTransactionId(sequence: number): number
  getTransactionId(_response: Uint8Array): number
  getTransactionId(sequence: number | Uint8Array): number {
    if (sequence instanceof Uint8Array) {
      return 0
    }

    return sequence & 0xffff
  }

  encodeRead(_transactionId: number, options: ReadOptions): Uint8Array {
    return createReadRtuFrame(options)
  }

  encodeWrite(_transactionId: number, options: WriteOptions): Uint8Array {
    return encodeWriteRtuFrame(options)
  }

  mergeRead(options: ReadOptions[]): ReadOptions[] {
    if (!options || options.length === 0) {
      return []
    }

    const grouped = new Map<string, ReadOptions[]>()
    for (const opt of options) {
      const unitId = opt.unitId ?? 1
      const key = `${unitId}:${opt.fn}`
      const list = grouped.get(key) ?? []
      list.push(opt)
      grouped.set(key, list)
    }

    const merged: ReadOptions[] = []
    for (const [, group] of grouped) {
      const sorted = [...group].sort((a, b) => a.start - b.start)
      let current = { ...sorted[0] }

      for (let i = 1; i < sorted.length; i += 1) {
        const next = sorted[i]
        const currentEnd = current.start + current.length
        const nextEnd = next.start + next.length
        if (currentEnd >= next.start) {
          current.length = Math.max(currentEnd, nextEnd) - current.start
        } else {
          merged.push(current)
          current = { ...next }
        }
      }

      merged.push(current)
    }

    return merged
  }

  mergeSubscriptionRelations(options: SubscriptionGroup[]): SubscriptionRelation[] {
    if (!options || options.length === 0) {
      return []
    }

    const grouped = new Map<string, SubscriptionGroup[]>()
    for (const opt of options) {
      const unitId = opt.unitId ?? 1
      const key = `${unitId}:${(opt as ReadOptions).fn}`
      const list = grouped.get(key) ?? []
      list.push(opt)
      grouped.set(key, list)
    }

    const relations: SubscriptionRelation[] = []
    for (const [, group] of grouped) {
      const sorted = [...group].sort((a, b) => a.start - b.start)
      let currentRange = { ...sorted[0] } as ReadOptions
      let currentSubscriptions = [sorted[0]]

      for (let i = 1; i < sorted.length; i += 1) {
        const next = sorted[i]
        const currentEnd = currentRange.start + currentRange.length
        const nextEnd = next.start + next.length
        if (currentEnd >= next.start) {
          currentRange.length = Math.max(currentEnd, nextEnd) - currentRange.start
          currentSubscriptions.push(next)
        } else {
          relations.push({ range: currentRange, subscriptions: currentSubscriptions })
          currentRange = { ...next } as ReadOptions
          currentSubscriptions = [next]
        }
      }

      relations.push({ range: currentRange, subscriptions: currentSubscriptions })
    }

    return relations
  }

  sliceReadResponse(options: ReadOptions, response: IResponse<ReadOptions>): Uint8Array | null {
    if (response.method !== RequestMethod.READ) {
      throw new Error(`response method mismatch: ${response.method}`)
    }

    if (response.code !== ResponseCode.SUCCESS) {
      return null
    }

    const { start, length, fn } = options
    const { data, byteCount } = response
    const startAddress = response.options.start

    if (data.length < byteCount) {
      throw new Error(`response data too short: ${data.length} < ${byteCount}`)
    }

    if (fn === ReadFn.ReadCoils || fn === ReadFn.ReadDiscreteInputs) {
      const offset = start - (startAddress ?? 0)
      const startBit = offset
      const endBit = startBit + length
      const totalBits = data.length * 8

      if (endBit > totalBits) {
        throw new Error(`slice out of bit range: ${endBit} > ${totalBits}`)
      }

      const out = new Uint8Array(Math.ceil(length / 8))
      for (let i = 0; i < length; i += 1) {
        const sourceBit = startBit + i
        const sourceByte = data[sourceBit >> 3] ?? 0
        const sourceMask = 1 << (sourceBit & 0x07)
        if ((sourceByte & sourceMask) !== 0) {
          out[i >> 3] |= 1 << (i & 0x07)
        }
      }

      return out
    }

    const relativeOffset = start - (startAddress ?? 0)
    const startIndex = relativeOffset * 2
    const endIndex = startIndex + length * 2

    if (startIndex < 0 || endIndex > data.length) {
      throw new Error('slice range exceeds response data')
    }

    return data.slice(startIndex, endIndex)
  }

  decodeResponse(
    options: ReadOptions | WriteOptions,
    frame: Uint8Array,
  ): IRowResponse<ReadOptions | WriteOptions> {
    const parsed = parseModbusRtuResponse(frame)
    const method = getMethodByFnCode(options.fn)

    if (parsed.exceptionCode !== null) {
      return {
        options,
        transactionId: 0,
        method,
        row: frame,
        code: ModbusExceptionToResponseCode[parsed.exceptionCode] ?? ResponseCode.OP_NOT_ALLOW,
      } as IRowResponse<ReadOptions | WriteOptions>
    }

    if (method === RequestMethod.READ) {
      return {
        options,
        transactionId: 0,
        method,
        row: frame,
        code: ResponseCode.SUCCESS,
        data: parsed.data,
        byteCount: parsed.byteCount,
      } as IRowResponse<ReadOptions | WriteOptions>
    }

    return {
      options,
      transactionId: 0,
      method,
      row: frame,
      code: ResponseCode.SUCCESS,
    } as IRowResponse<ReadOptions | WriteOptions>
  }
}
