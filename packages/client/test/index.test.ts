import { describe, expect, it } from 'vitest'
import * as api from '../src/index'

describe('client exports', () => {
  it('module is importable', () => {
    expect(api).toBeDefined()
  })
})
