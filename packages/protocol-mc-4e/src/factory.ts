import {
  type IResponse,
  type PacketFactory,
  type SubscriptionRelation,
  RequestMethod,
  ResponseCode,
} from '@hmi-ts/core'
import {
  buildReadBody,
  buildRequestFrame,
  buildWriteBody,
  isBitDevice,
  mapEndCode,
  mergeReadOptions,
  mergeSubscriptionRelations,
  packBitValues,
  parseResponseFrame,
  readUInt16LE,
  unpackBitValues,
} from './helpers'
import type { Mc4ePacketFactoryOptions, Mc4eReadOptions, Mc4eWriteOptions } from './types'

function isReadOptions<R extends Mc4eReadOptions, W extends Mc4eWriteOptions>(
  options: R | W,
): options is R {
  return 'length' in options
}

export class Mc4ePacketFactory<
  R extends Mc4eReadOptions = Mc4eReadOptions,
  W extends Mc4eWriteOptions = Mc4eWriteOptions,
> implements PacketFactory<R, W> {
  constructor(private readonly options: Mc4ePacketFactoryOptions = {}) {}

  getTransactionId(sequence: number): number
  getTransactionId(response: Uint8Array): number
  getTransactionId(sequence: number | Uint8Array): number {
    if (sequence instanceof Uint8Array) {
      if (sequence.length < 4) {
        throw new Error('response is too short to parse transactionId')
      }
      return readUInt16LE(sequence, 2)
    }

    return sequence & 0xffff
  }

  encodeRead(options: R): Uint8Array {
    const readOptions = options as Mc4eReadOptions
    const body = buildReadBody(readOptions)
    return buildRequestFrame(options.id, body, {
      unitId: readOptions.unitId,
      route: readOptions.route ?? this.options.route,
      monitoringTimer: readOptions.monitoringTimer ?? this.options.monitoringTimer,
    })
  }

  encodeWrite(options: W): Uint8Array {
    const writeOptions = options as Mc4eWriteOptions
    const body = buildWriteBody(writeOptions)
    return buildRequestFrame(options.id, body, {
      unitId: writeOptions.unitId,
      route: writeOptions.route ?? this.options.route,
      monitoringTimer: writeOptions.monitoringTimer ?? this.options.monitoringTimer,
    })
  }

  mergeRead(options: R[]): R[] {
    return mergeReadOptions(options as Mc4eReadOptions[]) as R[]
  }

  mergeSubscriptionRelations(options: R[]): SubscriptionRelation<PacketFactory<R, W>>[] {
    return mergeSubscriptionRelations<PacketFactory<R, W>>(
      options as unknown as Parameters<typeof mergeSubscriptionRelations<PacketFactory<R, W>>>[0],
    )
  }

  sliceReadResponse(
    options: R,

    response: IResponse<R, W>,
  ): Uint8Array | null {
    const req = options as Mc4eReadOptions
    const rsp = response

    if (rsp.method !== RequestMethod.READ) {
      throw new Error(`response method mismatch: ${rsp.method}`)
    }

    if (rsp.code !== ResponseCode.SUCCESS) {
      return null
    }

    const offset = req.start - rsp.options.start
    if (offset < 0) {
      throw new Error('slice offset cannot be negative')
    }

    if (isBitDevice(req.device)) {
      const bits = unpackBitValues(rsp.data, rsp.options.length)
      const part = bits.slice(offset, offset + req.length)
      if (part.length !== req.length) {
        throw new Error('slice range exceeds bit payload')
      }
      return packBitValues(part)
    }

    const startIndex = offset * 2
    const endIndex = startIndex + req.length * 2
    if (endIndex > rsp.data.length) {
      throw new Error('slice range exceeds word payload')
    }

    return rsp.data.slice(startIndex, endIndex)
  }

  decodeResponse(opt: R | W, data: Uint8Array): IResponse<R, W> {
    const requestOptions = opt
    const endAt = Date.now()

    try {
      const parsed = parseResponseFrame(data)
      const code = mapEndCode(parsed.endCode)

      if (isReadOptions(requestOptions)) {
        if (code !== ResponseCode.SUCCESS) {
          return {
            options: requestOptions,
            startAt: requestOptions.startAt,
            endAt,
            transactionId: parsed.transactionId,
            method: RequestMethod.READ,
            responseFrame: data,
            code,
          }
        }

        return {
          options: requestOptions,
          startAt: requestOptions.startAt,
          endAt,
          transactionId: parsed.transactionId,
          method: RequestMethod.READ,
          responseFrame: data,
          code,
          data: parsed.payload,
          byteCount: parsed.payload.length,
        }
      }

      if (code !== ResponseCode.SUCCESS) {
        return {
          options: requestOptions,
          startAt: requestOptions.startAt,
          endAt,
          transactionId: parsed.transactionId,
          method: RequestMethod.WRITE,
          responseFrame: data,
          code,
        }
      }

      return {
        options: requestOptions,
        startAt: requestOptions.startAt,
        endAt,
        transactionId: parsed.transactionId,
        method: RequestMethod.WRITE,
        responseFrame: data,
        code,
      }
    } catch {
      if (isReadOptions(requestOptions)) {
        return {
          options: requestOptions,
          startAt: requestOptions.startAt,
          endAt,
          transactionId: this.getTransactionId(data),
          method: RequestMethod.READ,
          responseFrame: data,
          code: ResponseCode.RESPONSE_INVALID,
        }
      }

      return {
        options: requestOptions,
        startAt: requestOptions.startAt,
        endAt,
        transactionId: this.getTransactionId(data),
        method: RequestMethod.WRITE,
        responseFrame: data,
        code: ResponseCode.RESPONSE_INVALID,
      }
    }
  }
}
