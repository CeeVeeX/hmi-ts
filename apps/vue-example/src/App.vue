<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { HmiButton } from '@hmi-ts/vue-components'

const button = ref<HTMLButtonElement>()

function useButton(btn: HTMLElement) {
  console.log('Button element:', btn)

  btn.addEventListener('contextmenu', (e) => e.preventDefault())
  btn.addEventListener('selectstart', (e) => e.preventDefault())

  // 配置参数，按需调整
  const CONFIG = {
    moveTolerance: 30, // 滑动容忍像素，小于此距离不算滑出取消
    cancelBufferMs: 120, // 断触缓冲延时，瞬时断触不立即取消
  }

  // 状态变量
  let state = {
    isPressing: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    bufferTimer: null,
  }

  // 清除缓冲定时器
  function clearBufferTimer() {
    if (state.bufferTimer) {
      clearTimeout(state.bufferTimer)
      state.bufferTimer = null
    }
  }

  // 统一结束按压（抬起/最终取消）
  function endPress() {
    clearBufferTimer()
    if (!state.isPressing) return

    state.isPressing = false
    state.pointerId = null
    btn.classList.remove('pressing')
    console.log('按压结束')
  }

  // 按下
  btn.addEventListener('pointerdown', (e) => {
    // 只响应左键/单指触摸
    if (e.button !== 0 || state.isPressing) return
    e.preventDefault()
    clearBufferTimer()

    state.isPressing = true
    state.pointerId = e.pointerId
    state.startX = e.clientX
    state.startY = e.clientY

    // 捕获指针
    try {
      btn.setPointerCapture(e.pointerId)
    } catch (err) {}

    btn.classList.add('pressing')
    console.log('按下开始')
  })

  // 滑动判断偏移
  btn.addEventListener('pointermove', (e) => {
    if (!state.isPressing || e.pointerId !== state.pointerId) return

    // 计算滑动距离
    const dx = e.clientX - state.startX
    const dy = e.clientY - state.startY
    const dist = Math.sqrt(dx * dx + dy * dy)

    // 滑动超过容忍值，准备缓冲取消
    if (dist > CONFIG.moveTolerance) {
      clearBufferTimer()
      state.bufferTimer = setTimeout(() => {
        endPress()
        console.log('滑动超出阈值，取消按压')
      }, CONFIG.cancelBufferMs)
    } else {
      // 小幅滑动，清除取消缓冲，保持按压
      clearBufferTimer()
    }
  })

  // 正常抬起
  btn.addEventListener('pointerup', (e) => {
    if (!state.isPressing || e.pointerId !== state.pointerId) return
    try {
      btn.releasePointerCapture(e.pointerId)
    } catch (err) {}
    endPress()
    console.log('正常抬起')
  })

  // 操作取消（断触、滑出、滚动、多指触发）
  btn.addEventListener('pointercancel', (e) => {
    if (!state.isPressing || e.pointerId !== state.pointerId) return
    // 不立刻结束，走缓冲延时，过滤瞬时断触
    clearBufferTimer()
    state.bufferTimer = setTimeout(() => {
      endPress()
      console.log('缓冲后判定取消（断触/滑出）')
    }, CONFIG.cancelBufferMs)
  })

  // 全局兜底：防止指针丢失，页面任意位置松开都重置
  document.addEventListener('pointerup', () => {
    if (state.isPressing) endPress()
  })
}

onMounted(() => {
  if (button.value) {
    useButton(button.value)
  }
})
</script>

<template>
  <div class="app">
    <button ref="button">Increment</button>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #333;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

header {
  background: rgba(255, 255, 255, 0.95);
  padding: 3rem 2rem;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

header h1 {
  margin: 0;
  font-size: 2.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

header p {
  margin: 0.5rem 0 0;
  color: #666;
  font-size: 1.1rem;
}

main {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

section h2 {
  margin-top: 0;
  color: #667eea;
  border-bottom: 2px solid #667eea;
  padding-bottom: 0.5rem;
}

.counter strong {
  color: #764ba2;
  font-size: 1.5rem;
}

.buttons {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
}

button {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  border: none;
  border-radius: 6px;
  background: #667eea;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
}

button:hover {
  background: #764ba2;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(118, 75, 162, 0.4);
}

button:active {
  transform: translateY(0);
}

.info ul {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
}

.info li {
  padding: 0.5rem 0;
  font-size: 1.05rem;
  color: #555;
}

footer {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  text-align: center;
  padding: 1.5rem;
  margin-top: auto;
}

footer p {
  margin: 0;
}

@media (max-width: 768px) {
  header {
    padding: 2rem 1rem;
  }

  header h1 {
    font-size: 1.8rem;
  }

  main {
    padding: 1rem;
  }

  section {
    padding: 1.5rem;
  }

  .buttons {
    flex-direction: column;
  }

  button {
    width: 100%;
  }
}
</style>
