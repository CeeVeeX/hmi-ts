/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BaseReadOptions, BaseWriteOptions } from './options'
import type { IReadResponse, IResponse, IRowResponse } from './response'
import type { DistributiveOmit, PartialBy } from './type'

export interface PacketFactory<
  R extends BaseReadOptions = BaseReadOptions,
  W extends BaseWriteOptions = BaseWriteOptions,
> {
  /**
   * 是否是串行上下文
   */
  readonly isSerial?: boolean

  /**
   * 获取事务ID
   * @param sequence 序列号
   * @param response 响应数据
   * @returns 事务ID
   */
  getTransactionId(sequence: number): number
  getTransactionId(response: Uint8Array): number
  getTransactionId(sequence: number | Uint8Array): number

  /**
   * 编码读取请求
   * @param options 读取请求参数
   * @returns 编码后的请求数据
   */
  encodeRead(transactionId: number, options: PartialBy<R, 'frame'>): Uint8Array

  /**
   * 编码写入请求
   * @param options 写入请求参数
   * @returns 编码后的请求数据
   */
  encodeWrite(transactionId: number, options: PartialBy<W, 'frame'>): Uint8Array

  /**
   * 合并读取请求，减少报文数量
   * @param options 读取请求参数数组
   * @returns 合并后的读取请求参数数组
   */
  mergeRead(options: R[]): R[]

  /**
   * 截取对应配置的响应数据
   * @param options 读取请求参数
   * @param response 响应数据
   * @returns 截取后的响应数据
   */
  sliceReadResponse(options: R, response: IResponse<R>): Uint8Array | null

  /**
   * 解码响应数据
   * @param options 请求参数
   * @param data 响应数据
   * @returns 解码后的响应对象
   */
  decodeResponse(opt: R | W, data: Uint8Array): IRowResponse<R | W>
}

// 提取 PacketFactory 的第一个泛型参数 R
export type GetPFR<T extends PacketFactory<any, any>> =
  T extends PacketFactory<infer R, any> ? R : never

// 提取 PacketFactory 的第二个泛型参数 W
export type GetPFW<T extends PacketFactory<any, any>> =
  T extends PacketFactory<any, infer W> ? W : never

export type ReadOptions<T extends PacketFactory> = GetPFR<T>
export type WriteOptions<T extends PacketFactory> = GetPFW<T>
export type SubscribeOptions<T extends PacketFactory> = DistributiveOmit<
  ReadOptions<T>,
  'id' | 'interval' | 'callback'
> & {
  id: string
  interval: number
  callback: (data: IReadResponse<SubscriptionGroup<T>>) => void
}

/**
 * 带上次数据快照的订阅对象。
 *
 * @example
 * ```ts
 * const group: SubscriptionGroup = {
 *   id: 'sub-1', unitId: 1, start: 0, length: 2, interval: 500,
 *   callback: () => {}, lastData: [1, 2],
 * }
 * ```
 */
export type SubscriptionGroup<T extends PacketFactory = PacketFactory> = SubscribeOptions<T> & {
  lastData?: Uint8Array
}
