# API Reference

Complete REST API documentation for the Accounting AI Agent.

## Base URL

```
Development: http://localhost:3001/api
Production:  https://api.your-domain.com/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "ErrorType",
  "message": "Human readable message",
  "details": []
}
```

---

## Health Check

### GET /health

Check API server health status.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-01-23T10:00:00.000Z"
}
```

---

## Authentication Endpoints

### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "companyName": "Acme Corp"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Valid email address |
| password | string | Yes | Min 8 chars, 1 uppercase, 1 number, 1 special |
| firstName | string | Yes | First name |
| lastName | string | Yes | Last name |
| companyName | string | No | Company name |

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

**Errors:**
- `400` - Validation error
- `409` - Email already registered

---

### POST /api/auth/login

Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

**Errors:**
- `400` - Validation error
- `401` - Invalid credentials

---

### POST /api/auth/refresh

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

**Errors:**
- `401` - Invalid or expired refresh token

---

### POST /api/auth/logout

Logout user and invalidate refresh token.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### GET /api/auth/me

Get current authenticated user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "hasGoogleAuth": false,
    "hasGithubAuth": false,
    "company": {
      "companyName": "Acme Corp"
    },
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z"
  }
}
```

---

### POST /api/auth/oauth/google

Authenticate with Google OAuth.

**Request Body:**
```json
{
  "id": "google-user-id",
  "email": "user@gmail.com",
  "name": "John Doe",
  "picture": "https://..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "OAuth authentication successful",
  "data": {
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

---

### POST /api/auth/oauth/github

Authenticate with GitHub OAuth.

**Request Body:**
```json
{
  "id": "github-user-id",
  "email": "user@github.com",
  "name": "John Doe",
  "picture": "https://..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "OAuth authentication successful",
  "data": {
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

---

## AI Chat Endpoints

### POST /api/ai/chat

Send a message to the AI assistant.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "message": "Show my invoices from January",
  "conversationId": "uuid",
  "locale": "en"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| message | string | Yes | User message |
| conversationId | string | No | Existing conversation ID |
| locale | string | No | Preferred language (en, pl, ru) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "response": "## Invoices from January 2026\n\n| # | Number | Client | Amount |\n|---|--------|--------|--------|\n| 1 | FV/2026/001 | ABC Corp | 5,000.00 PLN |\n\n**Total: 5,000.00 PLN**",
    "conversationId": "uuid",
    "toolsUsed": ["get_invoices"],
    "agentType": "invoice",
    "metadata": {
      "duration": 1234,
      "provider": "openai"
    }
  }
}
```

---

### GET /api/ai/conversations

Get user's conversation history.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 20 | Results per page |
| offset | number | 0 | Pagination offset |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "title": "Invoice discussion",
        "lastMessage": "Show my invoices",
        "messageCount": 5,
        "createdAt": "2026-01-20T10:00:00.000Z",
        "updatedAt": "2026-01-20T10:30:00.000Z"
      }
    ],
    "total": 15,
    "limit": 20,
    "offset": 0
  }
}
```

---

### GET /api/ai/conversations/:id

Get specific conversation with messages.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Invoice discussion",
    "messages": [
      {
        "role": "user",
        "content": "Show my invoices"
      },
      {
        "role": "assistant",
        "content": "## Invoices\n..."
      }
    ],
    "createdAt": "2026-01-20T10:00:00.000Z"
  }
}
```

---

### DELETE /api/ai/conversations/:id

Delete a conversation.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Conversation deleted successfully"
}
```

---

## wFirma Integration Endpoints

### GET /api/wfirma/status

Check wFirma connection status.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "companyName": "My Company",
    "lastSync": "2026-01-23T09:00:00.000Z"
  }
}
```

---

### POST /api/wfirma/sync

Trigger wFirma data synchronization.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Synchronization started",
  "data": {
    "itemsSynced": 150,
    "duration": 5000
  }
}
```

---

### GET /api/wfirma/invoices/download/:number

Download invoice as PDF.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | string | "invoice" | PDF type: "all", "invoice", "invoicecopy" |

**Response (200):**
Returns PDF file download link.

---

## KSeF Endpoints

All KSeF routes require `Authorization: Bearer <token>`.

### POST /api/ksef/send

Submit a wFirma invoice to KSeF by ID.

**Request Body:**
```json
{ "invoiceId": "wfirma-invoice-id", "adapter": "direct" }
```

**Response (200):**
```json
{
  "success": true,
  "referenceNumber": "1234567890-20260219-ABCD1234",
  "status": "accepted",
  "adapter": "direct",
  "message": "Faktura wysłana do KSeF",
  "timestamp": "2026-02-19T10:00:00.000Z"
}
```

---

### POST /api/ksef/send-raw

Submit a KSeF invoice from raw `FA3InvoiceData` (no wFirma required).

