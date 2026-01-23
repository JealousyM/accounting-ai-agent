# Architecture Overview

The Accounting AI Agent is a full-stack monorepo application designed for AI-powered accounting automation with Polish wFirma system integration.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Next.js 15 Web Application                       │   │
│  │  • React 19 with Server Components                                   │   │
│  │  • Tailwind CSS v4 styling                                          │   │
│  │  • Internationalization (EN, PL, RU)                                │   │
│  │  • Zustand state management                                          │   │
│  │  • React Query for data fetching                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP/REST
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Express.js Backend                               │   │
│  │  • TypeScript with strict mode                                       │   │
│  │  • JWT + OAuth authentication                                        │   │
│  │  • Zod request validation                                            │   │
│  │  • Winston logging                                                   │   │
│  │  • Redis rate limiting                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                    │                    │
                    ▼                    ▼                    ▼
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│    AI LAYER          │ │   INTEGRATION LAYER  │ │   DATA LAYER         │
│  ┌────────────────┐  │ │  ┌────────────────┐  │ │  ┌────────────────┐  │
│  │   LangGraph    │  │ │  │    wFirma      │  │ │  │   PostgreSQL   │  │
│  │   Multi-Agent  │  │ │  │   API Client   │  │ │  │   + Prisma     │  │
│  │   System       │  │ │  │                │  │ │  │                │  │
│  │  ┌──────────┐  │  │ │  │  ┌──────────┐  │  │ │  │  ┌──────────┐  │  │
│  │  │ Router   │  │  │ │  │  │ Company  │  │  │ │  │  │  Users   │  │  │
│  │  │ Agent    │  │  │ │  │  │ Invoices │  │  │ │  │  │ Invoices │  │  │
│  │  └────┬─────┘  │  │ │  │  │ Payments │  │  │ │  │  │ Customers│  │  │
│  │       │        │  │ │  │  │ Expenses │  │  │ │  │  │  Cache   │  │  │
│  │  ┌────┴────┐   │  │ │  │  └──────────┘  │  │ │  │  └──────────┘  │  │
│  │  │ Domain  │   │  │ │  └────────────────┘  │ │  └────────────────┘  │
│  │  │ Agents  │   │  │ │                      │ │                      │
│  │  └─────────┘   │  │ │  ┌────────────────┐  │ │  ┌────────────────┐  │
│  │  • Contractor  │  │ │  │    Cache       │  │ │  │     Redis      │  │
│  │  • Financial   │  │ │  │    Service     │  │ │  │   Sessions     │  │
│  │  • Invoice     │  │ │  │   (TTL-based)  │  │ │  │   Rate Limit   │  │
│  │  • Tax         │  │ │  └────────────────┘  │ │  └────────────────┘  │
│  └────────────────┘  │ └──────────────────────┘ └──────────────────────┘
└──────────────────────┘
```

## Monorepo Structure

```
accounting-ai-agent/
├── packages/
│   ├── api/                    # Express.js Backend
│   │   ├── src/
│   │   │   ├── routes/         # API route definitions
│   │   │   ├── controllers/    # Request handlers
│   │   │   ├── services/       # Business logic
│   │   │   ├── middleware/     # Auth, validation, rate limiting
│   │   │   ├── agents/         # LangGraph AI agents
│   │   │   ├── tools/          # AI tool definitions
│   │   │   └── i18n/           # Backend translations
│   │   └── prisma/             # Database schema
│   │
│   └── web/                    # Next.js Frontend
│       └── src/
│           ├── app/            # App Router pages
│           ├── components/     # React components
│           ├── hooks/          # Custom hooks
│           ├── lib/            # Utilities & API client
│           └── i18n/           # Frontend translations
│
├── docs/                       # Technical documentation
├── scripts/                    # Development scripts
└── docker-compose.yml          # Docker services
```

## Technology Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime environment |
| Express.js | 4.x | Web framework |
| TypeScript | 5.x | Type safety |
| Prisma | 5.x | Database ORM |
| PostgreSQL | 16 | Primary database |
| Redis | 7.x | Sessions & rate limiting |
| LangGraph | 0.2.x | AI agent framework |
| LangChain | 0.3.x | LLM integrations |
| Zod | 3.x | Schema validation |
| Winston | 3.x | Logging |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15 | React framework |
| React | 19 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| Zustand | 4.x | State management |
| React Query | 5.x | Data fetching |
| React Hook Form | 7.x | Form handling |
| next-intl | 3.x | Internationalization |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker Compose | Local development |
| Turborepo | Monorepo management |
| GitHub Actions | CI/CD |
| GitHub Container Registry | Docker images |

## Backend Architecture Layers

### 1. Routes Layer
Defines HTTP routes and maps them to controllers.

```typescript
// routes/auth.routes.ts
router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/login', rateLimiter(), authController.login);
```

### 2. Controllers Layer
Handles HTTP requests, validates input, calls services.

```typescript
// controllers/auth.controller.ts
async register(req: Request, res: Response) {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}
```

### 3. Services Layer
Contains business logic, interacts with data layer.

```typescript
// services/auth.service.ts
async register(data: RegisterInput) {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  return prisma.user.create({ data: { ...data, password: hashedPassword } });
}
```

### 4. Data Layer
Prisma ORM for database operations, Redis for caching.

## AI Agent Architecture

The system uses a multi-agent architecture with LangGraph for orchestration.

```
User Message → Router Agent → Domain Agent → Tools → Response
                   │
                   ├── Contractor Agent (CRUD operations)
                   ├── Financial Agent (Reports & analysis)
                   ├── Invoice Agent (Invoice management)
                   └── Tax Agent (Tax calculations)
