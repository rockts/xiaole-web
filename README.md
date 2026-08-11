# Xiaole Web

小乐 AI 助手前端项目 - Vue 3 + Vite

## 🚀 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **Vite** - 下一代前端构建工具
- **Pinia** - Vue 状态管理
- **Vue Router** - 官方路由管理器
- **Axios** - HTTP 客户端

## 📖 使用指南

**[查看完整使用指南 →](./USAGE.md)**

想知道如何使用小乐 AI 管家？请查看详细的使用指南，包含：
- 对话功能使用方法
- 记忆、任务、文档管理
- 快捷键和高级功能
- 常见问题解答

## 📦 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 🌐 环境配置

```bash
# 开发环境 (.env.development)
VITE_API_BASE=          # 留空，使用 Vite 代理

# 生产环境 (.env.production)
VITE_API_BASE=https://api.leke.xyz
```

## 🏗️ 项目结构

```
xiaole-web/
├── public/          # 静态资源
├── src/
│   ├── components/  # Vue 组件
│   ├── views/       # 页面视图
│   ├── stores/      # Pinia 状态管理
│   ├── router/      # 路由配置
│   ├── services/    # API 服务
│   └── utils/       # 工具函数
├── index.html       # 入口 HTML
├── vite.config.js   # Vite 配置
└── package.json
```

## 🚢 部署

项目部署到 **Cloudflare Pages**：

- 生产地址: https://ai.leke.xyz
- 构建命令: `npm run build`
- 输出目录: `dist`

## 🔗 相关仓库

- [xiaole-backend](https://github.com/rockts/xiaole-backend) - 后端 API
- [xiaole-ai](https://github.com/rockts/xiaole-ai) - 项目文档

## 📄 License

MIT
