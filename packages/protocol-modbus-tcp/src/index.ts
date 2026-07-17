import {
  type PacketFactory,
  ResponseCode,
  type IResponse,
  RequestMethod,
  type SubscriptionGroup,
  type SubscriptionRelation,
} from '@hmi-ts/core'
import {
  ModbusExceptionToResponseCode,
  ReadFn,
  WriteFn,
  type ReadOptions,
  type WriteOptions,
} from './type'
import {
  createReadPdu,
  encodeWriteMultiCoils,
  encodeWriteMultiRegs,
  encodeWriteSingleCoil,
  encodeWriteSingleReg,
  parseModbusTcpResponse,
} from './encode'
import { decodePacket, type DecodedModbusTcpPacket } from './decode'

export {
  ReadFn,
  WriteFn,
  createReadPdu,
  encodeWriteMultiCoils,
  encodeWriteMultiRegs,
  encodeWriteSingleCoil,
  encodeWriteSingleReg,
  decodePacket,
  type DecodedModbusTcpPacket,
  type ReadOptions,
  type WriteOptions,
}

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

// -------------------------- 工厂类 --------------------------
export class ModbusTcpPacketFactory<
  R extends ReadOptions = ReadOptions,
  W extends WriteOptions = WriteOptions,
> implements PacketFactory<R, W> {
  /**
   * 获取事务ID
   * @param sequence 序列号
   * @param response 响应数据
   * @returns 事务ID
   */
  getTransactionId(sequence: number): number
  getTransactionId(response: Uint8Array): number
  getTransactionId(sequence: number | Uint8Array): number {
    if (sequence instanceof Uint8Array) {
      // 从响应数据中解析事务ID
      const transactionId = (sequence[0] << 8) | sequence[1]
      return transactionId & 0xffff // 事务ID为16位
    }

    return sequence & 0xffff // 事务ID为16位
  }

  encodeRead(options: R): Uint8Array {
    const { fn } = options
    switch (fn) {
      case ReadFn.ReadCoils:
      case ReadFn.ReadDiscreteInputs:
      case ReadFn.ReadHoldingRegisters:
      case ReadFn.ReadInputRegisters:
        return createReadPdu(options)
      default: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _exhaustive: never = options
        throw new Error(`不支持的读取功能码：${fn}`)
      }
    }
  }

  encodeWrite(options: W): Uint8Array {
    switch (options.fn) {
      case WriteFn.WriteSingleCoil:
        return encodeWriteSingleCoil(options)
      case WriteFn.WriteSingleRegister:
        return encodeWriteSingleReg(options)
      case WriteFn.WriteMultipleCoils:
        return encodeWriteMultiCoils(options)
      case WriteFn.WriteMultipleRegisters:
        return encodeWriteMultiRegs(options)
      default: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _exhaustive: never = options
        throw new Error(`未知写入功能码: ${(options as W).fn}`)
      }
    }
  }

  mergeRead(options: R[]): R[] {
    if (!options || options.length === 0) {
      return []
    }

    // 按 unitId 和 fn 分组
    const grouped = new Map<string, R[]>()
    for (const opt of options) {
      const unitId = opt.unitId ?? 1 // 默认 unitId 为 1
      const key = `${unitId}:${opt.fn}`
      const existing = grouped.get(key) || []
      existing.push(opt)
      grouped.set(key, existing)
    }

    const merged: R[] = []

    // 对每组进行合并
    for (const [, group] of grouped) {
      // 按 start 排序
      const sorted = group.sort((a, b) => a.start - b.start)

      // 合并重叠或紧邻的区间
      let current = { ...sorted[0] }

      for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i]
        const currentEnd = current.start + current.length
        const nextEnd = next.start + next.length

        // 如果下一个区间与当前区间重叠或紧邻（end >= next.start）
        if (currentEnd >= next.start) {
          // 合并：扩展当前区间到两者的最大结束位置
          current.length = Math.max(currentEnd, nextEnd) - current.start
        } else {
          // 不重叠也不紧邻，保存当前区间并开始新的区间
          merged.push(current)
          current = { ...next }
        }
      }

      // 添加最后一个区间
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
      const key = `${unitId}:${(opt as R).fn}`
      const existing = grouped.get(key) || []
      existing.push(opt)
      grouped.set(key, existing)
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

  /**
   * modbus tcp 响应数据截取,兼容 寄存器和线圈的读取响应数据截取
   * @param options 读取请求参数
   * @param response 响应数据
   * @returns 截取后的响应数据
   * @throws 如果响应方法与请求不匹配，或响应数据长度不足，则抛出错误。
   * @example
   * ```ts
   * const options: ReadOptions = { fn: ReadFn.ReadHoldingRegisters, start: 0, length: 10, unitId: 1 }
   * const response: IResponse = await modbusClient.read(options)
   * const dataChunk = packetFactory.sliceReadResponse(options, response)
   * ```
   */
  sliceReadResponse(options: R, response: IResponse<R, W>): Uint8Array | null {
    if (response.method !== RequestMethod.READ) {
      throw new Error(`响应方法与请求不匹配: ${response.method}`)
    }

    if (response.code !== ResponseCode.SUCCESS) {
      return null
    }

    const { start, length, fn } = options
    const { data, byteCount } = response
    const startAddress = response.options.start

    if (data.length < byteCount) {
      throw new Error(`响应数据长度不足: ${data.length} < ${byteCount}`)
    }

    if (fn === ReadFn.ReadCoils || fn === ReadFn.ReadDiscreteInputs) {
      // 计算相对于响应数据起始位置的偏移
      const offset = (startAddress ?? 0) === start ? 0 : start - (startAddress ?? 0)
      const startBit = offset
      const endBit = startBit + length
      const totalBits = data.length * 8

      if (endBit > totalBits) {
        throw new Error(`截取范围超出响应数据位长度: ${endBit} > ${totalBits}`)
      }

      const out = new Uint8Array(Math.ceil(length / 8))
      for (let i = 0; i < length; i++) {
        const sourceBit = startBit + i
        const sourceByte = data[sourceBit >> 3] ?? 0
        const sourceMask = 1 << (sourceBit & 0x07)
        if ((sourceByte & sourceMask) !== 0) {
          out[i >> 3] |= 1 << (i & 0x07)
        }
      }
      return out
    }

    // 寄存器/输入寄存器：相对偏移 = (请求地址 - 响应起始地址) * 2
    const relativeOffset = start - (startAddress ?? 0)
    const startIndex = relativeOffset * 2
    const endIndex = startIndex + length * 2

    if (startIndex < 0 || endIndex > data.length) {
      throw new Error(
        `截取范围超出响应数据长度: startIndex=${startIndex}, endIndex=${endIndex}, dataLength=${data.length}`,
      )
    }

    return data.slice(startIndex, endIndex)
  }

  decodeResponse(options: R | W, d: Uint8Array): IResponse<R, W> {
    const { fn } = options
    const { transactionId, functionCode, data, byteCount, exceptionCode } =
      parseModbusTcpResponse(d)

    if (isReadOptions(options)) {
      if (exceptionCode !== null) {
        return {
          options,
          startAt: options.startAt,
          endAt: Date.now(),
          transactionId,
          method: RequestMethod.READ,
          responseFrame: d,
          code: ModbusExceptionToResponseCode[exceptionCode] ?? ResponseCode.OP_NOT_ALLOW,
        }
      }

      // 防御性校验：响应功能码必须与请求功能码一致，避免错误切片。
      if (functionCode !== fn) {
        return {
          options,
          transactionId,
          method: RequestMethod.READ,
          responseFrame: d,
          startAt: options.startAt,
          endAt: Date.now(),
          code: ResponseCode.RESPONSE_INVALID,
        }
      }

      return {
        options,
        transactionId,
        method: RequestMethod.READ,
        responseFrame: d,
        code: ResponseCode.SUCCESS,
        startAt: options.startAt,
        endAt: Date.now(),
        data: data, // 仅返回数据部分，去掉 MBAP 头和 PDU 功能码
        byteCount,
      }
    }

    if (isWriteOptions(options)) {
      if (exceptionCode !== null) {
        return {
          options,
          startAt: options.startAt,
          endAt: Date.now(),
          transactionId,
          method: RequestMethod.WRITE,
          responseFrame: d,
          code: ModbusExceptionToResponseCode[exceptionCode] ?? ResponseCode.OP_NOT_ALLOW,
        }
      }

      // 防御性校验：响应功能码必须与请求功能码一致，避免错误切片。
      if (functionCode !== fn) {
        return {
          options,
          transactionId,
          method: RequestMethod.WRITE,
          responseFrame: d,
          startAt: options.startAt,
          endAt: Date.now(),
          code: ResponseCode.RESPONSE_INVALID,
        }
      }

      return {
        options,
        transactionId,
        method: RequestMethod.WRITE,
        startAt: options.startAt,
        endAt: Date.now(),
        responseFrame: d,
        code: ResponseCode.SUCCESS,
      }
    }

    throw new Error(`未知功能码: ${fn}`)
  }
}
