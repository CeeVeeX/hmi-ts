export interface CommonOptions {
  /**
   * 事物ID，用于标识请求与响应的对应关系。
   */
  id: number
  /**
   * 请求的起始地址，单位为寄存器或线圈个数。
   */
  start: number
  /**
   * 请求的单元ID，用于标识从站设备。
   */
  unitId: number
  /**
   * 请求帧数据
   */
  frame: Uint8Array
  /**
   * 请求超时时间，单位为毫秒。
   */
  timeout: number
  /**
   * 请求优先级，数值越小优先级越高。
   */
  priority: number
  /**
   * 请求发起时间戳，单位为毫秒。
   */
  startAt: number
}

export interface BaseWriteOptions extends CommonOptions {
  /**
   * 写入的数据
   */
  value: Uint8Array
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
