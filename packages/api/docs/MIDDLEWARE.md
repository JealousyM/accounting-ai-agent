# Middleware Documentation

## Authentication Middleware

### authenticateToken

Required authentication middleware that verifies JWT tokens.

**Usage:**
```typescript
import { authenticateToken } from './middleware/auth.middleware';

router.get('/protected', authenticateToken, (req, res) => {
  const userId = req.user?.userId;
  // Handle protected route
});
```

**Behavior:**
- Extracts token from `Authorization: Bearer {token}` header
- Verifies JWT signature and expiration
- Attaches `user` (JwtPayload) to request object
- Fetches full user data and attaches as `authUser`
- Returns 401 if token is missing or invalid

**Request Extensions:**
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

---

### optionalAuth

Optional authentication middleware for public endpoints.

**Usage:**
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

**Behavior:**
- Attempts to verify token if provided
- Attaches user data if token is valid
- Continues without error if token is missing or invalid
- Never returns 401 error

---

### requireUserId

Ensures authenticated user can only access their own resources.

**Usage:**
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

**Behavior:**
- Must be used after `authenticateToken`
- Compares authenticated userId with route parameter
- Returns 403 if user tries to access another user's resources

---

## Validation Middleware

### validateRequest

Validates request data using Zod schemas.

**Usage:**
```typescript
import { validateRequest } from './middleware/validation.middleware';
import { registerSchema } from './validators/auth.validators';

router.post('/register', 
  validateRequest(registerSchema),
  authController.register
);
```

**Behavior:**
- Validates `body`, `query`, and `params` against schema
- Returns 400 with detailed errors if validation fails
- Continues to next middleware if validation passes

---

## Rate Limiting Middleware

### rateLimiter

Redis-based rate limiting for API endpoints.

**Usage:**
```typescript
import { rateLimiter } from './middleware/rate-limiter.middleware';

router.post('/login', 
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }),
  authController.login
);
```

**Options:**
```typescript
{
  windowMs: number;        // Time window in milliseconds
  max: number;             // Max requests per window
  message?: string;        // Custom error message
  statusCode?: number;     // Custom status code (default: 429)
}
```

**Response Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 2024-01-15T10:15:00.000Z
```

---

## Error Handler Middleware

### errorHandler

Global error handler for unhandled errors.

**Usage:**
```typescript
import { errorHandler } from './middleware/error-handler.middleware';

app.use(errorHandler);
```

**Behavior:**
- Logs all errors with Winston
- Returns 500 with error details in development
- Returns generic message in production

---

### notFoundHandler

Handles 404 Not Found errors.

**Usage:**
```typescript
import { notFoundHandler } from './middleware/error-handler.middleware';

app.use(notFoundHandler);
```

**Behavior:**
- Returns 404 for undefined routes
- Logs route access attempts

---

## Middleware Chain Examples

### Protected Route
```typescript
router.post('/logout',
  authenticateToken,
  authController.logout
);
```

### Rate Limited Public Route
```typescript
router.post('/register',
  rateLimiter({ windowMs: 15 * 60 * 1000, max: 5 }),
  validateRequest(registerSchema),
  authController.register
);
```

### User-Specific Resource
```typescript
router.get('/users/:userId/invoices',
  authenticateToken,
  requireUserId('userId'),
  invoiceController.getUserInvoices
);
```

### Optional Auth with Personalization
```typescript
router.get('/recommendations',
  optionalAuth,
  recommendationController.getRecommendations
);
```
