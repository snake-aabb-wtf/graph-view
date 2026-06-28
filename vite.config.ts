import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * LLM 同源代理:拦截 /llm/* 路径,把请求转发到 VITE_LLM_DEFAULT_TARGET 指定的 endpoint,
 * 并把请求头里的 X-LLM-Authorization 转为真正的 Authorization 头。
 *
 * 这样:
 *  - 浏览器只发同源请求,前端拿不到目标 host,也不会被 CORS 拦
 *  - 用户 UI 输入的 API key 走同源 header,不进任何 .env 也不进 bundle
 *  - dev / prod 用同一套前端代码,切换不同 LLM provider 只改 .env 即可
 */
function llmProxyPlugin(): Plugin {
  return {
    name: 'graph-view-llm-proxy',
    configureServer(server) {
      const defaultTarget = process.env.VITE_LLM_DEFAULT_TARGET || 'https://api.openai.com';

      const handler: Connect.NextHandleFunction = async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/llm/')) return next();

        const url = req.url.slice(4) || '/'; // 去掉 /llm 前缀
        const target = defaultTarget.replace(/\/+$/, '');
        const fullUrl = target + url;

        // 收集 body
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', async () => {
          const body = Buffer.concat(chunks);
          const headers: Record<string, string> = {
            'Content-Type': req.headers['content-type'] || 'application/json',
            Accept: req.headers['accept'] || 'application/json',
          };
          // 透传真实 Authorization
          const xAuth = req.headers['x-llm-authorization'];
          if (xAuth) headers['Authorization'] = `Bearer ${xAuth}`;
          // 透传 anthropic-version 等自定义 header(以 x-llm- 开头的)
          for (const [k, v] of Object.entries(req.headers)) {
            if (k.startsWith('x-llm-') && k !== 'x-llm-authorization' && typeof v === 'string') {
              headers[k.slice(5)] = v;
            }
          }

          try {
            const upstream = await fetch(fullUrl, {
              method: req.method,
              headers,
              body: body.length ? body : undefined,
              duplex: 'half',
            });

            res.statusCode = upstream.status;
            upstream.headers.forEach((value, key) => {
              // 避免把 upstream 的 set-cookie / encoding 透传过来
              if (['content-encoding', 'transfer-encoding', 'connection'].includes(key)) return;
              res.setHeader(key, value);
            });

            if (!upstream.body) {
              res.end();
              return;
            }
            const reader = upstream.body.getReader();
            const pump = async () => {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(Buffer.from(value));
              }
              res.end();
            };
            pump().catch(err => {
              console.error('[llm proxy] stream error:', err);
              res.end();
            });
          } catch (err) {
            console.error('[llm proxy] fetch error:', err);
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: { message: `LLM proxy error: ${(err as Error).message}` } }));
          }
        });
        req.on('error', next);
      };

      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  plugins: [react(), llmProxyPlugin()],
  server: {
    port: 5174,
    open: false,
    strictPort: true,
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
});
