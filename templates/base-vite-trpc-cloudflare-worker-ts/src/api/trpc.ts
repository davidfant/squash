import { initTRPC } from "@trpc/server";

const t = initTRPC.context<{}>().create();

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

export const router = t.router;
export const procedure = t.procedure.use(loggerMiddleware);
