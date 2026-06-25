import { type BaseWriteOptions, type BaseReadOptions, ResponseCode } from '@hmi-ts/core'

export const MODBUS_EXCEPTION_MAP: Record<number, string> = {
  1: '非法功能码',
  2: '非法数据地址',
  3: '非法数据值',
  4: '从站设备故障',
  5: '确认（任务处理中）',
  6: '从站忙，请重试',
  7: '否定确认，无法执行编程操作',
  8: '存储器奇偶校验错误',
  10: '网关无可用通路',
  11: '网关下游从站无响应',
  1001: '响应报文不合法',
}

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

// -------------------------- 写入类型（带判别type） --------------------------
export interface WriteCoilOptions extends BaseWriteOptions {
  fn: WriteFn.WriteSingleCoil
  value: boolean | number // 单线圈 0/1
}
export interface WriteRegisterOptions extends BaseWriteOptions {
  fn: WriteFn.WriteSingleRegister
  value: number // 单寄存器 0~65535
}
export interface WriteCoilsOptions extends BaseWriteOptions {
  fn: WriteFn.WriteMultipleCoils
  value: boolean[] | number[] // 多线圈数组
}
export interface WriteRegistersOptions extends BaseWriteOptions {
  fn: WriteFn.WriteMultipleRegisters
  value: number[] // 多寄存器数组
}

export type WriteOptions =
  | WriteCoilOptions
  | WriteRegisterOptions
  | WriteCoilsOptions
  | WriteRegistersOptions
