#!/bin/bash

# Development startup script
# Checks prerequisites and starts the application

set -e

echo "🚀 Starting Accounting AI Agent..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js 18 or higher is required${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js version OK${NC}"

# Check if .env files exist
echo "🔍 Checking environment files..."
if [ ! -f "packages/api/.env" ]; then
    echo -e "${YELLOW}⚠️  API .env not found, copying from .env.example${NC}"
    cp packages/api/.env.example packages/api/.env
fi

if [ ! -f "packages/web/.env" ]; then
    echo -e "${YELLOW}⚠️  Web .env not found, copying from .env.example${NC}"
    cp packages/web/.env.example packages/web/.env
fi
echo -e "${GREEN}✓ Environment files OK${NC}"

# Check if Docker is running
echo "🐳 Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    echo "Please start Docker and try again"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Check if PostgreSQL is running
echo "🗄️  Checking PostgreSQL..."
if ! docker ps | grep -q postgres; then
    echo -e "${YELLOW}⚠️  PostgreSQL not running, starting with docker-compose...${NC}"
    docker-compose up -d postgres
    echo "Waiting for PostgreSQL to be ready..."
    sleep 5
fi
echo -e "${GREEN}✓ PostgreSQL is running${NC}"

# Check if Redis is running
echo "📮 Checking Redis..."
if ! docker ps | grep -q redis; then
    echo -e "${YELLOW}⚠️  Redis not running, starting with docker-compose...${NC}"
    docker-compose up -d redis
    echo "Waiting for Redis to be ready..."
    sleep 3
fi
echo -e "${GREEN}✓ Redis is running${NC}"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
fi

# Run database migrations
echo "🔄 Running database migrations..."
cd packages/api
npx prisma generate
npx prisma migrate deploy
cd ../..
echo -e "${GREEN}✓ Database migrations complete${NC}"

# Start the application
echo ""
echo -e "${GREEN}✨ All checks passed! Starting application...${NC}"
echo ""
npm run dev
