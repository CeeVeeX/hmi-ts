export interface PacketFactory {
  encodeRead(options: BaseReadOptions): Uint8Array
  encodeWrite(options: BaseWriteOptions): Uint8Array
  mergeRead(options: BaseReadOptions[]): BaseReadOptions[]
  decodeResponse(data: Uint8Array): IResponse
}
