import { describe, expect, it } from 'vitest'
import * as api from '../src/index'

describe('transport-ws exports', () => {
  it('module is importable', () => {
    expect(api).toBeDefined()
  })
})
