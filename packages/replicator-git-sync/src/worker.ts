import { Container as ContainerClass } from "@cloudflare/containers";
import { env } from "cloudflare:workers";

export class Container extends ContainerClass {
  defaultPort = Number(env.PORT);
  envVars = { PORT: env.PORT, NODE_ENV: "production" };
}

export default {
  async fetch(req: Request, env: CloudflareBindings) {
    const id = env.REPLICATOR_GIT_SYNC.idFromName("global");
    return env.REPLICATOR_GIT_SYNC.get(id).fetch(req);
  },
};
