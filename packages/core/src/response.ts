/**
 * 标准化响应结构，覆盖读写成功与异常场景。
 */
export interface IResponse {
  transactionId: number
  unitId: number
  functionCode: number
  success: boolean
  registers?: number[]
  coils?: boolean[]
  discreteInputs?: boolean[]
  startAddress?: number
  quantity?: number
  value?: number
  coilValue?: boolean
  exceptionCode?: number
}
