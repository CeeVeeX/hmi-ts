import {
  type PacketFactory,
  ResponseCode,
  type IResponse,
  RequestMethod,
  type SubscriptionGroup,
  type SubscriptionRelation,
} from '@hmi-ts/core'
import { createReadRtuFrame, encodeWriteRtuFrame, parseModbusRtuResponse } from './codec'
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

function isReadOptions<R extends ReadOptions, W extends WriteOptions>(
  options: R | W,
): options is R {
  return (
    options.fn === ReadFn.ReadCoils ||
    options.fn === ReadFn.ReadDiscreteInputs ||
    options.fn === ReadFn.ReadHoldingRegisters ||
    options.fn === ReadFn.ReadInputRegisters
  )
}

function isWriteOptions<R extends ReadOptions, W extends WriteOptions>(
  options: R | W,
): options is W {
  return (
    options.fn === WriteFn.WriteSingleCoil ||
    options.fn === WriteFn.WriteSingleRegister ||
    options.fn === WriteFn.WriteMultipleCoils ||
    options.fn === WriteFn.WriteMultipleRegisters
  )
}

export class ModbusRtuPacketFactory<
  R extends ReadOptions = ReadOptions,
  W extends WriteOptions = WriteOptions,
> implements PacketFactory<R, W> {
  readonly isSerial = true

  getTransactionId(sequence: number): number
  getTransactionId(_response: Uint8Array): number
  getTransactionId(sequence: number | Uint8Array): number {
    if (sequence instanceof Uint8Array) {
      return 0
    }

    return sequence & 0xffff
  }

  encodeRead(options: R): Uint8Array {
    return createReadRtuFrame(options)
  }

  encodeWrite(options: W): Uint8Array {
    return encodeWriteRtuFrame(options)
  }

  mergeRead(options: R[]): R[] {
    if (!options || options.length === 0) {
      return []
    }

    const grouped = new Map<string, R[]>()
    for (const opt of options) {
      const unitId = opt.unitId ?? 1
      const key = `${unitId}:${opt.fn}`
      const list = grouped.get(key) ?? []
      list.push(opt)
      grouped.set(key, list)
    }

    const merged: R[] = []
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

  mergeSubscriptionRelations(options: R[]): SubscriptionRelation<PacketFactory<R, W>>[] {
    if (!options || options.length === 0) {
      return []
    }

    const subscriptions = options as unknown as SubscriptionGroup<PacketFactory<R, W>>[]

    const grouped = new Map<string, SubscriptionGroup<PacketFactory<R, W>>[]>()
    for (const opt of subscriptions) {
      const unitId = opt.unitId ?? 1
      const key = `${unitId}:${(opt as unknown as R).fn}`
      const list = grouped.get(key) ?? []
      list.push(opt)
      grouped.set(key, list)
    }

    const relations: SubscriptionRelation<PacketFactory<R, W>>[] = []
    for (const [, group] of grouped) {
      const sorted = [...group].sort((a, b) => a.start - b.start)
      let currentRange = { ...sorted[0] } as unknown as R
      let currentSubscriptions = [sorted[0]]

      for (let i = 1; i < sorted.length; i += 1) {
        const next = sorted[i]
        const currentEnd = currentRange.start + currentRange.length
        const nextEnd = next.start + next.length
        if (currentEnd >= next.start) {
          currentRange.length = Math.max(currentEnd, nextEnd) - currentRange.start
          currentSubscriptions.push(next)
        } else {
          relations.push({
            range: currentRange,
            subscriptions: currentSubscriptions,
          } as SubscriptionRelation<PacketFactory<R, W>>)
          currentRange = { ...next } as unknown as R
          currentSubscriptions = [next]
        }
      }

      relations.push({
        range: currentRange,
        subscriptions: currentSubscriptions,
      } as SubscriptionRelation<PacketFactory<R, W>>)
    }

    return relations
  }

  sliceReadResponse(options: R, response: IResponse<R, W>): Uint8Array | null {
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

  decodeResponse(options: R | W, frame: Uint8Array): IResponse<R, W> {
    const parsed = parseModbusRtuResponse(frame)
    const endAt = Date.now()

    if (parsed.exceptionCode !== null) {
      if (isReadOptions(options)) {
        return {
          options,
          transactionId: 0,
          method: RequestMethod.READ,
          responseFrame: frame,
          startAt: options.startAt,
          endAt,
          code: ModbusExceptionToResponseCode[parsed.exceptionCode] ?? ResponseCode.OP_NOT_ALLOW,
        }
      }

      if (isWriteOptions(options)) {
        return {
          options,
          transactionId: 0,
          method: RequestMethod.WRITE,
          responseFrame: frame,
          startAt: options.startAt,
          endAt,
          code: ModbusExceptionToResponseCode[parsed.exceptionCode] ?? ResponseCode.OP_NOT_ALLOW,
        }
      }

      throw new Error('Unknown function code in exception response')
    }

    if (isReadOptions(options)) {
      if (parsed.functionCode !== options.fn) {
        return {
          options,
          transactionId: 0,
          method: RequestMethod.READ,
          responseFrame: frame,
          startAt: options.startAt,
          endAt,
          code: ResponseCode.RESPONSE_INVALID,
        }
      }

      return {
        options,
        transactionId: 0,
        method: RequestMethod.READ,
        responseFrame: frame,
        startAt: options.startAt,
        endAt,
        code: ResponseCode.SUCCESS,
        data: parsed.data,
        byteCount: parsed.byteCount,
      }
    }

    if (isWriteOptions(options)) {
      if (parsed.functionCode !== options.fn) {
        return {
          options,
          transactionId: 0,
          method: RequestMethod.WRITE,
          responseFrame: frame,
          startAt: options.startAt,
          endAt,
          code: ResponseCode.RESPONSE_INVALID,
        }
      }

      return {
        options,
        transactionId: 0,
        method: RequestMethod.WRITE,
        responseFrame: frame,
        startAt: options.startAt,
        endAt,
        code: ResponseCode.SUCCESS,
      }
    }

    throw new Error('Unknown function code')
  }
}
