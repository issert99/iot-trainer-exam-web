import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            // 考试系统后端（与原 NEXT_PUBLIC_API_BASE_URL 一致）
            target: 'http://127.0.0.1:3001/api',
            ws: true,
          },
        },
      },
    },
  };
});
