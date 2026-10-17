/**
 * Static app server.
 *
 * Realtime delivery, history and authorization all live in Supabase, so there
 * is no relay or write endpoint here: this process only serves the frontend.
 */

import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ViteDevServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.disable('x-powered-by');

  // Text-only app: no camera, microphone, geolocation or framing.
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/supabase/status', (_req: Request, res: Response) => {
    const configured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
    res.json({
      configured,
      credentialsSource: configured ? 'env' : 'missing',
      url: process.env.SUPABASE_URL || null,
    });
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite: ViteDevServer = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  Local:   http://localhost:${PORT}/\n`);
    console.log(`tg-enc server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
