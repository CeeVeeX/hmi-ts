import { type BaseWriteOptions, type BaseReadOptions, ResponseCode } from '@hmi-ts/core'

export const ModbusExceptionToResponseCode: Record<
  number,
  Exclude<ResponseCode, ResponseCode.SUCCESS>
> = {
  1: ResponseCode.OP_NOT_ALLOW,
  2: ResponseCode.ADDR_INVALID,
  3: ResponseCode.OP_NOT_ALLOW,
  4: ResponseCode.PLC_ABNORMAL,
  5: ResponseCode.PLC_ABNORMAL,
  6: ResponseCode.PLC_ABNORMAL,
  7: ResponseCode.OP_NOT_ALLOW,
  8: ResponseCode.PLC_ABNORMAL,
  10: ResponseCode.DEVICE_MISS,
  11: ResponseCode.DEVICE_MISS,
  1001: ResponseCode.RESPONSE_INVALID,
}

export enum ReadFn {
  ReadCoils = 0x01,
  ReadDiscreteInputs = 0x02,
  ReadHoldingRegisters = 0x03,
  ReadInputRegisters = 0x04,
}

export enum WriteFn {
  WriteSingleCoil = 0x05,
  WriteSingleRegister = 0x06,
  WriteMultipleCoils = 0x0f,
  WriteMultipleRegisters = 0x10,
}

export interface ReadCoilsOptions extends BaseReadOptions {
  fn: ReadFn.ReadCoils
}

export interface ReadDiscreteInputsOptions extends BaseReadOptions {
  fn: ReadFn.ReadDiscreteInputs
}

export interface ReadHoldingRegistersOptions extends BaseReadOptions {
  fn: ReadFn.ReadHoldingRegisters
}

export interface ReadInputRegistersOptions extends BaseReadOptions {
  fn: ReadFn.ReadInputRegisters
}

export type ReadOptions =
  | ReadCoilsOptions
  | ReadDiscreteInputsOptions
  | ReadHoldingRegistersOptions
  | ReadInputRegistersOptions

export interface WriteCoilOptions extends BaseWriteOptions {
  fn: WriteFn.WriteSingleCoil
  value: boolean | number
}

export interface WriteRegisterOptions extends BaseWriteOptions {
  fn: WriteFn.WriteSingleRegister
  value: number
}

export interface WriteCoilsOptions extends BaseWriteOptions {
  fn: WriteFn.WriteMultipleCoils
  value: boolean[] | number[]
}

export interface WriteRegistersOptions extends BaseWriteOptions {
  fn: WriteFn.WriteMultipleRegisters
  value: number[]
}

export type WriteOptions =
  | WriteCoilOptions
  | WriteRegisterOptions
  | WriteCoilsOptions
  | WriteRegistersOptions
