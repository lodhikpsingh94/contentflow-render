FROM node:18-alpine

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser -S analytics-service -u 1001

# Copy package files — Package.json has capital P on Windows; rename it here
COPY Package.json ./package.json
COPY package-lock.json ./
RUN npm install --omit=dev --legacy-peer-deps && npm cache clean --force

COPY src/ ./src/

RUN mkdir -p logs && chown -R analytics-service:nodejs /app
USER analytics-service

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3005/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

EXPOSE 3005

CMD ["node", "src/app.js"]
