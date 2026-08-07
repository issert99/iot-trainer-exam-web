# 物联网实训箱 · 考试系统 Web 端

考试系统子系统的 Web 端项目。

## 技术栈

- **Next.js 16**（App Router）
- **React 19** + **TypeScript**
- **Tailwind CSS 4**
- 后续可接入：shadcn/ui、TanStack Query、Zustand

## 开发

要求 Node.js ≥ 20（推荐 22）。

```bash
npm install
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)。

## 脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 本地开发（Turbopack） |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产服务 |
| `npm run lint` | ESLint 检查 |

## 环境变量

复制 `.env.example` 为 `.env.local` 后按需修改：

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```
