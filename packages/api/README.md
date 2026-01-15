# API Package

Backend for Accounting AI Agent.

## Installation

```bash
npm install
```

## Database Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update `DATABASE_URL` in `.env`

3. Run migrations:
```bash
npm run prisma:migrate
```

4. Seed database with test data:
```bash
npm run prisma:seed
```

## Development

```bash
# Start dev server
npm run dev

# Open Prisma Studio
npm run prisma:studio
```

## Testing

```bash
# Run tests
npm run test

# Tests with coverage
npm run test:coverage
```

## Build

```bash
npm run build
```

## Production

```bash
# Apply migrations
npm run prisma:migrate:prod

# Start server
npm start
```

## Documentation

- [API Endpoints](./docs/API.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Database Schema](./docs/DATABASE.md)
