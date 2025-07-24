ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-alpine AS deps

ARG NPM_TOKEN
ENV NPM_TOKEN=${NPM_TOKEN}

# RUN apk add --no-cache curl ca-certificates git \
#  && curl -fsSL https://code-server.dev/install.sh | sh \
#  && rm -rf /var/cache/apk/*

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
ENV NODE_ENV=development

ENV CODESERVER_PORT=8080
ENV PASSWORD=""

EXPOSE 8080
CMD bash -c 'code-server --bind-addr 0.0.0.0:${CODESERVER_PORT} /app --disable-telemetry --auth ${PASSWORD:+password}'

COPY . .
CMD ["pnpm", "dev"]

# CMD ["node", "-e", "console.log('deps ready')"]
