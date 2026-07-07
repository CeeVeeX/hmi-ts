import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'
import { createIntentPress } from '../nope-click'

export function useClick<B = boolean>(
  el: Ref<HTMLElement | undefined>,
  options?: {
    branch?: B[]
  },
) {
  const branch = (options?.branch ?? [false, true]) as B[]
  const active = ref(0)
  const status = ref<'start' | 'cancel' | 'intent'>('cancel')
  const pressed = ref(false)
  const lasted = ref(0)
  const clickCount = ref(0)

  let startAt = Date.now()
  let endAt = Date.now()
  let timer: number | undefined

  function clearTimer() {
    if (timer) {
      clearInterval(timer)
      timer = undefined
    }

    pressed.value = false
    endAt = Date.now()
    lasted.value = 0
    clickCount.value += 1

    active.value = (active.value + 1) % branch.length
  }

  const press = createIntentPress(
    (e) => {
      status.value = e.phase
      switch (e.phase) {
        case 'start':
          pressed.value = true
          startAt = Date.now()
          timer = window.setInterval(() => {
            lasted.value = Date.now() - startAt
          }, 1000 / 60)

          if (startAt - endAt > 200) {
            clickCount.value = 0
          }

          break
        case 'cancel':
          clearTimer()
          break
        case 'intent':
          clearTimer()
          break
      }
    },
    {
      slop: 100,
      preventDefault: true,
      clickGuard: true,
    },
  )

  onMounted(() => {
    if (el.value) {
      el.value.addEventListener('contextmenu', (e) => e.preventDefault())
      el.value.addEventListener('selectstart', (e) => e.preventDefault())

      el.value.addEventListener('pointerdown', press.onPointerDown, { passive: true })
      el.value.addEventListener('click', press.onClickCapture, { capture: true })
    }
  })

  onUnmounted(() => {
    if (el.value) {
      el.value.removeEventListener('pointerdown', press.onPointerDown)
      el.value.removeEventListener('click', press.onClickCapture)
    }

    clearTimer()
  })

  return {
    pressed,
    status,
    lasted,
    clickCount,
    active: computed(() => branch[active.value]),
  }
}
