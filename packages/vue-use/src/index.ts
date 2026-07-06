import { computed, onUnmounted, shallowRef, type Ref } from 'vue'
import { ResponseCode, type IClient } from '@hmi-ts/core'
import type { ITranscoder } from './transcoder'
export * from './transcoder'
export * from './use'

function defaultEquals(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true
  }

  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
    return a.every((item, index) => Object.is(item, b[index]))
  }

  return false
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDataRef<C extends IClient<any>, V>(options: {
  client: C
  getOptions: Parameters<C['read']>[0]
  setOptions: Parameters<C['write']>[0]
  transcoder: ITranscoder<V>
  value: V
  equals?: (a: V, b: V) => boolean
}): Ref<V> {
  const tcd = options.transcoder
  const equals = options.equals ?? (defaultEquals as (a: V, b: V) => boolean)

  const lastValue = shallowRef(options.value) as Ref<V>

  const un = options.client.subscribe({
    ...options.getOptions,
    callback: (data) => {
      if (data.code !== ResponseCode.SUCCESS) return

      const nextValue = tcd.decode(data.data)
      if (equals(nextValue, lastValue.value)) return

      lastValue.value = nextValue
    },
  })

  onUnmounted(un)

  return computed({
    get: () => lastValue.value,
    set: (value) => {
      if (equals(value, lastValue.value)) return

      lastValue.value = value

      options.client.write({
        ...options.setOptions,
        data: tcd.encode(value),
      })
    },
  })
}
