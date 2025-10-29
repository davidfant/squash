import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { clerk } from "./integrations/clerk";

export async function createContext({ req }: FetchCreateContextFnOptions) {
  const requestState = await clerk.authenticateRequest(req);
  return { auth: requestState.toAuth() };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

const loggerMiddleware = t.middleware(async ({ path, type, input, next }) => {
  console.log(
    JSON.stringify({
      message: `tRPC request`,
      type,
      path,
      input,
    })
  );
  const start = Date.now();

  const result = await next();

  const durationMs = Date.now() - start;
  console.log(
    JSON.stringify({
      message: `tRPC response`,
      type,
      path,
      input,
      durationMs,
      result: {
        ok: result.ok,
        error: result.ok
          ? undefined
          : {
              code: result.error.code,
              message: result.error.message,
              stack: result.error.stack,
            },
        data: result.ok ? result.data : undefined,
      },
    })
  );

  return result;
});

export const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.auth?.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});

export const isOrgMember = t.middleware(({ ctx, next }) => {
  if (!ctx.auth?.orgId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});

export const router = t.router;
export const procedure = t.procedure.use(loggerMiddleware);
