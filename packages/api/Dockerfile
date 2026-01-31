# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY turbo.json ./

# Copy API package
COPY packages/api/package*.json ./packages/api/

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Copy API source
COPY packages/api ./packages/api

# Build
WORKDIR /app/packages/api
RUN npm run build

# Production stage
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files and lock file
COPY --from=builder /app/packages/api/package*.json ./

# Install production dependencies only
RUN --mount=type=cache,target=/root/.npm \
    npm install --only=production && npm cache clean --force

# Copy built files
COPY --from=builder /app/packages/api/dist ./dist

# Copy Prisma schema and generate client for this platform
COPY --from=builder /app/packages/api/prisma ./prisma
RUN npx prisma generate

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/index.js"]
