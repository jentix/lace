FROM node:24.12.0-bookworm-slim

RUN apt-get update \
    && apt-get install --yes --no-install-recommends build-essential python3 \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@12.3.4
WORKDIR /opt/lace/workspace
COPY . .
RUN pnpm install --frozen-lockfile \
    && pnpm --filter @lacecms/app-api... build \
    && pnpm --filter @lacecms/app-admin build

ENV NODE_ENV=production \
    LACE_ADMIN_DIST=/opt/lace/workspace/apps/admin/dist
EXPOSE 3000
CMD ["node", "apps/api/dist/production.js"]
