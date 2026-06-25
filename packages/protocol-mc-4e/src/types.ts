import type { BaseReadOptions, BaseWriteOptions } from '@hmi-ts/core'

export enum Mc4eSubHeader {
  REQUEST = 0x0054,
  RESPONSE = 0x00d4,
}

export enum Mc4eCommand {
  BATCH_READ = 0x0401,
  BATCH_WRITE = 0x1401,
}

export enum Mc4eSubCommand {
  WORD = 0x0000,
  BIT = 0x0001,
}

export enum Mc4eDeviceCode {
  M = 0x90,
  X = 0x9c,
  Y = 0x9d,
  D = 0xa8,
  W = 0xb4,
  R = 0xaf,
}

export type Mc4eDevice = keyof typeof Mc4eDeviceCode

export interface Mc4eRouteOptions {
  networkNo?: number
  plcNo?: number
  ioNo?: number
  stationNo?: number
}

export interface Mc4ePacketFactoryOptions {
  route?: Mc4eRouteOptions
  monitoringTimer?: number
}

export interface Mc4eCommonOptions {
  device: Mc4eDevice
  route?: Mc4eRouteOptions
  monitoringTimer?: number
}

export interface WriteBitOptions extends BaseWriteOptions, Mc4eCommonOptions {
  value: boolean | number | boolean[] | number[]
}

export interface WriteWordOptions extends BaseWriteOptions, Mc4eCommonOptions {
  value: number | number[]
}

export interface ReadBitOptions extends BaseReadOptions, Mc4eCommonOptions {}

export interface ReadWordOptions extends BaseReadOptions, Mc4eCommonOptions {}

export type Mc4eReadOptions = ReadBitOptions | ReadWordOptions
export type Mc4eWriteOptions = WriteBitOptions | WriteWordOptions

export interface ParsedResponse {
  transactionId: number
  endCode: number
  payload: Uint8Array
}
