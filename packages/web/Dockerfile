# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY turbo.json ./

# Copy web package
COPY packages/web/package*.json ./packages/web/

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Copy web source
COPY packages/web ./packages/web

# Ensure public directory exists
RUN mkdir -p /app/packages/web/public

# Build
WORKDIR /app/packages/web
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy node_modules from builder (already has production deps)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/web/node_modules ./node_modules

# Copy built files
COPY --from=builder /app/packages/web/.next ./.next
COPY --from=builder /app/packages/web/public ./public
COPY --from=builder /app/packages/web/package*.json ./
COPY --from=builder /app/packages/web/next.config.js ./

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start Next.js
CMD ["npm", "start"]
