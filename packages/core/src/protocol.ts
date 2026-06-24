/**
 * 协议错误异常，用于帧格式、校验或字段解析失败。
 *
 * @example
 * ```ts
 * throw new ProtocolError('invalid mbap length')
 * ```
 */
export class ProtocolError extends Error {
  constructor(message = 'protocol error') {
    super(message)
    this.name = 'ProtocolError'
  }
}
