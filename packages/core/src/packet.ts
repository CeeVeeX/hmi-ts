import type { BaseReadOptions, BaseWriteOptions } from './options'
import type { IResponse } from './response'

export interface PacketFactory {
  /**
   * 是否是串行上下文
   */
  readonly isSerial?: boolean

  /**
   * 获取事务ID
   * @param sequence 序列号
   * @returns 事务ID
   */
  getTransactionId(sequence: number): number

  /**
   * 编码读取请求
   * @param options 读取请求参数
   * @returns 编码后的请求数据
   */
  encodeRead(transactionId: number, options: BaseReadOptions): Uint8Array

  /**
   * 编码写入请求
   * @param options 写入请求参数
   * @returns 编码后的请求数据
   */
  encodeWrite(transactionId: number, options: BaseWriteOptions): Uint8Array

  /**
   * 合并读取请求，减少报文数量
   * @param options 读取请求参数数组
   * @returns 合并后的读取请求参数数组
   */
  mergeRead(options: BaseReadOptions[]): BaseReadOptions[]

  /**
   * 解码响应数据
   * @param data 响应数据
   * @returns 解码后的响应对象
   */
  decodeResponse(data: Uint8Array): IResponse
}
