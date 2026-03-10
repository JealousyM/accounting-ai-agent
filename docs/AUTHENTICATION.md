# Authentication

This document describes the authentication system for the Accounting AI Agent.

## Overview

The application uses JWT (JSON Web Tokens) for authentication with support for:
- Email/password registration and login
- OAuth providers (Google)
- Token refresh mechanism
- Session management

## Authentication Flow

### Email/Password Authentication

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        REGISTRATION FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Client                    Server                    Database                │
│    │                         │                          │                    │
│    │  POST /auth/register    │                          │                    │
│    │ ───────────────────────>│                          │                    │
│    │                         │                          │                    │
│    │                         │  Validate input (Zod)    │                    │
│    │                         │  Hash password (bcrypt)  │                    │
│    │                         │                          │                    │
│    │                         │  Create user             │                    │
│    │                         │ ────────────────────────>│                    │
│    │                         │                          │                    │
│    │                         │  Generate tokens         │                    │
│    │                         │                          │                    │
│    │  { token, refreshToken }│                          │                    │
│    │ <───────────────────────│                          │                    │
│    │                         │                          │                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LOGIN FLOW                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Client                    Server                    Database                │
│    │                         │                          │                    │
│    │  POST /auth/login       │                          │                    │
│    │ ───────────────────────>│                          │                    │
│    │                         │                          │                    │
│    │                         │  Find user by email      │                    │
│    │                         │ ────────────────────────>│                    │
│    │                         │                          │                    │
│    │                         │  Verify password         │                    │
│    │                         │  (bcrypt.compare)        │                    │
│    │                         │                          │                    │
│    │                         │  Generate tokens         │                    │
│    │                         │                          │                    │
│    │  { token, refreshToken }│                          │                    │
│    │ <───────────────────────│                          │                    │
│    │                         │                          │                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Token Refresh Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TOKEN REFRESH FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Client                    Server                    Redis                   │
│    │                         │                          │                    │
│    │  POST /auth/refresh     │                          │                    │
│    │  { refreshToken }       │                          │                    │
│    │ ───────────────────────>│                          │                    │
│    │                         │                          │                    │
│    │                         │  Verify refresh token    │                    │
│    │                         │  (JWT signature + expiry)│                    │
│    │                         │                          │                    │
│    │                         │  Check blacklist         │                    │
│    │                         │ ────────────────────────>│                    │
│    │                         │                          │                    │
│    │                         │  Generate new tokens     │                    │
│    │                         │  Blacklist old token     │                    │
│    │                         │ ────────────────────────>│                    │
│    │                         │                          │                    │
│    │  { token, refreshToken }│                          │                    │
│    │ <───────────────────────│                          │                    │
│    │                         │                          │                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### OAuth Flow (Google)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          OAUTH FLOW                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Client          OAuth Provider          Server              Database        │
│    │                   │                    │                    │           │
│    │  Initiate OAuth   │                    │                    │           │
│    │ ─────────────────>│                    │                    │           │
│    │                   │                    │                    │           │
│    │  User authorizes  │                    │                    │           │
│    │  ← ─ ─ ─ ─ ─ ─ ─ >│                    │                    │           │
│    │                   │                    │                    │           │
│    │  Callback with    │                    │                    │           │
│    │  user data        │                    │                    │           │
│    │ <─────────────────│                    │                    │           │
│    │                   │                    │                    │           │
│    │  POST /auth/oauth/google               │                    │           │
│    │  { id, email, name, picture }          │                    │           │
│    │ ──────────────────────────────────────>│                    │           │
│    │                   │                    │                    │           │
│    │                   │                    │  Find or create    │           │
│    │                   │                    │  user              │           │
│    │                   │                    │ ──────────────────>│           │
│    │                   │                    │                    │           │
│    │                   │                    │  Generate tokens   │           │
│    │                   │                    │                    │           │
│    │  { token, refreshToken }               │                    │           │
│    │ <──────────────────────────────────────│                    │           │
│    │                   │                    │                    │           │
└─────────────────────────────────────────────────────────────────────────────┘
```

## JWT Token Structure

### Access Token

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "uuid",
    "email": "user@example.com",
    "iat": 1706000000,
    "exp": 1706000900
  }
}
```

### Refresh Token

