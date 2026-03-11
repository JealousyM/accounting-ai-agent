# Organizations, Shared Conversations & Telegram Bot

This document describes the Organizations feature (company grouping), shared AI conversations, and the Telegram bot integration.

## Overview

Organizations allow users from the same company to group together and share AI conversations. The Telegram bot provides an alternative interface for chatting with the AI accountant directly from Telegram.

## Organizations

### Concept

Organizations group users by company name. When a user creates or joins an organization, the system normalizes the company name (lowercase, trimmed) for matching. This means "My Company" and "my company" resolve to the same organization.

### Database Schema

#### Organization Model

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | String | Original company name |
| `nameNorm` | String (unique) | Lowercase trimmed name for matching |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

Relations: `members` (User[]), `conversations` (AIConversation[])

Mapped to table: `organizations`

#### User Fields (Organization Membership)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `organizationId` | UUID? | null | FK to Organization |
| `orgRole` | OrgRole | `member` | Role within the organization |
| `orgMembershipStatus` | OrgMembershipStatus | `active` | Membership approval status |

### Enums

#### OrgRole

| Value | Description |
|-------|-------------|
| `admin` | Can manage members, approve/reject, promote/demote, update org name |
| `member` | Standard member, can view org and shared conversations |

#### OrgMembershipStatus

| Value | Description |
|-------|-------------|
| `active` | Full access to organization features |
| `pending` | Awaiting admin approval (can see org name but not members) |
| `rejected` | Membership rejected (organizationId is cleared) |

### Membership Flow

1. **First user** creates the organization and becomes `admin` with `active` status.
2. **Subsequent users** joining the same organization (by normalized name) are set as `member` with `pending` status.
3. An **admin approves or rejects** pending members.
4. Rejected members have their `organizationId` cleared.

### Service: OrganizationService

Located at `packages/api/src/services/organization.service.ts`, singleton instance at `organization.instance.ts`.

| Method | Description |
|--------|-------------|
| `findOrCreateByName(companyName, userId?)` | Find org by normalized name or create a new one. First user = admin, subsequent = pending. |
| `getUserOrganization(userId)` | Get user's org with members (active) and pending members (admin only). Pending/rejected users see org name only. |
| `getMembers(orgId)` | List active members of an organization. |
| `getPendingMembers(orgId)` | List pending members of an organization. |
| `isOrgAdmin(userId)` | Check if user is an active admin of their organization. |
| `approveMember(adminUserId, targetUserId)` | Approve a pending member (admin only). |
| `rejectMember(adminUserId, targetUserId)` | Reject a pending member and clear their org link (admin only). |
| `removeMember(adminUserId, targetUserId)` | Remove an active member from the organization (admin only, cannot remove self). |
| `promoteMember(adminUserId, targetUserId)` | Promote a member to admin (admin only, target must be active). |
| `demoteMember(adminUserId, targetUserId)` | Demote an admin to member (admin only, cannot demote self). |
| `leaveOrganization(userId)` | Leave the organization. Last admin cannot leave if other active members exist. |
| `updateOrganizationName(adminUserId, newName)` | Update org display name and normalized name (admin only). Checks for name collisions. |

### API Endpoints

All endpoints are under `/api/organization` and require authentication.

| Method | Path | Auth | Description | Rate Limit |
|--------|------|------|-------------|------------|
| GET | `/` | Any member | Get user's org + members | 60/15min |
| POST | `/join` | Any user | Create or join org by name | 10/15min |
| PUT | `/name` | Admin | Update organization name | 20/15min |
| POST | `/leave` | Any member | Leave organization | 10/15min |
| POST | `/members/:userId/approve` | Admin | Approve pending member | 30/15min |
| POST | `/members/:userId/reject` | Admin | Reject pending member | 30/15min |
| DELETE | `/members/:userId` | Admin | Remove member | 20/15min |
| POST | `/members/:userId/promote` | Admin | Promote to admin | 10/15min |
| POST | `/members/:userId/demote` | Admin | Demote to member | 10/15min |

#### Request/Response Examples

**POST /api/organization/join**

