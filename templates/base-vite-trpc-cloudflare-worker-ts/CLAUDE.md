## Environment

The project is a Cloudflare Worker containing a Vite React app and a tRPC API. This will be deployed in a Cloudflare Worker and must run in workerd. While the nodejs_compat flag is enabled, all NodeJS features won't work. The full configuration lives in `wrangler.json`

Use pnpm as your package manager, not npm or yarn

Store environment variables in `.dev.vars`. When updating `.dev.vars` always run `pnpm typegen` afterwards so that Cloudflare Worker TypeScript types are updated correctly.
