FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY src/ ./src/
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime
RUN apk add --no-cache git
RUN addgroup -S bmad && adduser -S bmad -G bmad
WORKDIR /app

COPY --from=builder --chown=bmad:bmad /app/build ./build
COPY --from=builder --chown=bmad:bmad /app/node_modules ./node_modules
COPY --chown=bmad:bmad package.json ./

USER bmad
EXPOSE ${PORT:-3000}
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3000}/health || exit 1

CMD ["node", "build/index-http.js"]
