FROM node:24.12.0-bookworm-slim AS compile

RUN npm install --global pnpm@12.3.4
WORKDIR /build
COPY . .
RUN pnpm install --frozen-lockfile --filter @lacecms/app-builder... \
    && pnpm --filter @lacecms/app-builder build

FROM node:24.12.0-bookworm-slim
RUN npm install --global pnpm@12.3.4 \
    && mkdir -p /source /work /output \
    && chown -R node:node /work /output
COPY --from=compile /build/apps/builder/dist /opt/lace-builder/dist
USER node
WORKDIR /opt/lace-builder
EXPOSE 8788
CMD ["node", "dist/main.js"]
