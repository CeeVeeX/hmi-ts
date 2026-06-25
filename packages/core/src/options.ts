import type { IReadResponse } from './response'

export interface CommonOptions {
  start: number
  unitId: number
  timeout?: number
  priority?: number
}

export interface BaseWriteOptions extends CommonOptions {
  value: number | number[] | boolean | boolean[]
}

export interface BaseReadOptions extends CommonOptions {
  /**
   * 读取长度，单位为寄存器或线圈个数。
   *
   *
   */
  length: number
}

export interface SubscribeOptions extends BaseReadOptions {
  interval?: number
  callback: (data: IReadResponse<BaseReadOptions>) => void
}

export type IOptions = BaseWriteOptions | BaseReadOptions | SubscribeOptions
