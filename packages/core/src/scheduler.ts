import { ConnectionClosedError, TimeoutError } from './error'
import type { RequestTask } from './request'

/**
 * 调度优先级常量。
 *
 * @example
 * ```ts
 * PRIORITY.write > PRIORITY.read // true
 * ```
 */
export const PRIORITY = {
  write: 100,
  read: 50,
  polling: 10,
} as const

/**
 * 串行请求调度器。
 *
 * - 同一时刻只执行一个任务
 * - 按优先级排序，优先级相同按任务 id 升序
 * - 支持超时与关闭清队列
 *
 * @example
 * ```ts
 * const scheduler = new RequestScheduler()
 * const result = await scheduler.schedule({
 *   id: 1,
 *   priority: PRIORITY.read,
 *   timeout: 1000,
 *   execute: async () => 123,
 *   resolve: () => {},
 *   reject: () => {},
 * })
 * ```
 */
export class RequestScheduler {
  private queue: RequestTask[] = []
  private inFlight = false
  private closed = false
  private dispatchScheduled = false

  schedule<T>(task: RequestTask<T>): Promise<T> {
    if (this.closed) {
      return Promise.reject(new ConnectionClosedError('scheduler is closed'))
    }

    return new Promise<T>((resolve, reject) => {
      const wrapped: RequestTask<T> = {
        ...task,
        resolve,
        reject,
      }
      this.queue.push(wrapped)
      // 写请求通常比读请求更紧急；同优先级下按 id 保证顺序稳定。
      this.queue.sort((a, b) => b.priority - a.priority || a.id - b.id)
      this.scheduleDispatch()
    })
  }

  clearPending(err: Error = new ConnectionClosedError()): void {
    const pending = this.queue.splice(0, this.queue.length)
    for (const task of pending) {
      task.reject(err)
    }
  }

  close(err: Error = new ConnectionClosedError()): void {
    this.closed = true
    this.clearPending(err)
  }

  private async runNext(): Promise<void> {
    if (this.inFlight || this.closed) {
      return
    }

    const task = this.queue.shift()
    if (!task) {
      return
    }

    this.inFlight = true
    try {
      // 通过 Promise.race 把任意 execute 实现统一纳入超时控制。
      // 注意：若 execute 先完成，超时计时器仍会在后台触发一次 reject，
      // 但不会影响已 settle 的 race 结果；这里以实现简洁为先。
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new TimeoutError(`task ${task.id} timeout`)), task.timeout)
      })

      // 任意 Promise 执行结果都会触发 resolve，若 execute 先完成，超时计时器仍会在后台触发一次 reject，但不会影响已
      const result = await Promise.race([task.execute(), timeoutPromise])

      task.resolve(result)
    } catch (error) {
      task.reject(error as Error)
    } finally {
      this.inFlight = false
      if (this.queue.length > 0 && !this.closed) {
        this.scheduleDispatch()
      }
    }
  }

  /**
   * 调度下一次任务执行。
   * 通过 microtask 合并同一事件循环内的多次 schedule，减少重复调度开销。
   * 若当前已有任务在执行，则不做任何操作。
   * 若队列为空，则不做任何操作。
   * 若调度器已关闭，则不做任何操作。
   */
  private scheduleDispatch(): void {
    if (this.dispatchScheduled || this.closed) {
      return
    }

    this.dispatchScheduled = true
    // 使用 microtask 合并同一事件循环内的多次 schedule，减少重复调度开销。
    queueMicrotask(() => {
      this.dispatchScheduled = false
      void this.runNext().catch(() => {
        // Errors are already routed via task.reject.
        console.log('runNext Err')
      })
    })
  }
}
