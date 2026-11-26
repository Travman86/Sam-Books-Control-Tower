# Control Tower API server image for Cloudflare Containers.
#
# Built from the repository root (pnpm workspace). Only the API server and the
# workspace libraries it depends on are installed and built. Cloudflare
# Containers run linux/amd64 images.

FROM node:22-bookworm-slim AS build
RUN npm install --global pnpm@10.33.0
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile --filter "@workspace/api-server..." \
 && pnpm --filter @workspace/api-server run build

FROM node:22-bookworm-slim
RUN apt-get update \
 && apt-get install --yes --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    PORT=8080
# Bundled externals (@aws-sdk, @google-cloud, ...) resolve through the
# workspace node_modules, so the built tree is copied as a whole.
COPY --from=build /app /app
WORKDIR /app/artifacts/api-server
USER node
EXPOSE 8080
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
