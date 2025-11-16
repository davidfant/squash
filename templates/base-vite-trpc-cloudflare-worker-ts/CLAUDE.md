## Environment

The project is a Cloudflare Worker containing a Vite React app in `src/app` and a tRPC API in `src/api`. This will be deployed in a Cloudflare Worker and must run in workerd. While the nodejs_compat flag is enabled, all NodeJS features won't work. The full configuration lives in `wrangler.json`

Use pnpm as your package manager, not npm or yarn

Store environment variables in `.env`. When updating `.env` always run `pnpm typegen` afterwards so that Cloudflare Worker TypeScript types are updated correctly.

### Components

You have access to all standard ShadCN components under `@/app/components/ui/...`. Below are some custom components that can be useful:

- `<ComposioToolkitLogo toolkit="linear" className="size-3" />` shows the logo of a Composio toolkit. Use this throughout the UI to make it clear to the user what integrations and toolkits are being used where.
