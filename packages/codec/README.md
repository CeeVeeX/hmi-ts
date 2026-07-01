# @hmi-ts/codec

统一的字节编解码工具，采用“一种数据形态对应一组 encode/decode 主函数”的设计。

## Core API

- `encodeBoolean` / `decodeBoolean`
- `encodeBits` / `decodeBits`
- `encodeUint16` / `decodeUint16`
- `encodeInt16` / `decodeInt16`
- `encodeUint32` / `decodeUint32`
- `encodeInt32` / `decodeInt32`
- `encodeFloat32` / `decodeFloat32`
- `encodeFloat64` / `decodeFloat64`
- `encodeUint16Array` / `decodeUint16Array`
- `encodeAsciiBytes` / `decodeAsciiString`
- `uint8ToHex`
