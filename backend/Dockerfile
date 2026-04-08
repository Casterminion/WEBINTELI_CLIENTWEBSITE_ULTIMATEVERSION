# PDF worker only. Build context MUST be the repository ROOT (not this folder):
#   docker build -f backend/Dockerfile .
#
# Coolify: Base Directory = empty / repo root. Dockerfile = backend/Dockerfile
# (Netlify ignores this file; it builds Next from package.json, not Docker.)

FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/tsconfig.json ./
COPY backend/src ./src

RUN npm run build

FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

ENV PORT=3001
EXPOSE 3001

CMD ["node", "dist/server.js"]