```json
// Request
{ "companyName": "My Company" }

// Response (new org, user becomes admin)
{ "success": true, "data": { "id": "uuid", "name": "My Company" } }
```

**GET /api/organization**

```json
// Response (active admin)
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My Company",
    "createdAt": "2026-03-11T...",
    "members": [
      { "id": "uuid", "email": "admin@co.com", "firstName": "Jan", "orgRole": "admin", "orgMembershipStatus": "active" }
    ],
    "pendingMembers": [
      { "id": "uuid", "email": "new@co.com", "firstName": "Anna", "orgRole": "member", "orgMembershipStatus": "pending" }
    ],
    "currentUserRole": "admin"
  }
}
```

## Shared Conversations

### Overview

Organization members can share AI conversations with their organization. Shared conversations are visible to all active members in the same organization and support real-time polling for updates.

### Database Schema

#### AIConversation Fields (Sharing)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `organizationId` | UUID? | null | FK to Organization (set when shared) |
| `isShared` | Boolean | `false` | Whether conversation is shared |
| `sharedAt` | DateTime? | null | Timestamp when sharing was enabled |

Index: `[organizationId, isShared, createdAt]` for efficient shared conversation queries.

### Author Tracking

When a conversation is shared, messages include author metadata so organization members can see who sent each message:

| Field | Description |
|-------|-------------|
| `authorId` | UUID of the user who sent the message |
| `authorName` | Display name (firstName + lastName) of the sender |

These fields are added to user messages only when the conversation `isShared` is `true`.

### API Endpoints

| Method | Path | Auth | Description | Rate Limit |
|--------|------|------|-------------|------------|
| GET | `/api/ai/conversations/shared` | Active org member | List shared conversations | 100/15min |
| POST | `/api/ai/conversations/:id/share` | Conversation owner | Share with organization | 30/15min |
| POST | `/api/ai/conversations/:id/unshare` | Conversation owner | Stop sharing | 30/15min |

### Access Control

- Only **active** organization members (`orgMembershipStatus === 'active'`) can view shared conversations.
- Only the **conversation owner** can share or unshare a conversation.
- The user must belong to an organization to share a conversation.
- `GET /api/ai/conversations/:id` supports shared access: if the conversation belongs to the same organization as the requesting user, the user can view it even if they are not the owner.

### Frontend Polling

The web frontend polls for updates on shared conversations:

| Context | Interval | Description |
|---------|----------|-------------|
| Open shared conversation | 5 seconds | Poll for new messages in the active shared chat |
| Shared conversations list | 10 seconds | Poll for newly shared/updated conversations |

## Telegram Bot

### Overview

The Telegram bot provides an alternative interface for interacting with the AI accounting agent. Users link their Telegram account to their web account via a 6-digit code, then can chat with the AI directly from Telegram.

