import type { GetPFR, PacketFactory, SubscribeOptions, SubscriptionGroup } from './packet'
import { ResponseCode, type IReadResponse } from './response'
import type { PartialBy } from './type'
import { sleep, uint8ArrayEquals } from './utils'

/**
 * 同一轮询周期的分组信息。
 *
 * @example
 * ```ts
 * const g: PollGroup = { interval: 500, subscriptions: new Map(), mergedRanges: [], running: false }
 * ```
 */
export interface PollGroup<T extends PacketFactory = PacketFactory> {
  interval: number
  subscriptions: Map<string, SubscriptionGroup<T>>
  mergedRanges: GetPFR<T>[]
  running: boolean
}

/**
 * 订阅引擎依赖项。
 *
 * @example
 * ```ts
 * const options: SubscriptionEngineOptions = {
 *   read: async (options: ReadOptions) => number[],
 * }
 * ```
 */
export interface SubscriptionEngineOptions<T extends PacketFactory> {
  packetFactory: T
  read: (options: GetPFR<T>) => Promise<IReadResponse<GetPFR<T>>>
  onError?: (error: Error) => void
}

/**
 * 订阅轮询引擎。
 *
 * - 同 interval 自动分组
 * - 同 unitId 的重叠地址自动合并
 * - 仅在数据变化时触发回调
 *
 * @example
 * ```ts
 * const engine = new SubscriptionEngine({ readRegisters: async () => [1, 2, 3] })
 * const unsub = engine.subscribe({ unitId: 1, start: 0, length: 2, interval: 500, callback: console.log })
 * engine.start()
 * unsub()
 * engine.stop()
 * ```
 */
export class SubscriptionEngine<T extends PacketFactory> {
  private groups = new Map<number, PollGroup<T>>()
  private running = false
  private seq = 0

  constructor(private readonly options: SubscriptionEngineOptions<T>) {}

  subscribe(params: PartialBy<SubscribeOptions<T>, 'id'>): () => void {
    const id = `sub-${++this.seq}`
    const sub = {
      ...params,
      id,
    } as SubscriptionGroup<T>

    const group = this.ensureGroup(sub.interval)
    group.subscriptions.set(id, sub)
    group.mergedRanges = this.options.packetFactory.mergeRead([
      ...group.subscriptions.values(),
    ]) as GetPFR<T>[]

    return () => {
      group.subscriptions.delete(id)
      group.mergedRanges = this.options.packetFactory.mergeRead([
        ...group.subscriptions.values(),
      ]) as GetPFR<T>[]
    }
  }

  start(): void {
    if (this.running) {
      return
    }
    this.running = true
    for (const group of this.groups.values()) {
      if (!group.running) {
        group.running = true
        void this.runPollLoop(group)
      }
    }
  }

  stop(): void {
    this.running = false
    for (const group of this.groups.values()) {
      group.running = false
    }
  }

  getPollGroups(): PollGroup<T>[] {
    return [...this.groups.values()].map((group) => ({
      ...group,
      subscriptions: new Map(group.subscriptions),
      mergedRanges: [...group.mergedRanges],
    }))
  }

  private ensureGroup(interval: number): PollGroup<T> {
    const found = this.groups.get(interval)
    if (found) {
      if (this.running && !found.running) {
        found.running = true
        void this.runPollLoop(found)
      }
      return found
    }

    const created: PollGroup<T> = {
      interval,
      subscriptions: new Map(),
      mergedRanges: [],
      running: false,
    }
    this.groups.set(interval, created)

    if (this.running) {
      created.running = true
      void this.runPollLoop(created)
    }

    return created
  }

  private async runPollLoop(group: PollGroup<T>): Promise<void> {
    let nextTickAt = Date.now()
    while (this.running && group.running) {
      // 固定周期调度：用理论下次时间减当前时间，避免误差累计漂移。
      nextTickAt += group.interval
      try {
        await this.pollGroup(group)
      } catch (error) {
        this.options.onError?.(error as Error)
      }

      const delay = Math.max(0, nextTickAt - Date.now())
      await sleep(delay)
    }
  }

  private async pollGroup(group: PollGroup<T>): Promise<void> {
    if (group.subscriptions.size === 0) {
      return
    }

    group.mergedRanges = this.options.packetFactory.mergeRead([
      ...group.subscriptions.values(),
    ]) as GetPFR<T>[]

    for (const range of group.mergedRanges) {
      const res = await this.options.read(range)

      if (res.code !== ResponseCode.SUCCESS) continue

      // console.log('data:', uint8ToHex(res.data))

      for (const sub of group.subscriptions.values()) {
        // console.log(sub)

        if (sub.unitId !== range.unitId) {
          continue
        }

        const chunk = (() => {
          try {
            return this.options.packetFactory.sliceReadResponse(sub, res)
          } catch (error) {
            console.warn(error)
            return null
          }
        })()

        if (!chunk) {
          console.warn(`sub ${sub.id} sliceReadResponse returned null, skipping callback.`)
          continue
        }

        // console.log(`sub ${sub.id} callback:`, uint8ToHex(chunk))

        // 只在数据发生变化时触发回调，避免高频重复通知。
        if (!sub.lastData || !uint8ArrayEquals(sub.lastData, chunk)) {
          sub.lastData = chunk
          sub.callback({
            ...res,
            options: sub,
            data: chunk,
          })
        }
      }
    }
  }
}
