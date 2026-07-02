import { ref, type Ref } from 'vue'
import type { ITranscoder } from './transcoder'
export * from './transcoder'

export function useDataRef<T>(transcoder: ITranscoder<T>, value: T): Ref<T> {
  const tcd = transcoder

  const v = ref(value)

  return v as Ref<T>
}
