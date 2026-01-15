# Backend Architecture

## Technology Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL
- **Cache:** Redis
- **AI:** OpenAI GPT-4

## Project Structure

```
src/
├── controllers/    # HTTP controllers
├── services/       # Business logic
├── models/         # Data models
├── routes/         # API routes
├── middleware/     # Middleware functions
├── utils/          # Utilities
└── index.ts        # Entry point
```

## Application Layers

### 1. Routes Layer
Defines HTTP routes and connects them to controllers.

### 2. Controllers Layer
Handles HTTP requests, validates input data, calls services.

### 3. Services Layer
Contains application business logic.

### 4. Models Layer
Defines data structure and database interaction.

## Security

- JWT authentication
- Helmet for HTTP headers
- Rate limiting
- Input validation (Zod)
- SQL injection protection

## Monitoring

- Winston for logging
- Health check endpoint
- Error tracking
