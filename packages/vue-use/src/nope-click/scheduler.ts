/* eslint-disable @typescript-eslint/no-explicit-any */
export interface IdleDeadlineLike {
  timeRemaining(): number
  didTimeout: boolean
}

export type IdleCallbackHandle = number

export const canUseDOM = (): boolean =>
  typeof window !== 'undefined' && typeof document !== 'undefined'

export const queueMicrotaskSafe = (fn: () => void): void => {
  if (typeof queueMicrotask === 'function') queueMicrotask(fn)
  else
    Promise.resolve()
      .then(fn)
      .catch(() => void 0)
}

export const requestIdle = (
  fn: (d: IdleDeadlineLike) => void,
  timeoutMs = 200,
): IdleCallbackHandle => {
  const w = typeof window !== 'undefined' ? window : undefined

  if (w && 'requestIdleCallback' in w && typeof (w as any).requestIdleCallback === 'function') {
    return (w as any).requestIdleCallback(fn, { timeout: timeoutMs })
  }

  const start = Date.now()
  return (w?.setTimeout ?? setTimeout)(() => {
    fn({
      didTimeout: Date.now() - start >= timeoutMs,
      timeRemaining: () => 0,
    })
  }, 16) as unknown as number
}

export const cancelIdle = (handle: IdleCallbackHandle): void => {
  const w = typeof window !== 'undefined' ? window : undefined

  if (w && 'cancelIdleCallback' in w && typeof (w as any).cancelIdleCallback === 'function') {
    ;(w as any).cancelIdleCallback(handle)
    return
  }

  ;(w?.clearTimeout ?? clearTimeout)(handle as unknown as any)
}
