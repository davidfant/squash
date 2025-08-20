import { Container as ContainerClass } from "@cloudflare/containers";

export class Container extends ContainerClass {
  defaultPort = 3000;
  envVars = {
    NODE_ENV: "production",
  };
}

export default {
  async fetch(req: Request, env: CloudflareBindings) {
    const id = env.REPLICATOR_GIT_SYNC.idFromName("global");
    return env.REPLICATOR_GIT_SYNC.get(id).fetch(req);
  },
};
