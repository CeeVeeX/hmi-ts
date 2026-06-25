import { describe, expect, it } from 'vitest'
import * as api from '../src/index'

describe('transport-udp exports', () => {
  it('module is importable', () => {
    expect(api).toBeDefined()
  })
})
