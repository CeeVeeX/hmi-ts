# HMI-TS Vue Example

这是一个基于 Vue 3 + TypeScript + Vite 的示例应用，展示如何在 HMI-TS 项目中使用 Vue 框架。

## 功能特性

- ✨ Vue 3 Composition API
- 🎯 TypeScript 支持
- ⚡ Vite 快速开发服务器
- 🎨 现代化 UI 设计
- 📱 响应式布局

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
pnpm dev
```

开发服务器将在 `http://localhost:5173` 启动。

### 构建生产版本

```bash
pnpm build
```

构建输出将在 `dist` 目录中。

### 预览生产构建

```bash
pnpm preview
```

### 类型检查

```bash
pnpm typecheck
```

### 代码检查和修复

```bash
pnpm lint
```

## 项目结构

```
src/
├── App.vue          # 主应用组件
├── main.ts          # 应用入口
index.html          # HTML 模板
vite.config.ts      # Vite 配置
tsconfig.json       # TypeScript 配置
```

## 从父级工作区运行

在项目根目录运行以下命令启动此示例：

```bash
pnpm dev:vue-example
```

## 相关文档

- [Vue 3 官方文档](https://vuejs.org/)
- [Vite 官方文档](https://vitejs.dev/)
- [HMI-TS 仓库](https://github.com/ceeveex/hmi-ts)
