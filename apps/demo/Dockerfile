FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/ packages/
COPY apps/ apps/
COPY tsconfig.base.json ./

FROM base AS deps
RUN npm ci --ignore-scripts

FROM deps AS build
RUN npm run build --workspaces --if-present

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/packages/ai-core/dist ./packages/ai-core/dist
COPY --from=build /app/packages/types/dist ./packages/types/dist
COPY --from=build /app/packages/connector-mongo/dist ./packages/connector-mongo/dist
COPY --from=build /app/packages/connector-pg/dist ./packages/connector-pg/dist
COPY --from=deps /app/packages/ai-core/package.json ./packages/ai-core/
COPY --from=deps /app/packages/types/package.json ./packages/types/
COPY --from=deps /app/packages/connector-mongo/package.json ./packages/connector-mongo/
COPY --from=deps /app/packages/connector-pg/package.json ./packages/connector-pg/
COPY apps/demo/package.json ./apps/demo/
COPY apps/demo/dist ./apps/demo/dist
EXPOSE 3000
CMD ["node", "apps/demo/dist/server.js"]
