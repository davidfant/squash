import { Container as ContainerClass } from "@cloudflare/containers";

export class Container extends ContainerClass {
  defaultPort = 3000;
  envVars = { NODE_ENV: "production" };
}

export default {
  async fetch(req: Request, env: CloudflareBindings) {
    const id = env.FLYIO_SSH_PROXY.idFromName("global");
    return env.FLYIO_SSH_PROXY.get(id).fetch(req);
  },
};
