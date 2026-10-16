import type { ExecutionContext } from 'hono';
import { app } from './server/app';
import type { ServerEnv } from './server/db';

interface WorkerEnv extends ServerEnv {
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      return app.fetch(request, env, ctx);
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Dr Agenda Núcleos Worker API Activo', { status: 200 });
  },
};
