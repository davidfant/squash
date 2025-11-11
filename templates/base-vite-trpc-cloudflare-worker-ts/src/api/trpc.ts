import { initTRPC, TRPCError } from "@trpc/server";
import { env } from "cloudflare:workers";
import { randomUUID } from "crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { logger } from "./logger";

export interface Context {
  requestId: string;
  auth: { userId: string; orgId: string } | null;
}

export async function createContext(req: Request): Promise<Context> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const requestId = randomUUID();
  if (!token) return { requestId, auth: null };

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
    return { requestId, auth: { userId: payload.sub, orgId } };
  } catch (err) {
    logger.error("Error verifying token", {
      type: "auth-error",
      token,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
        cause: err.cause,
        code: err.code,
      },
    });
    return { requestId, auth: null };
  }
}

const t = initTRPC.context<Context>().create();

const loggerMiddleware = t.middleware(
  async ({ ctx, path, type, input, next }) => {
    logger.debug("tRPC request", {
      type: "trpc-request",
      id: ctx.requestId,
      path,
      input,
      auth: ctx.auth,
      requestType: type,
    });

    const start = Date.now();
    const result = await next();
    const duration = Date.now() - start;
    logger.debug("tRPC response", {
      type: "trpc-response",
      id: ctx.requestId,
      duration: duration,
      ok: result.ok,
      error: result.ok
        ? undefined
        : {
            code: result.error.code,
            message: result.error.message,
            stack: result.error.stack,
          },
      data: result.ok ? result.data : undefined,
    });

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
