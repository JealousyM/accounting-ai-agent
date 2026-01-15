# Development startup script for Windows
# Checks prerequisites and starts the application

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Accounting AI Agent..." -ForegroundColor Cyan

# Check Node.js version
Write-Host "📦 Checking Node.js version..." -ForegroundColor Yellow
$nodeVersion = (node -v).Substring(1).Split('.')[0]
if ([int]$nodeVersion -lt 18) {
    Write-Host "❌ Node.js 18 or higher is required" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Node.js version OK" -ForegroundColor Green

# Check if .env files exist
Write-Host "🔍 Checking environment files..." -ForegroundColor Yellow
if (-not (Test-Path "packages/api/.env")) {
    Write-Host "⚠️  API .env not found, copying from .env.example" -ForegroundColor Yellow
    Copy-Item "packages/api/.env.example" "packages/api/.env"
}

if (-not (Test-Path "packages/web/.env")) {
    Write-Host "⚠️  Web .env not found, copying from .env.example" -ForegroundColor Yellow
    Copy-Item "packages/web/.env.example" "packages/web/.env"
}
Write-Host "✓ Environment files OK" -ForegroundColor Green

# Check if Docker is running
Write-Host "🐳 Checking Docker..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "✓ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again" -ForegroundColor Yellow
    exit 1
}

# Check if PostgreSQL is running
Write-Host "🗄️  Checking PostgreSQL..." -ForegroundColor Yellow
$postgresRunning = docker ps --format "{{.Names}}" | Select-String -Pattern "postgres"
if (-not $postgresRunning) {
    Write-Host "⚠️  PostgreSQL not running, starting with docker-compose..." -ForegroundColor Yellow
    docker-compose up -d postgres
    Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}
Write-Host "✓ PostgreSQL is running" -ForegroundColor Green

# Check if Redis is running
Write-Host "📮 Checking Redis..." -ForegroundColor Yellow
$redisRunning = docker ps --format "{{.Names}}" | Select-String -Pattern "redis"
if (-not $redisRunning) {
    Write-Host "⚠️  Redis not running, starting with docker-compose..." -ForegroundColor Yellow
    docker-compose up -d redis
    Write-Host "Waiting for Redis to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}
Write-Host "✓ Redis is running" -ForegroundColor Green

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "📥 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Run database migrations
Write-Host "🔄 Running database migrations..." -ForegroundColor Yellow
Push-Location packages/api
npx prisma generate
npx prisma migrate deploy
Pop-Location
Write-Host "✓ Database migrations complete" -ForegroundColor Green

# Start the application
Write-Host ""
Write-Host "✨ All checks passed! Starting application..." -ForegroundColor Green
Write-Host ""
npm run dev
