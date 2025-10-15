import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../worker";

export const trpc = createTRPCReact<AppRouter>();