**Request Body:** `FA3InvoiceData` object (see [KSeF Integration](./KSEF_INTEGRATION.md#type-definitions))

---

### GET /api/ksef/status/:referenceNumber

Get invoice status from KSeF.

**Response (200):**
```json
{
  "referenceNumber": "1234567890-20260219-ABCD1234",
  "invoiceNumber": "FV/2026/02/001",
  "status": "accepted",
  "adapter": "direct",
  "sentAt": "2026-02-19T10:00:00.000Z",
  "acceptedAt": "2026-02-19T10:00:05.000Z",
  "upoAvailable": true
}
```

---

### GET /api/ksef/upo/:referenceNumber

Download UPO (official confirmation) for an accepted invoice.

**Response:** XML file (`application/xml`)

---

### GET /api/ksef/invoices

Query KSeF invoices.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| dateFrom | ISO string | Filter from date |
| dateTo | ISO string | Filter to date |
| status | string | pending / sent / accepted / rejected / completed / failed |
| direction | string | `sent` or `received` (received fetches from KSeF API) |
| limit | number | Default: 50 |
| offset | number | For pagination |

---

### GET /api/ksef/invoices/:referenceNumber

Get invoice details including `invoicePayload` (full FA3 data for copy feature).

---

### GET /api/ksef/invoices/:referenceNumber/download

Download invoice as PDF or XML.

**Query Parameters:** `format=pdf` (default) or `format=xml`

---

### POST /api/ksef/bulk/send

Batch-send multiple invoices to KSeF.

**Request Body:**
```json
{ "invoiceIds": ["id1", "id2"], "continueOnError": true }
```

---

### GET /api/ksef/statistics

Get KSeF statistics (totals by status, monthly breakdown).

---

### GET /api/ksef/config

Get user's KSeF configuration.

### PATCH /api/ksef/config

Update KSeF configuration (`ksefToken`, `ksefNip`, `preferredAdapter`, `environment`, notifications).

---

### GET /api/ksef/contractors

List KSeF contractors. Supports `?search=` query parameter.

### POST /api/ksef/contractors/sync

Sync contractors from wFirma into the local KSeF contractor database (202 Accepted, non-blocking).

### POST /api/ksef/contractors

Create a local contractor record.

### PUT /api/ksef/contractors/:id

Update a local contractor (only `source='local'` records).

### DELETE /api/ksef/contractors/:id

Delete a local contractor (only `source='local'` records).

### GET /api/ksef/company

Get own company entry (`source='company'`).

---

## AI Context Memory Endpoints

All memory endpoints require `Authorization: Bearer <token>`.

### GET /api/ai/memory

List user's AI memories with optional filters.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| category | string | - | Filter by: user_preference, business_fact, frequent_entity, workflow_pattern |
| page | number | 1 | Page number |
| limit | number | 50 | Results per page (max 100) |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "category": "frequent_entity",
      "source": "tool_usage",
      "key": "contractor:ABC Corp",
      "value": "Contractor 'ABC Corp' (NIP: 1234567890) — queried 12 times",
      "confidence": 0.85,
      "accessCount": 12,
      "isPinned": false,
      "isHidden": false,
      "lastAccessedAt": "2026-02-26T10:00:00.000Z",
      "createdAt": "2026-02-20T08:00:00.000Z"
    }
  ]
}
```

---

### GET /api/ai/memory/summary

Get memory statistics.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total": 15,
    "byCategory": {
      "business_fact": 3,
      "frequent_entity": 5,
      "user_preference": 4,
      "workflow_pattern": 3
    },
    "pinned": 2,
    "hidden": 1
  }
}
```

---

### PUT /api/ai/memory/:id

Update a memory item (pin, hide, edit value).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "isPinned": true,
  "isHidden": false,
  "value": "Updated memory text"
}
```

All fields are optional. Response returns the updated memory item.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "category": "frequent_entity",
    "source": "tool_usage",
    "key": "contractor:ABC Corp",
    "value": "Updated memory text",
    "confidence": 0.85,
    "accessCount": 12,
    "isPinned": true,
    "isHidden": false,
    "lastAccessedAt": "2026-02-26T10:00:00.000Z",
    "createdAt": "2026-02-20T08:00:00.000Z"
  }
}
```

---

### DELETE /api/ai/memory/:id

Delete a single memory item.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Memory deleted"
}
```

---

### POST /api/ai/memory/clear

Clear all memories or by category.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "category": "workflow_pattern"
}
```

Category is optional. If omitted, clears ALL memories.

**Response (200):**
```json
{
  "success": true,
  "data": { "deleted": 5 }
}
```

---

## Admin Endpoints

All admin endpoints require `Authorization: Bearer <token>` from a user with `role: "admin"`.

### GET /api/admin/dashboard

Get platform-wide statistics.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "activeSubscriptions": 42,
    "totalConversations": 1200,
    "newUsersToday": 3
  }
}
```

**Rate Limit:** 60 requests / 15 minutes

---

### GET /api/admin/users

Get all users with pagination and search.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Results per page |
| search | string | - | Filter by name or email |
| role | string | - | Filter by role: `"user"` or `"admin"` |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "user",
        "createdAt": "2026-01-01T00:00:00.000Z"
      }
    ],
    "total": 150,
    "page": 1,
    "limit": 20
  }
}
```

**Rate Limit:** 100 requests / 15 minutes

