import type { CommonOptions } from './options'

/**
 * 调度器任务模型，定义执行体与完成回调。
 *
 * @example
 * ```ts
 * const task: RequestTask<number> = {
 *   id: 1,
 *   priority: 50,
 *   timeout: 1000,
 *   startAt: Date.now(),
 *   options: CommonOptions,
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
  startAt: number
  options: CommonOptions
  execute(startAt: RequestTask<T>): Promise<T>
  resolve(value: T): void
  reject(err: Error): void
}
