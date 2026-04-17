# ---- Build Stage ----
FROM node:18-alpine AS builder

WORKDIR /app

# System dependencies needed for sharp (image processing)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ---- Production Stage ----
FROM node:18-alpine AS production

WORKDIR /app

# Runtime system dependencies
RUN apk add --no-cache ffmpeg imagemagick && \
    rm -rf /var/cache/apk/*

RUN addgroup -g 1001 -S nodejs && \
    adduser -S content-service -u 1001

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps && npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN mkdir -p logs storage && chown -R content-service:nodejs /app
USER content-service

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

EXPOSE 3002

CMD ["node", "dist/server.js"]
