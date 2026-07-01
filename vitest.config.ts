import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@hmi-ts/client': resolve(__dirname, 'packages/client/src/index.ts'),
      '@hmi-ts/codec': resolve(__dirname, 'packages/codec/src/index.ts'),
      '@hmi-ts/core': resolve(__dirname, 'packages/core/src/index.ts'),
      '@hmi-ts/debug-agent': resolve(__dirname, 'packages/debug-agent/src/index.ts'),
      '@hmi-ts/gateway': resolve(__dirname, 'packages/gateway/src/index.ts'),
      '@hmi-ts/protocol-mc-3e': resolve(__dirname, 'packages/protocol-mc-3e/src/index.ts'),
      '@hmi-ts/protocol-mc-4e': resolve(__dirname, 'packages/protocol-mc-4e/src/index.ts'),
      '@hmi-ts/protocol-modbus-ascii': resolve(
        __dirname,
        'packages/protocol-modbus-ascii/src/index.ts',
      ),
      '@hmi-ts/protocol-modbus-rtu': resolve(
        __dirname,
        'packages/protocol-modbus-rtu/src/index.ts',
      ),
      '@hmi-ts/protocol-modbus-tcp': resolve(
        __dirname,
        'packages/protocol-modbus-tcp/src/index.ts',
      ),
      '@hmi-ts/protocol-siemens-s7': resolve(
        __dirname,
        'packages/protocol-siemens-s7/src/index.ts',
      ),
      '@hmi-ts/transport-tcp': resolve(__dirname, 'packages/transport-tcp/src/index.ts'),
      '@hmi-ts/transport-udp': resolve(__dirname, 'packages/transport-udp/src/index.ts'),
      '@hmi-ts/transport-ws': resolve(__dirname, 'packages/transport-ws/src/index.ts'),
      '@hmi-ts/vue-components': resolve(__dirname, 'packages/vue-components/src/index.ts'),
      '@hmi-ts/vue-use': resolve(__dirname, 'packages/vue-use/src/index.ts'),
    },
  },
  test: {
    include: ['test/**/*.test.ts', 'packages/**/test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/**/src/**/*.ts'],
      exclude: ['packages/**/test/**'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
})
