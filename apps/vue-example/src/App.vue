<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue'
import { createIntentPress } from './nope-click'

const button = ref<HTMLButtonElement>()
const button2 = ref<HTMLButtonElement>()

function useClick<B = boolean>(
  el: Ref<HTMLElement | undefined>,
  options?: {
    branch?: B[]
  },
) {
  const branch = (options?.branch ?? [true, false]) as B[]
  const active = ref(0)
  const status = ref<'start' | 'cancel' | 'intent'>('cancel')
  const down = ref(false)
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

    down.value = false
    endAt = Date.now()
    lasted.value = endAt - startAt
    clickCount.value += 1

    active.value = (active.value + 1) % branch.length
  }

  const press = createIntentPress(
    (e) => {
      status.value = e.phase
      switch (e.phase) {
        case 'start':
          down.value = true
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
    down,
    status,
    lasted,
    clickCount,
    active: computed(() => branch[active.value]),
  }
}

const b1 = useClick(button)
const b2 = useClick(button2, {
  branch: ['A', 'B', 'C'],
})
</script>

<template>
  <div class="app">
    <div class="around" ref="button">
      <div class="handle" :class="{ pressed: b1.down.value }">
        <div class="button-wrapper" :class="{ pressed: b1.down.value }">
          <div class="inside">
            {{ b1.status.value }} {{ b1.lasted.value }} {{ b1.clickCount.value }}
            {{ b1.active.value }}
            {{ b1.down.value }}
          </div>
        </div>
      </div>
    </div>

    <div class="around" ref="button2">
      <div class="handle" :class="{ pressed: b2.down.value }">
        <div class="button-wrapper" :class="{ pressed: b2.down.value }">
          <div class="inside">
            {{ b2.status.value }} {{ b2.lasted.value }} {{ b2.clickCount.value }}
            {{ b2.active.value }}
            {{ b2.down.value }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
}

.app {
  min-height: 100vh;
  background: linear-gradient(135deg, #313539 0%, #4a5559 100%);
  color: #333;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.around {
  width: 180px;
  height: 180px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 10%;
  background-image: linear-gradient(180deg, #f5f8fa, #9da4a8);

  .handle {
    width: 155px;
    height: 155px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 10%;
    background: #c5d1da;
    box-shadow:
      0 0 10px rgba(0, 0, 0, 0.5),
      0 10px 10px rgba(0, 0, 0, 0.2),
      inset 0 0 16px rgba(0, 0, 0, 0.85),
      inset 0 0 24px rgba(0, 0, 0, 0.75),
      inset 0 0 48px rgba(0, 0, 0, 0.2);

    perspective: 300px;

    .button-wrapper {
      width: 147px;
      height: 147px;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 10%;
      background-image: linear-gradient(180deg, #eff1f1, #86969c);

      cursor: pointer;

      box-shadow:
        0 9px 14px rgba(0, 0, 0, 0.5),
        0 19px 8px -2px rgba(0, 0, 0, 0.2),
        0 33px 8px rgba(0, 0, 0, 0.4),
        0 -12px 10px rgba(255, 255, 255, 0.5),
        inset 0 3px 3px rgba(255, 255, 255, 0.6),
        inset 0 -3px 3px rgba(89, 91, 92, 0.6);

      transition:
        transform 0.05s ease,
        box-shadow 0.05s ease,
        filter 0.05s ease;

      .inside {
        position: relative;
        width: 132px;
        height: 132px;
        border-radius: 50%;
        background-image: linear-gradient(180deg, #adb9bf, #d4dbdd);

        box-shadow:
          inset 0 3px 6px rgba(152, 160, 163, 0.4),
          inset 0 -3px 6px rgba(238, 244, 246, 0.4);

        transition:
          transform 0.05s ease,
          box-shadow 0.05s ease,
          background 0.05s ease;
      }

      &.pressed {
        transform: scale(0.985);

        filter: brightness(0.97);

        box-shadow:
          0px 0px 14px rgba(0, 0, 0, 0.5),
          0px 0px 8px -2px rgba(0, 0, 0, 0.2),
          0px 6px 8px rgba(0, 0, 0, 0.4),
          0 -12px 10px rgba(255, 255, 255, 0.5),
          inset 0 3px 3px rgba(255, 255, 255, 0.6),
          inset 0 -3px 3px rgba(89, 91, 92, 0.6);

        .inside {
          background-image: linear-gradient(180deg, #99a7ad, #c7d0d4);

          box-shadow:
            inset 0 8px 10px rgba(0, 0, 0, 0.18),
            inset 0 -2px 2px rgba(255, 255, 255, 0.25);
        }
      }
    }

    &.pressed {
      box-shadow:
        0 0 10px rgba(0, 0, 0, 0.5),
        0 10px 10px rgba(0, 0, 0, 0.2),
        inset 0 0 16px rgba(0, 0, 0, 0.85),
        inset 0 0 24px rgba(0, 0, 0, 0.75),
        inset 0 0 48px rgba(0, 0, 0, 0.2);
    }
  }
}
</style>
