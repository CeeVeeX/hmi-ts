import { type BaseWriteOptions, type BaseReadOptions } from '@hmi-ts/core'

// Modbus 读取功能码
export enum ReadFn {
  ReadCoils = 0x01,
  ReadDiscreteInputs = 0x02,
  ReadHoldingRegisters = 0x03,
  ReadInputRegisters = 0x04,
}

// Modbus 写入功能码
export enum WriteFn {
  WriteSingleCoil = 0x05,
  WriteSingleRegister = 0x06,
  WriteMultipleCoils = 0x0f,
  WriteMultipleRegisters = 0x10,
}

// -------------------------- 读取类型（带判别type） --------------------------
export interface ReadCoilsOptions extends BaseReadOptions {
  type: ReadFn.ReadCoils
}
export interface ReadDiscreteInputsOptions extends BaseReadOptions {
  type: ReadFn.ReadDiscreteInputs
}
export interface ReadHoldingRegistersOptions extends BaseReadOptions {
  type: ReadFn.ReadHoldingRegisters
}
export interface ReadInputRegistersOptions extends BaseReadOptions {
  type: ReadFn.ReadInputRegisters
}

export type ReadOptions =
  | ReadCoilsOptions
  | ReadDiscreteInputsOptions
  | ReadHoldingRegistersOptions
  | ReadInputRegistersOptions

// -------------------------- 写入类型（带判别type） --------------------------
export interface WriteCoilOptions extends BaseWriteOptions {
  type: WriteFn.WriteSingleCoil
  value: boolean | number // 单线圈 0/1
}
export interface WriteRegisterOptions extends BaseWriteOptions {
  type: WriteFn.WriteSingleRegister
  value: number // 单寄存器 0~65535
}
export interface WriteCoilsOptions extends BaseWriteOptions {
  type: WriteFn.WriteMultipleCoils
  value: boolean[] | number[] // 多线圈数组
}
export interface WriteRegistersOptions extends BaseWriteOptions {
  type: WriteFn.WriteMultipleRegisters
  value: number[] // 多寄存器数组
}

export type WriteOptions =
  | WriteCoilOptions
  | WriteRegisterOptions
  | WriteCoilsOptions
  | WriteRegistersOptions
