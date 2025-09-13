import { Container as ContainerClass } from "@cloudflare/containers";
import { env } from "cloudflare:workers";

export class Container extends ContainerClass {
  defaultPort = Number(env.PORT);
  sleepAfter = "1m";
  envVars = { PORT: env.PORT, JWT_PUBLIC_KEY: env.JWT_PUBLIC_KEY };
}

export default {
  async fetch(req: Request, env: CloudflareBindings) {
    const id = env.FLYIO_SSH_PROXY.idFromName("global");
    return env.FLYIO_SSH_PROXY.get(id).fetch(req);
  },
};
