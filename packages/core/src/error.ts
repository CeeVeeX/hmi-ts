/**
 * 订阅项定义，用于轮询引擎。
 *
 * @example
 * ```ts
 * const sub: Subscription = {
 *   id: 'sub-1',
 *   unitId: 1,
 *   start: 0,
 *   length: 4,
 *   interval: 500,
 *   callback: (registers) => console.log(registers),
 * }
 * ```
 */
// export interface Subscription {
//   id: string
//   unitId: number
//   start: number
//   length: number
//   interval: number
//   callback: (registers: number[]) => void
// }

/**
 * 请求超时异常。
 *
 * @example
 * ```ts
 * throw new TimeoutError('task 1 timeout')
 * ```
 */
export class TimeoutError extends Error {
  constructor(message = 'request timeout') {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * 连接关闭异常。
 *
 * @example
 * ```ts
 * throw new ConnectionClosedError('socket is closed')
 * ```
 */
export class ConnectionClosedError extends Error {
  constructor(message = 'connection closed') {
    super(message)
    this.name = 'ConnectionClosedError'
  }
}

/**
 * 队列溢出异常。
 *
 * @example
 * ```ts
 * throw new QueueOverflowError('request queue is full')
 * ```
 */
export class QueueOverflowError extends Error {
  constructor(message = 'request queue is full') {
    super(message)
    this.name = 'QueueOverflowError'
  }
}
