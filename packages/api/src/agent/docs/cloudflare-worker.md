# Cloudflare Worker Environment

The repo is a Cloudflare Worker project and will be deployed in a Cloudflare Worker and must run in `workerd`. While the nodejs_compat flag is enabled, all NodeJS features won't work. The full configuration lives in `wrangler.json`. You are not allowed to use Cloudflare D1, KV or DurableObjects in this project.

Use pnpm as your package manager, not npm or yarn

---

Store environment variables in `.env`. When updating `.env` always run `pnpm typegen` afterwards so that Cloudflare Worker TypeScript types are updated correctly.
