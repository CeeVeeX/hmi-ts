import { describe, expect, it } from 'vitest'
import * as api from '../src/index'

describe('transport-tcp exports', () => {
  it('module is importable', () => {
    expect(api).toBeDefined()
  })
})
