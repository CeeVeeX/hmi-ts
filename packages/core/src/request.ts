/**
 * 标准化请求描述，用于中间层或日志模块。
 * ```
 */
export interface IRequest {
  transactionId: number
  unitId: number
  functionCode: 1 | 2 | 3 | 4 | 5 | 6 | 15 | 16
  startAddress: number
  quantity?: number
  values?: number[]
  coilValue?: boolean
  coilValues?: boolean[]
}

/**
 * 调度器任务模型，定义执行体与完成回调。
 *
 * @example
 * ```ts
 * const task: RequestTask<number> = {
 *   id: 1,
 *   priority: 50,
 *   timeout: 1000,
 *   execute: async () => 123,
 *   resolve: () => {},
 *   reject: () => {},
 * }
 * ```
 */
export interface RequestTask<T = unknown> {
  id: number
  priority: number
  timeout: number
  execute(): Promise<T>
  resolve(value: T): void
  reject(err: Error): void
}