---

### GET /api/admin/users/:id

Get detailed information about a specific user.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "company": { "companyName": "Acme Corp" },
    "conversationCount": 45,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Errors:**
- `404` - User not found

---

### PATCH /api/admin/users/:id/role

Update a user's role.

**Request Body:**
```json
{ "role": "admin" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| role | string | Yes | `"user"` or `"admin"` |

**Response (200):**
```json
{
  "success": true,
  "message": "User role updated successfully"
}
```

**Rate Limit:** 30 requests / 15 minutes

---

### GET /api/admin/audit-log

Get paginated audit log with filters. Sensitive fields (`password`, `secretKey`, `apiKey`, etc.) are automatically redacted to `"[REDACTED]"` in the `changes` object.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 50 | Results per page (max 100) |
| userId | string | - | Filter by user UUID |
| action | string | - | Filter by action (partial match) |
| entity | string | - | Filter by entity type (e.g. `employees`, `invoices`) |
| dateFrom | ISO string | - | Filter entries from this date |
| dateTo | ISO string | - | Filter entries up to this date |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "userId": "uuid",
        "action": "CREATE_EMPLOYEES",
        "entity": "employees",
        "entityId": "uuid",
        "changes": { "firstName": "Jan", "lastName": "Kowalski" },
        "ip": "127.0.0.1",
        "userAgent": "Mozilla/5.0...",
        "createdAt": "2026-02-01T10:00:00.000Z",
        "user": {
          "email": "user@example.com",
          "firstName": "John",
          "lastName": "Doe"
        }
      }
    ],
    "total": 320
  }
}
```

**Notes:**
- Auth endpoints (`/api/auth/*`), TTS, webhooks, and health checks are not logged.
- Actions are derived from HTTP method + entity: `CREATE_EMPLOYEES`, `UPDATE_INVOICES`, `DELETE_CONTRACTORS`.

**Rate Limit:** 60 requests / 15 minutes

---

## Dashboard Endpoints

### GET /api/dashboard/summary

Get aggregated KPI data from all sources for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "financial": {
      "year": 2026,
      "revenue": 450000.00,
      "expenses": 120000.00,
      "profit": 330000.00,
      "vatPaid": 45000.00,
      "pitPaid": 12000.00,
      "zusPaid": 8400.00,
      "currency": "PLN",
      "monthlyBreakdown": [
        { "month": "2026-01", "revenue": 38000.00, "expenses": 9500.00 }
      ]
    },
    "invoices": {
      "unpaidCount": 5,
      "unpaidTotal": 23500.00,
      "overdueCount": 2,
      "overdueTotal": 8200.00,
      "currency": "PLN"
    },
    "deadlines": [
      {
        "date": "2026-02-25T00:00:00.000Z",
        "description": "ZUS payment",
        "groupName": "ZUS",
        "daysUntil": -1,
        "urgency": "overdue"
      }
    ],
    "hr": {
      "employeeCount": 3,
      "activeContractsByType": { "employment": 2, "mandate_contract": 1 },
      "latestPeriod": "2026-01",
      "totalMonthlyPayroll": 18500.00
    },
    "ksef": {
      "totalSent": 120,
      "totalReceived": 45,
      "acceptedCount": 118,
      "rejectedCount": 2,
      "pendingCount": 5,
      "acceptanceRate": 98
    },
    "generatedAt": "2026-02-26T10:00:00.000Z"
  }
}
```

**Notes:**
- Sections with missing credentials return `null` for that key.
- Deadline urgency values: `"overdue"` (past due), `"urgent"` (within 3 days), `"soon"` (within 7 days), `"normal"`.
- Data is aggregated in parallel; one section failing returns `null` rather than failing the whole request.

---

## Rate Limiting

All endpoints are rate limited:

| Endpoint | Limit | Window |
|----------|-------|--------|
| Register | 5 requests | 15 minutes |
| Login | 10 requests | 15 minutes |
| Refresh | 20 requests | 15 minutes |
| OAuth | 10 requests | 15 minutes |
| AI Chat | 30 requests | 15 minutes |
| Admin Dashboard | 60 requests | 15 minutes |
| Admin Users | 100 requests | 15 minutes |
| Admin Role Update | 30 requests | 15 minutes |
| Admin Audit Log | 60 requests | 15 minutes |
| AI Memory | 60 requests | 15 minutes |
| General | 100 requests | 15 minutes |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 2026-01-23T10:15:00.000Z
```

---

## Token Expiry

| Token Type | Expiry |
|------------|--------|
| Access Token | 15 minutes |
| Refresh Token | 7 days |

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Validation error |
| 401 | Unauthorized - Invalid or expired token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## SDK Examples

### JavaScript/TypeScript

```typescript
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
  }),
});

const { data } = await response.json();
const { token, refreshToken } = data;

// Use token for authenticated requests
const chatResponse = await fetch('http://localhost:3001/api/ai/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({
    message: 'Show my invoices',
  }),
});
```

### cURL

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123!"}'

# AI Chat
curl -X POST http://localhost:3001/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"message":"Show my invoices"}'
```
