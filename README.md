# 知测 · 考试系统 Web 端

基于官方 [Vue Vben Admin 5.7.0](https://github.com/vbenjs/vue-vben-admin)（`apps/web-antd`）。

## 开发

```bash
pnpm install
pnpm dev
# 或
pnpm run dev:antd
```

地址：[http://localhost:5666](http://localhost:5666)

`/api` → `http://127.0.0.1:3001/api`

## 说明

- 框架能力（主题、布局、锁屏顶栏按钮等）保持官方 Vben
- 登录对接考试后端 `/auth/login`、`/auth/me`
- 业务页：Analytics、工作台、用户管理、班级管理及占位模块
