import type { BaseReadOptions, SubscribeOptions } from './options'
import type { PacketFactory } from './packet'
import { ResponseCode, type IReadResponse } from './response'
import { sleep, uint8ArrayEquals } from './utils'

/**
 * 带上次数据快照的订阅对象。
 *
 * @example
 * ```ts
 * const group: SubscriptionGroup = {
 *   id: 'sub-1', unitId: 1, start: 0, length: 2, interval: 500,
 *   callback: () => {}, lastData: [1, 2],
 * }
 * ```
 */
export interface SubscriptionGroup extends SubscribeOptions {
  id: string
  interval: number
  lastData?: Uint8Array
}

/**
 * 合并后的读取区间。
 *
 * @example
 * ```ts
 * const range: MergedRange = { unitId: 1, start: 0, length: 10 }
 * ```
 */
export interface MergedRange {
  unitId: number
  start: number
  length: number
}

/**
 * 同一轮询周期的分组信息。
 *
 * @example
 * ```ts
 * const g: PollGroup = { interval: 500, subscriptions: new Map(), mergedRanges: [], running: false }
 * ```
 */
export interface PollGroup {
  interval: number
  subscriptions: Map<string, SubscriptionGroup>
  mergedRanges: BaseReadOptions[]
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
  read: (
    options: Parameters<T['encodeRead']>[1],
  ) => Promise<IReadResponse<Parameters<T['encodeRead']>[1]>>
  onError?: (error: Error) => void
}

function makeRangeKey(unitId: number, start: number, length: number): string {
  return `${unitId}:${start}:${length}`
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
  private groups = new Map<number, PollGroup>()
  private running = false
  private seq = 0

  constructor(private readonly options: SubscriptionEngineOptions<T>) {}

  subscribe(params: SubscribeOptions): () => void {
    const id = `sub-${++this.seq}`
    const sub: SubscriptionGroup = {
      ...params,
      interval: params.interval ?? 0,
      id,
    }

    const group = this.ensureGroup(sub.interval)
    group.subscriptions.set(id, sub)
    // TODO: mergeSubscriptions 可能要放到报文库里实现
    // MergedRange 改成 ReadOptions
    group.mergedRanges = this.options.packetFactory.mergeRead([...group.subscriptions.values()])

    return () => {
      group.subscriptions.delete(id)
      group.mergedRanges = this.options.packetFactory.mergeRead([...group.subscriptions.values()])
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

  getPollGroups(): PollGroup[] {
    return [...this.groups.values()].map((group) => ({
      ...group,
      subscriptions: new Map(group.subscriptions),
      mergedRanges: [...group.mergedRanges],
    }))
  }

  private ensureGroup(interval: number): PollGroup {
    const found = this.groups.get(interval)
    if (found) {
      if (this.running && !found.running) {
        found.running = true
        void this.runPollLoop(found)
      }
      return found
    }

    const created: PollGroup = {
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

  private mergeSubscriptions(subscriptions: Map<string, SubscriptionGroup>): MergedRange[] {
    const ranges = [...subscriptions.values()].sort(
      (a, b) => a.unitId - b.unitId || a.start - b.start,
    )

    const merged: MergedRange[] = []
    for (const range of ranges) {
      const prev = merged[merged.length - 1]
      if (!prev || prev.unitId !== range.unitId) {
        merged.push({ ...range })
        continue
      }

      const prevEnd = prev.start + prev.length
      const currentEnd = range.start + range.length
      // 若新区间和上一区间重叠（或紧邻），合并成一个连续读取区间以减少请求次数。
      if (range.start <= prevEnd) {
        prev.length = Math.max(prevEnd, currentEnd) - prev.start
      } else {
        merged.push({ ...range })
      }
    }

    const deduped = new Map<string, MergedRange>()
    for (const range of merged) {
      deduped.set(makeRangeKey(range.unitId, range.start, range.length), range)
    }
    return [...deduped.values()]
  }

  private async runPollLoop(group: PollGroup): Promise<void> {
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

  private async pollGroup(group: PollGroup): Promise<void> {
    if (group.subscriptions.size === 0) {
      return
    }

    group.mergedRanges = this.mergeSubscriptions(group.subscriptions)

    for (const range of group.mergedRanges) {
      const res = await this.options.read(range)

      if (res.code !== ResponseCode.SUCCESS) continue

      // console.log('data:', uint8ToHex(res.data))

      for (const sub of group.subscriptions.values()) {
        // console.log(sub)

        if (sub.unitId !== range.unitId) {
          continue
        }

        const chunk = this.options.packetFactory.sliceReadResponse(sub, res)

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