Built with [Telegraf](https://telegraf.js.org/) (Node.js Telegram bot framework).

### Configuration

#### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_CHATBOT_TOKEN` | Yes | Bot token from [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_WEBHOOK_URL` | Production | Webhook URL for receiving updates |
| `TELEGRAM_WEBHOOK_SECRET` | Production | Secret token for webhook verification |

If `TELEGRAM_CHATBOT_TOKEN` is not set, the bot is disabled (no error, just a warning log).

### Database Schema

#### TelegramLink Model

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `userId` | UUID (unique) | FK to User (one link per user) |
| `telegramUserId` | String (unique) | Telegram numeric user ID |
| `telegramUsername` | String? | Telegram @username |
| `telegramFirstName` | String? | Telegram first name |
| `activeConversationId` | UUID? | Current active conversation for this Telegram user |
| `linkedAt` | DateTime | Timestamp when the account was linked |

Mapped to table: `telegram_links`

### Account Linking Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Telegram    │     │     Bot      │     │    Redis     │     │   Web App    │
│    User       │     │   Service    │     │              │     │              │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │  /link             │                    │                    │
       │───────────────────>│                    │                    │
       │                    │  SET telegram:     │                    │
       │                    │  link:<code>       │                    │
       │                    │───────────────────>│                    │
       │  "Your code: 123456"                    │                    │
       │<───────────────────│                    │                    │
       │                    │                    │                    │
       │                    │                    │  POST /api/telegram│
       │                    │                    │  /link {code}      │
       │                    │                    │<───────────────────│
       │                    │                    │  GET + DEL key     │
       │                    │                    │───────────────────>│
       │                    │                    │  Create TelegramLink
       │                    │                    │                    │
```

1. User sends `/link` to the bot in Telegram.
2. Bot generates a 6-digit code and stores it in Redis with a 5-minute TTL (`telegram:link:<code>`).
3. User enters the code in the web app (Settings > Telegram).
4. Web app calls `POST /api/telegram/link` with the code.
5. Server looks up the code in Redis, creates a `TelegramLink` record, and deletes the Redis key.

### Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message with linking instructions |
| `/link` | Generate a 6-digit linking code (5-minute expiry) |
| `/unlink` | Unlink the Telegram account |
| `/new` | Start a new AI conversation |
| `/help` | Show available commands |

### API Endpoints

All endpoints are under `/api/telegram` and require authentication.

| Method | Path | Auth | Description | Rate Limit |
|--------|------|------|-------------|------------|
| POST | `/link` | Any user | Link Telegram account with 6-digit code | 10/15min |
| DELETE | `/link` | Any user | Unlink Telegram account | 10/15min |
| GET | `/status` | Any user | Get current link status | 30/15min |

#### Request/Response Examples

**POST /api/telegram/link**

```json
// Request
{ "code": "123456" }

// Response (success)
{
  "success": true,
  "data": {
    "linked": true,
    "telegramUsername": "john_doe",
    "telegramFirstName": "John",
    "linkedAt": "2026-03-11T15:00:00Z"
  }
}

// Response (invalid/expired code)
{
  "success": false,
  "error": "Bad Request",
  "message": "Invalid or expired code. Please generate a new one with /link in Telegram."
}
```

**GET /api/telegram/status**

```json
// Response (linked)
{
  "success": true,
  "data": {
    "linked": true,
    "telegramUsername": "john_doe",
    "telegramFirstName": "John",
    "linkedAt": "2026-03-11T15:00:00Z"
  }
}

// Response (not linked)
{ "success": true, "data": { "linked": false } }
```

### Message Handling

When a linked user sends a text message to the bot:

1. **Rate limiting**: Max 10 messages per 60 seconds per Telegram user (tracked in Redis).
2. **Account lookup**: Find the `TelegramLink` by `telegramUserId`.
3. **Conversation management**: If no `activeConversationId` is set, a new conversation is created automatically.
4. **AI processing**: The message is sent to `AIChatService.sendMessage()` using the linked user's credentials.
5. **Response formatting**: The AI response (standard markdown) is converted to Telegram MarkdownV2 format.
6. **Message splitting**: Responses exceeding 4096 characters are split at paragraph boundaries (double newline), falling back to single newlines, then hard splits.
7. **Fallback**: If MarkdownV2 parsing fails, the message is sent as plain text with escape characters stripped.

### Markdown Conversion

The `markdown-converter.ts` module handles converting standard markdown to Telegram MarkdownV2:

| Markdown Feature | Conversion |
|-----------------|------------|
| `## Heading` | `*bold text*` |
| `**bold**` | `*bold*` (Telegram uses single `*`) |
| `*italic*` / `_italic_` | `_italic_` |
| `` `inline code` `` | Preserved as-is |
| Code blocks | Preserved as-is |
| Tables | Converted to preformatted code blocks |
| Special characters | Escaped with `\` outside code blocks |

### Deployment Modes

| Mode | Method | Use Case |
|------|--------|----------|
| Polling | `bot.launch()` | Development |
| Webhook | `bot.telegram.setWebhook(url, { secret_token })` | Production |

The webhook callback is available at `/api/telegram/webhook` and is verified using `TELEGRAM_WEBHOOK_SECRET`.

## Related Documentation

- [Architecture](./ARCHITECTURE.md)
- [AI Agents](./AI_AGENTS.md)
- [Authentication](./AUTHENTICATION.md)
- [Database](./DATABASE.md)
- [API Reference](./API_REFERENCE.md)
