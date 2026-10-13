# syntax=docker/dockerfile:1

# The official multi-architecture image supplies the statically linked client.
ARG TUNNEL_CLIENT_IMAGE=ghcr.io/openai/tunnel-client:v0.0.15@sha256:119799b778ba8411a124f53588f9dc837fd62ba03e5fadf77d675123c92ab58e
FROM ${TUNNEL_CLIENT_IMAGE} AS tunnel-client

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src/ ./src/
COPY tests/ ./tests/
RUN npm run build

FROM node:22-bookworm-slim AS production-dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    DOTENV_CONFIG_QUIET=true \
    HEALTH_LISTEN_ADDR=0.0.0.0:8080 \
    ALLOW_REMOTE_UI=true \
    LOG_LEVEL=info \
    LOG_FORMAT=json \
    MCP_COMMAND="node /app/build/src/index.js"
COPY --from=tunnel-client /usr/bin/tunnel-client /usr/local/bin/tunnel-client
COPY --from=production-dependencies /app/node_modules ./node_modules/
COPY --from=build /app/build/src ./build/src/
COPY package.json ./
COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/bring-tunnel
COPY docker/healthcheck.cjs ./docker/healthcheck.cjs
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["node", "/app/docker/healthcheck.cjs"]
ENTRYPOINT ["bring-tunnel"]
CMD ["run", "--control-plane.api-key=env:CONTROL_PLANE_API_KEY"]
