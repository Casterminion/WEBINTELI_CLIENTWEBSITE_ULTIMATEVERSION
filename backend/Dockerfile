# PDF worker. Build context MUST be this folder (`backend/`), not the monorepo root.
#
# Coolify: Base Directory = backend (or /backend). Dockerfile = Dockerfile
#
# From repo root (local):
#   docker build -f backend/Dockerfile ./backend

FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY assets ./assets
COPY src ./src

RUN npm run build

FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/assets ./assets

ENV PORT=3001
EXPOSE 3001

CMD ["node", "dist/server.js"]
