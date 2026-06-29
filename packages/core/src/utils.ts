/**
 * 异步休眠指定毫秒。
 *
 * @param ms 休眠时长（毫秒）
 * @returns 休眠结束后 resolve 的 Promise
 *
 * @example
 * ```ts
 * await sleep(200)
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 延迟对象（Deferred），用于在外部手动触发 Promise 的完成/失败。
 *
 * @example
 * ```ts
 * const d = new Deferred<number>()
 * setTimeout(() => d.resolve(42), 100)
 * const value = await d.promise
 * ```
 */
export class Deferred<T> {
  promise: Promise<T>
  resolve!: (value: T) => void
  reject!: (error: Error) => void

  constructor() {
    this.promise = new Promise<T>((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }
}

/**
 * 比较两个 Uint8Array 是否逐项相等。
 * @param a 第一个 Uint8Array
 * @param b 第二个 Uint8Array
 * @returns 如果两个数组逐项相等，则返回 true，否则返回 false
 */
export function uint8ArrayEquals(a?: Uint8Array, b?: Uint8Array): boolean {
  if (!a || !b) return false
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

export function generateUUID(): string {
  // Generate a random UUID (version 4)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
