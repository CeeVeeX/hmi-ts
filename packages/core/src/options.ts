export interface CommonOptions {
  start: number
  unitId?: number
  timeout?: number
  priority?: number
}

export interface BaseWriteOptions extends CommonOptions {
  value: number | number[] | boolean | boolean[]
}

export interface BaseReadOptions extends CommonOptions {
  length: number
}

export interface SubscribeOptions extends BaseReadOptions {
  interval?: number
  callback: (registers: number[]) => void
}
