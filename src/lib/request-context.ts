import { AsyncLocalStorage } from "node:async_hooks";

type RequestContext = {
  requestId: string;
  userId?: string;
};

const als = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return als.run(ctx, fn);
}

export function getRequestContext(): RequestContext | undefined {
  return als.getStore();
}

export function setUserId(userId: string): void {
  const store = als.getStore();
  if (store) {
    store.userId = userId;
  }
}
