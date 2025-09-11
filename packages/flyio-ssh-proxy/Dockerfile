# bookworm bc flyctl is built w glibc, not musl
# FROM debian:bookworm-slim
FROM node:20-bookworm-slim

RUN apt-get update -y && \
    apt-get install -y --no-install-recommends \
        ca-certificates curl openssh-client tar && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

RUN curl -L https://fly.io/install.sh | sh

WORKDIR /app
COPY tsconfig.base.json ./
COPY pnpm-lock.yaml ./

WORKDIR /app/packages/flyio-ssh-proxy

COPY packages/flyio-ssh-proxy/package.json ./
COPY packages/flyio-ssh-proxy/tsconfig.json ./

RUN pnpm install

COPY packages/flyio-ssh-proxy/src/ ./src/

RUN pnpm build

ENV PORT=3000
EXPOSE $PORT

CMD ["node", "dist/index.js"]