```

See [AI Agents Documentation](./AI_AGENTS.md) for details.

## Data Flow

### Authentication Flow
```
Client → Login Request → Auth Middleware → JWT Generation → Response
       ← Access Token + Refresh Token ←
```

### API Request Flow
```
Client Request
     ↓
Rate Limiter (Redis)
     ↓
Auth Middleware (JWT validation)
     ↓
Validation Middleware (Zod)
     ↓
Controller
     ↓
Service (Business Logic)
     ↓
Data Layer (Prisma/Redis)
     ↓
Response
```

### AI Chat Flow
```
User Message
     ↓
AI Chat Controller
     ↓
Router Agent (classify intent)
     ↓
Domain Agent (process request)
     ↓
Tools (wFirma API calls)
     ↓
Formatted Response (Markdown)
```

## Key Design Patterns

### Singleton Services
Services are instantiated once and exported as singletons.

```typescript
// services/auth.service.instance.ts
export const authService = new AuthService(prisma);
```

### Dependency Injection
Services receive dependencies through constructors.

```typescript
class WFirmaCacheService {
  constructor(private prisma: PrismaClient, private config: CacheConfig) {}
}
```

### Repository Pattern
Data access is abstracted through Prisma models.

### Factory Pattern
AI agents are created through factory functions.

```typescript
const agent = getRouterAgent('openai'); // or 'anthropic'
```

## Security Measures

- **JWT Authentication** with access and refresh tokens
- **bcrypt** password hashing (10 rounds)
- **Helmet** for HTTP security headers
- **CORS** configuration
- **Rate Limiting** per endpoint
- **Zod Validation** on all inputs
- **SQL Injection Protection** via Prisma

## Internationalization

The application supports three languages:
- English (en)
- Polish (pl)
- Russian (ru)

Language detection is automatic based on:
1. User preference (stored in profile)
2. Browser locale
3. Message content analysis (for AI responses)

## Related Documentation

- [API Reference](./API_REFERENCE.md)
- [Database Schema](./DATABASE.md)
- [AI Agents](./AI_AGENTS.md)
- [wFirma Integration](./WFIRMA_INTEGRATION.md)
