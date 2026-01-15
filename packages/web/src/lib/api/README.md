# API Client

Type-safe API client for frontend with automatic token management and retry logic.

## Features

- ✅ **Type-safe** - Full TypeScript support
- ✅ **Automatic token management** - Handles JWT tokens automatically
- ✅ **Token refresh** - Automatically refreshes expired tokens
- ✅ **Retry logic** - Exponential backoff for failed requests
- ✅ **Error handling** - Typed errors with details
- ✅ **Timeout handling** - Configurable request timeouts
- ✅ **Request logging** - Development mode logging
- ✅ **File uploads** - Support for multipart/form-data

## Usage

### Basic Requests

```typescript
import { apiClient } from '@/lib/api/api-client';

// GET request
const user = await apiClient.get('/api/users/me');

// POST request
const newUser = await apiClient.post('/api/users', {
  name: 'John Doe',
  email: 'john@example.com',
});

// PUT request
const updated = await apiClient.put('/api/users/123', {
  name: 'Jane Doe',
});

// DELETE request
await apiClient.delete('/api/users/123');
```

### Using Convenience Functions

```typescript
import { get, post, put, del } from '@/lib/api/api-client';

const user = await get('/api/users/me');
const created = await post('/api/users', data);
const updated = await put('/api/users/123', data);
await del('/api/users/123');
```

### Using Endpoints

```typescript
import { apiClient } from '@/lib/api/api-client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';

// Get current user
const user = await apiClient.get(API_ENDPOINTS.AUTH.ME);

// Get specific invoice
const invoice = await apiClient.get(API_ENDPOINTS.INVOICES.GET('invoice-id'));
```

### Error Handling

```typescript
import { apiClient, ApiError, NetworkError } from '@/lib/api/api-client';

try {
  const data = await apiClient.get('/api/users');
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.message);
    console.error('Status:', error.statusCode);
    console.error('Details:', error.details);
  } else if (error instanceof NetworkError) {
    console.error('Network Error:', error.message);
  }
}
```

### Custom Options

```typescript
// Skip authentication
await apiClient.post('/api/auth/login', data, {
  skipAuth: true,
});

// Custom timeout
await apiClient.get('/api/slow-endpoint', {
  timeout: 60000, // 60 seconds
});

// Custom retries
await apiClient.get('/api/unreliable', {
  retries: 5,
});

// Custom headers
await apiClient.get('/api/data', {
  headers: {
    'X-Custom-Header': 'value',
  },
});
```

### File Upload

```typescript
import { upload } from '@/lib/api/api-client';

const file = document.querySelector('input[type="file"]').files[0];

const result = await upload('/api/upload', file, {
  category: 'invoice',
  year: '2024',
});
```

### Type-Safe Responses

```typescript
interface User {
  id: string;
  email: string;
  name: string;
}

// Type-safe response
const user = await apiClient.get<User>('/api/users/me');
console.log(user.email); // TypeScript knows this is a string
```

## API Response Format

All API responses follow this format:

```typescript
{
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: ValidationError[];
}
```

## Error Types

### ApiError

```typescript
{
  code: string;
  message: string;
  details?: ValidationError[];
  statusCode?: number;
}
```

### NetworkError

```typescript
{
  message: string;
}
```

## Token Management

The client automatically:
1. Adds `Authorization: Bearer <token>` header
2. Refreshes token on 401 responses
3. Retries failed requests after refresh
4. Clears tokens if refresh fails

## Retry Logic

Failed requests are automatically retried with exponential backoff:

- Attempt 1: Immediate
- Attempt 2: 1 second delay
- Attempt 3: 2 seconds delay
- Attempt 4: 4 seconds delay
- Max delay: 10 seconds

Retries are skipped for:
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Testing

```bash
npm run test
```

See `__tests__/api-client.test.ts` for examples.
