import type { BaseWriteOptions, BaseReadOptions } from '@hmi-ts/core'

export interface WriteBitOptions extends BaseWriteOptions {
  device: string
}
export interface WriteWordOptions extends BaseWriteOptions {
  device: string
}

export interface ReadBitOptions extends BaseReadOptions {
  device: string
}
export interface ReadWordOptions extends BaseReadOptions {
  device: string
}
