<script setup lang="ts">
import { ref } from 'vue'
import { HmiButton } from '@hmi-ts/vue-components'

const count = ref(0)

function increment() {
  count.value++
}

function decrement() {
  count.value--
}

function reset() {
  count.value = 0
}
</script>

<template>
  <div class="app">
    <header>
      <h1>HMI-TS Vue Example</h1>
      <p>欢迎使用 HMI-TS 工具集</p>
    </header>

    <main>
      <section class="counter">
        <h2>计数器示例</h2>
        <p>
          当前计数: <strong>{{ count }}</strong>
        </p>
        <div class="buttons">
          <HmiButton @click="increment">增加</HmiButton>
          <HmiButton variant="ghost" @click="decrement">减少</HmiButton>
          <HmiButton variant="ghost" @click="reset">重置</HmiButton>
        </div>
      </section>

      <section class="info">
        <h2>关于项目</h2>
        <ul>
          <li>🔧 基于 Vue 3 + TypeScript</li>
          <li>⚡ 使用 Vite 构建工具</li>
          <li>📦 适用于 Web HMI 的工具集</li>
          <li>🚀 高性能和开发体验</li>
        </ul>
      </section>
    </main>

    <footer>
      <p>© 2024 HMI-TS. MIT License</p>
    </footer>
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
