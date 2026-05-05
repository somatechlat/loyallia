FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy source
COPY src/ ./src/

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# Non-root user for security
RUN addgroup -S bridge && adduser -S bridge -G bridge
USER bridge

EXPOSE 3001

CMD ["node", "src/index.js"]
