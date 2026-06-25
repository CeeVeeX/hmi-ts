import { describe, expect, it } from 'vitest'
import * as api from '../src/index'

describe('codec exports', () => {
  it('module is importable', () => {
    expect(api).toBeDefined()
  })
})
