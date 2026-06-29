import type EventEmitter from './event'

export interface ICommandPayload {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export interface IDebugAgent extends EventEmitter<{
  connected: () => void
  disconnected: (error: Error) => void
  destroyed: (error: Error) => void
  error: (error: Error) => void
  command: (command: string, payload: ICommandPayload) => void
}> {
  readonly clientId?: string
  connect(clientId: string): Promise<void>
  // 连接状态日志
  // 请求/响应日志
  // 订阅引擎日志
  // 调度器日志
  push(command: string, payload: ICommandPayload): void

  report(uuid: string, payload: ICommandPayload): void
}
