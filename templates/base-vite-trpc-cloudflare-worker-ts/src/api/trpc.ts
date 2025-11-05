import { initTRPC, TRPCError } from "@trpc/server";
import { env } from "cloudflare:workers";
import { createRemoteJWKSet, jwtVerify } from "jose";

export interface Context {
  auth: { userId: string; orgId: string } | null;
}

export async function createContext(req: Request): Promise<Context> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { auth: null };

  const jwksUrl = new URL(`${env.JWT_ISSUER}/.well-known/jwks.json`);
  const JWKS = createRemoteJWKSet(jwksUrl);
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: env.JWT_ISSUER,
    });

    const orgId = (payload as any).o?.id ?? null;
    if (!payload.sub) {
      throw new Error("No user ID found");
    }
    if (!orgId) {
      throw new Error("No organization ID found");
    }
    return { auth: { userId: payload.sub, orgId } };
  } catch (err) {
    console.error(
      JSON.stringify({
        message: "Error verifying token",
        error: {
          name: err.name,
          message: err.message,
          stack: err.stack,
          cause: err.cause,
          code: err.code,
        },
        token,
      })
    );
    return { auth: null };
  }
}

const t = initTRPC.context<Context>().create();

const loggerMiddleware = t.middleware(
  async ({ ctx, path, type, input, next }) => {
    console.log(
      JSON.stringify({
        message: `tRPC request`,
        type,
        path,
        input,
        auth: ctx.auth,
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
        auth: ctx.auth,
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
  }
);

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { auth: ctx.auth } });
});

export const router = t.router;
export const publicProcedure = t.procedure.use(loggerMiddleware);
export const protectedProcedure = publicProcedure.use(isAuthed);
