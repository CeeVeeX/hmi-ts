import type { BaseReadOptions, BaseWriteOptions, CommonOptions } from './options'
import type { IResponse, IRowResponse } from './response'

export interface PacketFactory {
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
   * 截取对应配置的响应数据
   * @param options 读取请求参数
   * @param response 响应数据
   * @returns 截取后的响应数据
   */
  sliceReadResponse(
    options: BaseReadOptions,
    response: IResponse<BaseReadOptions>,
  ): Uint8Array | null

  /**
   * 解码响应数据
   * @param options 请求参数
   * @param data 响应数据
   * @returns 解码后的响应对象
   */
  decodeResponse(opt: CommonOptions, data: Uint8Array): IRowResponse<BaseReadOptions | BaseWriteOptions>
}
