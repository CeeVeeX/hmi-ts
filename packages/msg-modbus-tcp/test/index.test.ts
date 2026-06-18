import { describe, expect, it } from 'vitest'
import { foo } from '../src/index'

describe('name', () => {
  it('foo', async () => {
    expect(foo).toEqual('foo')
  })
})
