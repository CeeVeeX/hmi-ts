import EventEmitter from './event'
import type {
  PacketFactory,
  SubscribeOptions,
  SubscribeReadResponse,
  SubscriptionGroup,
  SubscriptionRelation,
} from './packet'
import { ResponseCode, type IReadResponse } from './response'
import { sleep, uint8ArrayEquals } from './utils'

/**
 * 同一轮询周期的分组信息。
 *
 * @example
 * ```ts
 * const g: PollGroup = { interval: 500, subscriptions: new Map(), relations: [], running: false }
 * ```
 */
export interface PollGroup<T extends PacketFactory = PacketFactory> {
  interval: number
  subscriptions: Map<string, SubscriptionGroup<T>>
  relations: SubscriptionRelation<T>[]
  running: boolean
}

export type SubscriptionEngineEvent<T extends PacketFactory = PacketFactory> = {
  'subscribe-before': (options: SubscribeOptions<T>) => void
  subscribed: (options: SubscribeOptions<T>) => void
  'subscription-error': (e: { options: SubscribeOptions<T>; error: string }) => void

  'unsubscribe-before': (options: SubscribeOptions<T>) => void
  unsubscribed: (options: SubscribeOptions<T>) => void
  'subscription-data': (response: IReadResponse<SubscribeOptions<T>>) => void
  'unsubscribe-error': (e: { options: SubscribeOptions<T>; error: string }) => void
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
 * const un = engine.subscribe({ unitId: 1, start: 0, length: 2, interval: 500, callback: console.log })
 * engine.start()
 * un()
 * engine.stop()
 * ```
 */
export class SubscriptionEngine<T extends PacketFactory> extends EventEmitter<
  SubscriptionEngineEvent<T>
> {
  private groups = new Map<number, PollGroup<T>>()
  private running = false
  private seq = 0

  constructor(
    private readonly options: {
      packetFactory: T
      read: (options: SubscribeOptions<T>) => Promise<IReadResponse<SubscribeOptions<T>>>
      onError?: (error: Error) => void
    },
  ) {
    super()
  }

  subscribe(params: SubscribeOptions<T>): () => void {
    const subId = `sub-${++this.seq}`
    const sub = {
      ...params,
      subId,
    } as SubscriptionGroup<T>

    const group = this.ensureGroup(sub.interval)
    group.subscriptions.set(subId, sub)
    group.relations = this.options.packetFactory.mergeSubscriptionRelations([
      ...group.subscriptions.values(),
    ])

    return () => {
      group.subscriptions.delete(subId)
      group.relations = this.options.packetFactory.mergeSubscriptionRelations([
        ...group.subscriptions.values(),
      ])
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
      relations: group.relations.map((relation) => ({
        range: { ...relation.range },
        subscriptions: [...relation.subscriptions],
      })),
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
      relations: [],
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
        const err = error as Error
        // 订阅超时属于可恢复场景：仅提示并继续下一轮，避免把轮询判定为致命失败。
        if (err.name === 'TimeoutError') {
          console.warn(`[subscription] poll timeout in group(${group.interval}ms): ${err.message}`)
        } else {
          this.options.onError?.(err)
        }
      }

      const delay = Math.max(0, nextTickAt - Date.now())
      await sleep(delay)
    }
  }

  private async pollGroup(group: PollGroup<T>): Promise<void> {
    if (group.subscriptions.size === 0) {
      return
    }

    group.relations = this.options.packetFactory.mergeSubscriptionRelations([
      ...group.subscriptions.values(),
    ])

    for (const relation of group.relations) {
      const { range } = relation
      // frame 在内部生成，range 没有 frame 属性
      let res: IReadResponse<SubscribeOptions<T>>
      try {
        res = await this.options.read(range)
      } catch (error) {
        const err = error as Error
        // 订阅读超时属于可恢复情况：记录后继续，不中断整个轮询链。
        if (err.name === 'TimeoutError') {
          console.warn(`[subscription] read timeout in relation, skip this tick: ${err.message}`)
        } else {
          this.options.onError?.(err)
        }
        continue
      }

      if (res.code !== ResponseCode.SUCCESS) continue

      // console.log('data:', uint8ToHex(res.data))

      for (const sub of relation.subscriptions) {
        // console.log(sub)

        const chunk = (() => {
          try {
            return this.options.packetFactory.sliceReadResponse(sub, res)
          } catch (error) {
            console.warn(error)
            return null
          }
        })()

        if (!chunk) {
          console.warn(`sub ${sub.subId} sliceReadResponse returned null, skipping callback.`)
          continue
        }

        // console.log(`sub ${sub.subId} callback:`, uint8ToHex(chunk))

        // 只在数据发生变化时触发回调，避免高频重复通知。
        if (!sub.lastData || !uint8ArrayEquals(sub.lastData, chunk)) {
          sub.lastData = chunk
          const d = {
            ...res,
            data: chunk,
            callback: undefined, // 避免回调函数被传递给用户，导致循环引用
          } as unknown as SubscribeReadResponse<T>

          sub.callback(d)
        }
      }
    }
  }
}
