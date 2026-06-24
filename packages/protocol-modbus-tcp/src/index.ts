import { type PacketFactory, type IResponse, ResponseCode, uint8ToHex } from '@hmi-ts/core'
import { ReadFn, WriteFn, type ReadOptions, type WriteOptions } from './type'
import {
  createReadPdu,
  encodeWriteMultiCoils,
  encodeWriteMultiRegs,
  encodeWriteSingleCoil,
  encodeWriteSingleReg,
} from './encode'

export {
  ReadFn,
  WriteFn,
  createReadPdu,
  encodeWriteMultiCoils,
  encodeWriteMultiRegs,
  encodeWriteSingleCoil,
  encodeWriteSingleReg,
  type ReadOptions,
  type WriteOptions,
}

// -------------------------- 工厂类 --------------------------
export class ModbusTcpPacketFactory implements PacketFactory {
  getTransactionId(sequence: number): number {
    return sequence & 0xffff // 事务ID为16位
  }

  encodeRead(transactionId: number, options: ReadOptions): Uint8Array {
    const { type } = options
    switch (type) {
      case ReadFn.ReadCoils:
      case ReadFn.ReadDiscreteInputs:
      case ReadFn.ReadHoldingRegisters:
      case ReadFn.ReadInputRegisters:
        return createReadPdu(transactionId, options)
      default: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _exhaustive: never = options
        throw new Error(`不支持的读取功能码：${type}`)
      }
    }
  }

  encodeWrite(transactionId: number, options: WriteOptions): Uint8Array {
    switch (options.type) {
      case WriteFn.WriteSingleCoil:
        return encodeWriteSingleCoil(transactionId, options)
      case WriteFn.WriteSingleRegister:
        return encodeWriteSingleReg(transactionId, options)
      case WriteFn.WriteMultipleCoils:
        return encodeWriteMultiCoils(transactionId, options)
      case WriteFn.WriteMultipleRegisters:
        return encodeWriteMultiRegs(transactionId, options)
      default: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _exhaustive: never = options
        throw new Error(`未知写入功能码: ${(options as WriteOptions).type}`)
      }
    }
  }

  mergeRead(options: ReadOptions[]): ReadOptions[] {
    if (!options || options.length === 0) {
      return []
    }

    // 按 unitId 和 type 分组
    const grouped = new Map<string, ReadOptions[]>()
    for (const opt of options) {
      const unitId = opt.unitId ?? 1 // 默认 unitId 为 1
      const key = `${unitId}:${opt.type}`
      const existing = grouped.get(key) || []
      existing.push(opt)
      grouped.set(key, existing)
    }

    const merged: ReadOptions[] = []

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

  decodeResponse(data: Uint8Array): IResponse {
    console.log(uint8ToHex(data))
    return {
      transactionId: (data[0] << 8) | data[1],
      row: data,
      code: ResponseCode.SUCCESS,
      data: data.subarray(7), // 去掉MBAP头，保留PDU部分
    }
  }
}
