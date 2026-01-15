# Database Documentation

## Technologies

- **ORM:** Prisma
- **Database:** PostgreSQL 16
- **Migrations:** Prisma Migrate

## Schema Overview

### Users
User management with OAuth support (Google, GitHub) and wFirma integration.

### WFirma Invoices
Storage of invoices from wFirma system with complete information about clients, amounts and statuses.

### WFirma Customers
Customer database with NIP (Polish tax ID) and revenue statistics.

### AI Conversations
Conversation history with AI agent, including LangGraph state.

### AI Recommendations
AI recommendations with impact and confidence scores.

## Prisma Commands

```bash
# Generate Prisma Client
npm run prisma:generate

# Create migration
npm run prisma:migrate

# Apply migrations in production
npm run prisma:migrate:prod

# Open Prisma Studio (GUI)
npm run prisma:studio

# Seed database with test data
npm run prisma:seed

# Reset database and apply migrations
npm run prisma:reset
```

## Indexes

All tables are optimized with indexes for:
- Search by userId
- Filtering by statuses
- Sorting by dates
- Composite queries (userId + status, userId + date)

## Cascade Delete

All relations are configured with `onDelete: Cascade`, which means:
- When User is deleted, all their invoices, customers, conversations, recommendations are deleted
- When Customer is deleted, their invoices get `customerId = null`
- When Conversation is deleted, their recommendations get `conversationId = null`

## Soft Delete

All tables have `deletedAt` field for soft delete.

## JSON Fields

Used for storing:
- `wfirmaConfig` - integration configuration
- `messages` - message history
- `graphState` - LangGraph state
- `metadata` - additional data
- `items` - invoice line items
- `address` - customer addresses

## Data Types

- **UUID** - for all IDs
- **Decimal(12,2)** - for monetary amounts
- **JsonB** - for JSON fields (indexable)
- **Text** - for long texts
- **DateTime** - for all dates and times
