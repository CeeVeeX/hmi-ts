import { describe, it, expect } from 'vitest'

describe('@hmi-ts/vue-components - HmiKeyboard', () => {
  it('应该能够导入 HmiKeyboard 组件', async () => {
    const { default: HmiKeyboard } = await import('../src/components/HmiKeyboard.vue')
    expect(HmiKeyboard).toBeDefined()
    expect(HmiKeyboard.name).toBe('HmiKeyboard')
  })

  it('应该能够导入 KeyItem 接口', async () => {
    // KeyItem 接口定义在 HmiKeyboard.vue 中
    const { default: HmiKeyboard } = await import('../src/components/HmiKeyboard.vue')
    expect(HmiKeyboard).toBeDefined()
  })
})
