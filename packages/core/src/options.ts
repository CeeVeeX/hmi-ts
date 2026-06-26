export interface CommonOptions {
  start: number
  unitId: number
  frame: Uint8Array
  timeout: number
  priority: number
  startAt: number
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

export type IOptions = BaseWriteOptions | BaseReadOptions
