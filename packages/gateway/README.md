# @hmi-ts/gateway

WebSocket to TCP Modbus relay gateway for browser clients.

## Installation

```bash
pnpm add @hmi-ts/gateway
```

## Core Exports

- GatewayOptions
- ModbusGateway

## Minimal Example

```ts
import { ModbusGateway } from '@hmi-ts/gateway'

const gateway = new ModbusGateway({
  wsPort: 18080,
  plcHost: '127.0.0.1',
  plcPort: 502,
})

await gateway.start()
```

## Behavior

- Accepts browser WebSocket connections
- Relays binary frames to PLC over TCP
- Uses internal TCP connection pool for reuse

## Packages

- <a href="https://www.npmjs.com/package/@hmi-ts/client" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@hmi-ts/client?label=@hmi-ts/client"></a> high-level Modbus client
- <a href="https://www.npmjs.com/package/@hmi-ts/core" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@hmi-ts/core?label=@hmi-ts/core"></a> shared contracts, types, and errors
- <a href="https://www.npmjs.com/package/@hmi-ts/protocol" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@hmi-ts/protocol?label=@hmi-ts/protocol"></a> FC1/FC2/FC3/FC4/FC5/FC6/FC15/FC16 frame encode/decode for TCP/RTU/ASCII
- <a href="https://www.npmjs.com/package/@hmi-ts/scheduler" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@hmi-ts/scheduler?label=@hmi-ts/scheduler"></a> serial request queue with priority
- <a href="https://www.npmjs.com/package/@hmi-ts/subscription" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@hmi-ts/subscription?label=@hmi-ts/subscription"></a> polling engine and range merge
- <a href="https://www.npmjs.com/package/@hmi-ts/transport-tcp" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@hmi-ts/transport-tcp?label=@hmi-ts/transport-tcp"></a> Node TCP transport with reconnect
- <a href="https://www.npmjs.com/package/@hmi-ts/transport-udp" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@hmi-ts/transport-udp?label=@hmi-ts/transport-udp"></a> Node UDP transport
- <a href="https://www.npmjs.com/package/@hmi-ts/transport-ws" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@hmi-ts/transport-ws?label=@hmi-ts/transport-ws"></a> browser WebSocket transport with reconnect
- <a href="https://www.npmjs.com/package/@hmi-ts/electron-ipc-bridge" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@hmi-ts/electron-ipc-bridge?label=@hmi-ts/electron-ipc-bridge"></a> typed Electron main/renderer bridge
- <a href="https://www.npmjs.com/package/@hmi-ts/transport-electron-ipc" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@hmi-ts/transport-electron-ipc?label=@hmi-ts/transport-electron-ipc"></a> Electron IPC transport adapter
- <a href="https://www.npmjs.com/package/@hmi-ts/gateway" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@hmi-ts/gateway?label=@hmi-ts/gateway"></a> WebSocket to TCP binary relay gateway
- <a href="https://www.npmjs.com/package/@hmi-ts/codec" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@hmi-ts/codec?label=@hmi-ts/codec"></a> register-value codec helpers
- <a href="https://www.npmjs.com/package/@hmi-ts/utils" target="__blank"><img alt="NPM Version" src="https://img.shields.io/npm/v/@hmi-ts/utils?label=@hmi-ts/utils"></a> shared async and comparison utilities
