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

# Build args for NEXT_PUBLIC_* variables (must be available at build time)
ARG NEXT_PUBLIC_API_URL=
ARG NEXT_PUBLIC_APP_NAME=Eksiegowy AI
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=
ARG NEXT_PUBLIC_GITHUB_CLIENT_ID=
ARG NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=
ARG NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY=
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID=
ARG NEXT_PUBLIC_MKTAI_SCRIPT_URL=
ARG NEXT_PUBLIC_MKTAI_TRACKING_ID=

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_GITHUB_CLIENT_ID=$NEXT_PUBLIC_GITHUB_CLIENT_ID
ENV NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=$NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY
ENV NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY=$NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID
ENV NEXT_PUBLIC_MKTAI_SCRIPT_URL=$NEXT_PUBLIC_MKTAI_SCRIPT_URL
ENV NEXT_PUBLIC_MKTAI_TRACKING_ID=$NEXT_PUBLIC_MKTAI_TRACKING_ID

# Build
WORKDIR /app/packages/web
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy standalone output (includes node_modules and server.js)
COPY --from=builder /app/packages/web/.next/standalone ./

# Copy static files and public assets
COPY --from=builder /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=builder /app/packages/web/public ./packages/web/public

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start Next.js standalone server
CMD ["node", "packages/web/server.js"]
