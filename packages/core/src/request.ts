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
