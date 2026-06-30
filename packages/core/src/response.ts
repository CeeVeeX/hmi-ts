import type { BaseReadOptions, BaseWriteOptions, CommonOptions } from './options'
import type { PartialBy } from './type'

export enum ResponseCode {
  // ========== 正常完成 ==========
  SUCCESS = 0, // 请求正常执行，数据读写成功

  // ========== 报文相关错误 ==========
  // 响应解析失败：报文格式不合法、长度不匹配、校验失败
  RESPONSE_INVALID = 1, // 响应报文不合法

  // ========== 异常故障状态 ==========
  TRANS_TIMEOUT = 101, // 传输超时：请求未发送成功、响应未接收成功
  TRANS_DISCONNECT = 102, // 传输断开：连接中断、网络不通、目标设备掉线
  TRANS_FRAME_ERROR = 103, // 传输帧错误：报文格式不合法、长度不匹配、校验失败
  ADDR_INVALID = 201, // 地址非法：越界、写只读区、元件类型不匹配、批量超限
  OP_NOT_ALLOW = 301, // 操作不支持：非法指令、参数错误、停机禁止写入
  PLC_ABNORMAL = 401, // PLC本体异常：停机、故障、加密锁定、资源繁忙
  DEVICE_MISS = 501, // 目标设备不存在：IP/站号错误、网络不通、地址冲突
  SDK_CONFIG_ERR = 901, // 框架配置错误：未初始化、参数配置错误
}

export enum RequestMethod {
  READ = 0,
  WRITE = 1,
}

/**
 * 标准化响应结构，覆盖读成功与异常场景。
 */
export interface IBaseResponse<T extends CommonOptions = CommonOptions> {
  transactionId: number
  method: RequestMethod
  responseFrame?: Uint8Array
  code: ResponseCode
  startAt: number
  endAt: number
  options: T
}

export interface IReadResponseSuccess<T extends BaseReadOptions> extends IBaseResponse<T> {
  code: ResponseCode.SUCCESS
  method: RequestMethod.READ
  responseFrame: Uint8Array
  data: Uint8Array
  byteCount: number
}

export interface IWriteResponseSuccess<T extends BaseWriteOptions> extends IBaseResponse<T> {
  code: ResponseCode.SUCCESS
  method: RequestMethod.WRITE
  responseFrame: Uint8Array
}

export interface IReadResponseError<T extends BaseReadOptions> extends IBaseResponse<T> {
  code: Exclude<ResponseCode, ResponseCode.SUCCESS>
  method: RequestMethod.READ
  responseFrame?: Uint8Array
}

export interface IWriteResponseError<T extends BaseWriteOptions> extends IBaseResponse<T> {
  code: Exclude<ResponseCode, ResponseCode.SUCCESS>
  method: RequestMethod.WRITE
  responseFrame?: Uint8Array
}

export type IReadResponse<T extends BaseReadOptions> =
  | IReadResponseSuccess<T>
  | IReadResponseError<T>

export type IWriteResponse<T extends BaseWriteOptions> =
  | IWriteResponseSuccess<T>
  | IWriteResponseError<T>

export type IResponse<R extends BaseReadOptions, W extends BaseWriteOptions> =
  | IReadResponse<R>
  | IWriteResponse<W>

export type IRowResponse<R extends BaseReadOptions, W extends BaseWriteOptions> = PartialBy<
  IResponse<R, W>,
  'startAt' | 'endAt'
>
