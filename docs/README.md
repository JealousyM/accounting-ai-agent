# Accounting AI Agent - Technical Documentation

Welcome to the technical documentation for the Accounting AI Agent project.

## Quick Links

| Document | Description |
|----------|-------------|
| [Getting Started](./GETTING_STARTED.md) | Setup and installation guide |
| [Architecture](./ARCHITECTURE.md) | System design and structure |
| [API Reference](./API_REFERENCE.md) | REST API endpoints |
| [Authentication](./AUTHENTICATION.md) | JWT and OAuth authentication |
| [Database](./DATABASE.md) | PostgreSQL schema and Prisma ORM |
| [AI Agents](./AI_AGENTS.md) | LangGraph multi-agent system |
| [wFirma Integration](./WFIRMA_INTEGRATION.md) | Polish accounting system integration |
| [KSeF Integration](./KSEF_INTEGRATION.md) | KSeF e-invoice system (FA3 XML, AI tools, contractor lookup) |
| [Frontend](./FRONTEND.md) | Next.js 15 web application |
| [Deployment](./DEPLOYMENT.md) | Production deployment guide |

## Project Overview

The Accounting AI Agent is a full-stack monorepo application for AI-powered accounting automation with Polish wFirma system integration.

### Key Features

- **AI-Powered Chat** - Natural language interface for accounting tasks
- **Multi-Agent System** - Specialized agents for contractors, invoices, finances, and taxes
- **wFirma Integration** - Full integration with Polish accounting system (53 tools)
- **KPI Dashboard** - Aggregated financial, invoice, HR, and KSeF metrics in one view
- **Audit Log** - Automatic tracking of all write operations with admin viewer
- **Public Landing Page** - Marketing page with pricing, OG meta tags
- **Legal Documents** - Terms of service, privacy policy, RODO, and cookie policy
- **Google Analytics** - Consent-aware GA4 integration
- **Multilingual Support** - English, Polish, and Russian
- **OAuth Authentication** - Google and GitHub login
- **Real-time Data** - Cached wFirma data with configurable TTL

### Technology Stack

**Backend:**
- Node.js 18+ with Express.js
- TypeScript
- PostgreSQL with Prisma ORM
- Redis for sessions and rate limiting
- LangGraph/LangChain for AI agents

**Frontend:**
- Next.js 15 with App Router
- React 19 with Server Components
- Tailwind CSS v4
- Zustand for state management
- React Query for data fetching

**Infrastructure:**
- Docker Compose
- Turborepo
- GitHub Actions CI/CD

## Getting Started

See the [Getting Started Guide](./GETTING_STARTED.md) for installation instructions.

**Quick start:**
```bash
# Clone and setup
git clone https://github.com/your-org/accounting-ai-agent.git
cd accounting-ai-agent

# Automated setup (Windows)
.\scripts\dev.ps1

# Automated setup (Linux/macOS)
./scripts/dev.sh
```

## Documentation Structure

```
docs/
├── README.md               # This file - documentation index
├── GETTING_STARTED.md      # Setup and installation
├── ARCHITECTURE.md         # System architecture
├── API_REFERENCE.md        # REST API documentation
├── AUTHENTICATION.md       # Auth system details
├── DATABASE.md             # Database schema
├── AI_AGENTS.md            # AI agent system
├── WFIRMA_INTEGRATION.md   # wFirma integration
├── KSEF_INTEGRATION.md     # KSeF e-invoice integration
├── FRONTEND.md             # Frontend documentation
└── DEPLOYMENT.md           # Deployment guide
```

## Additional Resources

### Package-Level Documentation

- [API Package README](../packages/api/README.md)
- [Web Package README](../packages/web/README.md)
- [wFirma Service](../packages/api/src/services/README.wfirma.md)
- [Cache Service](../packages/api/src/services/README.cache.md)

### API Documentation (Detailed)

- [API Endpoints](../packages/api/docs/API.md)
- [Auth API](../packages/api/docs/AUTH_API.md)
- [Middleware](../packages/api/docs/MIDDLEWARE.md)
- [AI Tools (53)](../packages/api/docs/AI_TOOLS.md)

### Configuration

- [Claude Code Agents](../.claude/agents/) - Specialized development agents
- [Environment Example](../packages/api/.env.example)

## Contributing

1. Read the [Architecture](./ARCHITECTURE.md) documentation
2. Follow the coding patterns described in each section
3. Run tests before submitting PRs: `npm run test`
4. Ensure linting passes: `npm run lint`

## Support

For questions or issues:
- Check the documentation first
- Search existing issues on GitHub
- Create a new issue with detailed description

## License

MIT License - see [LICENSE](../LICENSE) for details.
