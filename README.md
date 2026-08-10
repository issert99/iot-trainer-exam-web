# 知测 · 考试系统 Web 端

基于 [Vue Vben Admin](https://www.vben.pro/)（`apps/web-antd`）的考试管理前端。

## 技术栈

- Vue 3 + Vite + TypeScript + Ant Design Vue
- Vben 布局 / 主题 / 权限路由

## 开发

```bash
pnpm install
pnpm dev
```

默认地址：[http://localhost:5666](http://localhost:5666)

`/api` 代理到 `http://127.0.0.1:3001/api`（见 `apps/web-antd/vite.config.mts`）。

## 脚本

| 命令              | 说明     |
| ----------------- | -------- |
| `pnpm dev`        | 启动开发 |
| `pnpm build:antd` | 生产构建 |

## 目录

- 业务应用：`apps/web-antd`
- 考试页面：`apps/web-antd/src/views/exam`
- 路由：`apps/web-antd/src/router/routes/modules`
