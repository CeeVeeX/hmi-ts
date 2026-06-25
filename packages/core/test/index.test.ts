import { describe, expect, it } from 'vitest'
import { ResponseCode } from '../src/index'

describe('name', () => {
  it('exports response codes', async () => {
    expect(ResponseCode.SUCCESS).toEqual(0)
  })
})
