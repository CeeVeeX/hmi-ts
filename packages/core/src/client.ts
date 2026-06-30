import type { IDebugAgent } from './debug'
import type EventEmitter from './event'
import type { PacketFactory, ReadOptions, SubscribeUniqueOptions, WriteOptions } from './packet'
import type { IReadResponse, IResponse, IWriteResponse } from './response'
import type { RequestScheduler } from './scheduler'
import type { SubscriptionEngine } from './subscription'
import type { Transport } from './transport'
import type { PartialBy } from './type'

/**
 * 请求参数类型，包含读取和写入请求。
 */
export type RequestOptions<T extends PacketFactory> = ReadOptions<T> | WriteOptions<T>

/**
 * 读取请求参数类型，包含读取请求的所有字段，部分选填。
 */
export type PartialReadOptions<T extends PacketFactory> = PartialBy<
  ReadOptions<T>,
  'unitId' | 'timeout' | 'priority' | 'startAt' | 'frame' | 'id'
>

/**
 * 写入请求参数类型，包含写入请求的所有字段，部分选填。
 */
export type PartialWriteOptions<T extends PacketFactory> = PartialBy<
  WriteOptions<T>,
  'unitId' | 'timeout' | 'priority' | 'startAt' | 'frame' | 'id'
>

/**
 * 订阅请求参数类型，包含订阅请求的所有字段，部分选填。
 */
export type PartialSubscribeOptions<T extends PacketFactory> = PartialReadOptions<T> &
  PartialBy<SubscribeUniqueOptions<T>, 'interval'>

/**
 * 请求响应类型，包含读取和写入响应。
 */
export type RequestResponse<T extends PacketFactory> =
  | IReadResponse<ReadOptions<T>>
  | IWriteResponse<WriteOptions<T>>

// /**
//  * 飞行中请求响应类型，包含读取和写入响应。
//  */
// export type InFlightResponse<T extends PacketFactory> = IResponse<RequestOptions<T>>

// export interface InFlightTask<T extends PacketFactory> {
//   id: number
//   options: RequestOptions<T>
// }

export interface InFlight<T extends PacketFactory> {
  tk: {
    id: number
    options: ReadOptions<T> | WriteOptions<T>
  }
  resolve: (response: IResponse<ReadOptions<T>, WriteOptions<T>>) => void
  reject: (error: Error) => void
}

export interface ClientOptions<T extends PacketFactory> {
  clientId?: string
  packetFactory: T
  transport: Transport
  debugAgent?: IDebugAgent<T>
  maxQueueSize?: number
  defaultUnitId?: number
  defaultTimeout?: number
  defaultInterval?: number
}

export interface ClientEvent<T extends PacketFactory = PacketFactory> {
  // 连接事件
  connected: () => void
  disconnected: (error: Error) => void
  destroyed: (error: Error) => void
  timeout: (error: Error) => void
  error: (error: Error) => void
  // 请求/响应事件
  'write-before': (options: WriteOptions<T>) => void
  written: (options: WriteOptions<T>) => void
  'write-error': (options: WriteOptions<T>, error: Error) => void

  'read-before': (options: ReadOptions<T>) => void
  read: (options: ReadOptions<T>, response: IReadResponse<ReadOptions<T>>) => void
  'read-error': (options: ReadOptions<T>, error: Error) => void
}

export interface IClient<T extends PacketFactory> extends EventEmitter<ClientEvent<T>> {
  readonly clientId: string
  readonly scheduler: RequestScheduler
  readonly subscriptionEngine: SubscriptionEngine<PacketFactory>
  readonly inFlight: InFlight<T> | null
  readonly sequence: number
  readonly options: ClientOptions<T>

  connect(): Promise<void>
  close(): Promise<void>
  destroy(): Promise<void>

  read(options: PartialReadOptions<T>): Promise<IReadResponse<ReadOptions<T>>>
  write(options: PartialWriteOptions<T>): Promise<IWriteResponse<WriteOptions<T>>>
  subscribe(opts: PartialSubscribeOptions<T>): () => void
}
