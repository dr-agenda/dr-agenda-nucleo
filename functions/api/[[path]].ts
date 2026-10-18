import { app } from '../../src/server/app';

interface PagesContext {
  request: Request;
  env: Record<string, any>;
  waitUntil: (promise: Promise<any>) => void;
  next: () => Promise<Response>;
}

export const onRequest = async (context: PagesContext): Promise<Response> => {
  return app.fetch(context.request, context.env as any, context as any);
};
