/* eslint-disable @typescript-eslint/no-explicit-any */
import type { BaseReadOptions, BaseWriteOptions } from './options'
import type { IReadResponse, IResponse } from './response'
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
  encodeRead(options: PartialBy<R, 'frame'>): Uint8Array

  /**
   * 编码写入请求
   * @param options 写入请求参数
   * @returns 编码后的请求数据
   */
  encodeWrite(options: PartialBy<W, 'frame'>): Uint8Array

  /**
   * 构建订阅关系。
   *
   * 工厂根据自身协议规则，把订阅记录分组、合并，并返回每个合并区间对应的订阅集合。
   */
  mergeSubscriptionRelations(options: R[]): SubscriptionRelation<PacketFactory<R, W>>[]

  /**
   * 截取对应配置的响应数据
   * @param options 读取请求参数
   * @param response 响应数据
   * @returns 截取后的响应数据
   */
  sliceReadResponse(options: R, response: IResponse<R, W>): Uint8Array | null

  /**
   * 解码响应数据
   * @param options 请求参数
   * @param data 响应数据
   * @returns 解码后的响应对象
   */
  decodeResponse(opt: R | W, data: Uint8Array): IResponse<R, W>
}

// // 提取 PacketFactory 的第一个泛型参数 R
// export type GetPFR<T extends PacketFactory<any, any>> =
//   T extends PacketFactory<infer R, any> ? R : never

// // 提取 PacketFactory 的第二个泛型参数 W
// export type GetPFW<T extends PacketFactory<any, any>> =
//   T extends PacketFactory<any, infer W> ? W : never

export type ReadOptions<T extends PacketFactory> = T extends PacketFactory<infer R, any> ? R : never
export type WriteOptions<T extends PacketFactory> =
  T extends PacketFactory<any, infer W> ? W : never

//  独有选项
export interface SubscribeUniqueOptions<T extends PacketFactory> {
  /**
   * 订阅轮询间隔，单位毫秒。
   */
  interval: number

  /**
   * 订阅回调函数，接收订阅数据。
   */
  callback: (data: SubscribeReadResponse<T>) => void
}

export type SubscribeReadResponse<T extends PacketFactory> = IReadResponse<
  DistributiveOmit<SubscribeOptions<T>, 'callback'>
>

export type SubscribeOptions<T extends PacketFactory> = ReadOptions<T> & SubscribeUniqueOptions<T>

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
  /**
   * 订阅ID，唯一标识一个订阅关系。
   */
  subId: string

  /**
   * 上次订阅数据快照，用于判断数据是否发生变化。
   */
  lastData?: Uint8Array
}

/**
 * 订阅关系：一个合并后的读取区间，对应多个原始订阅。
 */
export interface SubscriptionRelation<T extends PacketFactory = PacketFactory> {
  /**
   * 合并后的读取区间，包含起始地址、长度、单元ID等信息。
   */
  range: SubscribeOptions<T>

  /**
   * 该合并区间对应的原始订阅集合。
   */
  subscriptions: SubscriptionGroup<T>[]
}
