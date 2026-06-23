import { describe, expect, it, vi } from 'vitest'
import library, { HmiButton, install } from '../src/index'

describe('@hmi-ts/vue-components', () => {
  it('exports component', () => {
    expect(HmiButton).toBeDefined()
    expect(HmiButton.name).toBe('HmiButton')
  })

  it('registers components through install', () => {
    const app = {
      component: vi.fn(),
    }

    install(app as never)

    expect(app.component).toHaveBeenCalledWith('HmiButton', HmiButton)
  })

  it('exports default plugin', () => {
    expect(library).toHaveProperty('install')
  })
})
