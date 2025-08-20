FROM node:20-alpine

RUN apk add --no-cache \
    python3 \
    py3-pip \
    git \
    && pip3 install --break-system-packages --no-cache-dir git-remote-s3 \
    && corepack enable \
    && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY tsconfig.base.json ./
COPY pnpm-lock.yaml ./

WORKDIR /app/packages/replicator-git-sync

COPY packages/replicator-git-sync/package.json ./
COPY packages/replicator-git-sync/tsconfig.json ./

RUN pnpm install

COPY packages/replicator-git-sync/src/ ./src/
COPY packages/replicator-git-sync/worker-configuration.d.ts ./

RUN pnpm build

ENV PORT=3000
EXPOSE $PORT

CMD ["node", "dist/index.js"]