```json
{
  "payload": {
    "userId": "uuid",
    "tokenVersion": 1,
    "iat": 1706000000,
    "exp": 1706604800
  }
}
```

## Token Expiry

| Token Type | Duration | Purpose |
|------------|----------|---------|
| Access Token | 15 minutes | Short-lived for API access |
| Refresh Token | 7 days | Long-lived for token renewal |

## Password Requirements

Passwords must meet the following criteria:

| Requirement | Minimum |
|-------------|---------|
| Length | 8 characters |
| Uppercase | 1 character |
| Lowercase | 1 character |
| Number | 1 digit |
| Special | 1 character (!@#$%^&*) |

**Validation regex:**
```javascript
/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/
```

## Middleware

### authenticateToken

Required authentication for protected routes.

```typescript
import { authenticateToken } from './middleware/auth.middleware';

router.get('/protected', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  // Handle protected route
});
```

**Behavior:**
- Extracts token from `Authorization: Bearer <token>` header
- Verifies JWT signature and expiration
- Attaches `user` object to request
- Returns 401 if token is invalid or missing

**Request Extension:**
```typescript
req.user = {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

req.authUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}
```

### optionalAuth

Optional authentication for public routes with personalization.

```typescript
import { optionalAuth } from './middleware/auth.middleware';

router.get('/public', optionalAuth, (req, res) => {
  if (req.user) {
    // Personalized response
  } else {
    // Generic response
  }
});
```

### requireUserId

Ensures authenticated user can only access their own resources.

```typescript
import { authenticateToken, requireUserId } from './middleware/auth.middleware';

router.get('/users/:userId/profile',
  authenticateToken,
  requireUserId('userId'),
  (req, res) => {
    // User can only access their own profile
  }
);
```

## Rate Limiting

Authentication endpoints have specific rate limits:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/register` | 5 requests | 15 minutes |
| `/auth/login` | 10 requests | 15 minutes |
| `/auth/refresh` | 20 requests | 15 minutes |
| `/auth/oauth/*` | 10 requests | 15 minutes |

**Rate limit headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 2026-01-23T10:15:00.000Z
```

## OAuth Configuration

### Google OAuth

1. Create project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs

**Environment variables:**
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

## Security Best Practices

### Token Storage (Frontend)

```typescript
// Store tokens in memory for single-page applications
let accessToken: string | null = null;
let refreshToken: string | null = null;

// For persistence, use httpOnly cookies (recommended) or secure storage
// Avoid localStorage for sensitive tokens
```

### Automatic Token Refresh

```typescript
// Intercept 401 responses and refresh token
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      const newTokens = await refreshTokens();
      // Retry original request with new token
    }
    return Promise.reject(error);
  }
);
```

### Logout

```typescript
// Clear tokens and invalidate refresh token
async function logout() {
  await api.post('/auth/logout');
  accessToken = null;
  refreshToken = null;
}
```

## Error Handling

| Error | HTTP Code | Description |
|-------|-----------|-------------|
| `INVALID_CREDENTIALS` | 401 | Email or password incorrect |
| `TOKEN_EXPIRED` | 401 | Access token has expired |
| `INVALID_TOKEN` | 401 | Token signature invalid |
| `REFRESH_TOKEN_EXPIRED` | 401 | Refresh token has expired |
| `USER_NOT_FOUND` | 404 | User doesn't exist |
| `EMAIL_EXISTS` | 409 | Email already registered |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

## Example Implementation

### Frontend (React)

```typescript
// hooks/useAuth.ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  token: null,

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    set({
      user: response.data.data,
      token: response.data.data.token,
    });
  },

  logout: async () => {
    await api.post('/auth/logout');
    set({ user: null, token: null });
  },

  refreshToken: async () => {
    const response = await api.post('/auth/refresh', {
      refreshToken: get().refreshToken,
    });
    set({ token: response.data.data.token });
  },
}));
```

### Backend (Service)

```typescript
// services/auth.service.ts
class AuthService {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !await bcrypt.compare(password, user.password)) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, tokenVersion: user.tokenVersion },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    return { user, token, refreshToken };
  }
}
```

## Related Documentation

- [API Reference](./API_REFERENCE.md)
- [Middleware](./MIDDLEWARE.md)
- [Frontend Architecture](./FRONTEND.md)
