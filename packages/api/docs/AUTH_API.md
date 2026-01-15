# Authentication API Documentation

## Base URL
```
http://localhost:3001/api/auth
```

## Endpoints

### 1. Register User

**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "companyName": "Acme Corp" // optional
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

**Error Responses:**
- `400` - Validation error
- `409` - Email already registered
- `500` - Server error

---

### 2. Login

**POST** `/api/auth/login`

Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Invalid credentials
- `500` - Server error

---

### 3. Refresh Token

**POST** `/api/auth/refresh`

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Invalid or expired refresh token
- `500` - Server error

---

### 4. Logout

**POST** `/api/auth/logout`

Logout user and invalidate refresh token.

**Headers:**
```
Authorization: Bearer {token}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Error Responses:**
- `401` - Unauthorized (no token or invalid token)
- `500` - Server error

---

### 5. Get Current User

**GET** `/api/auth/me`

Get current authenticated user profile.

**Headers:**
```
Authorization: Bearer {token}
```

**Success Response (200):**
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
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `404` - User not found
- `500` - Server error

---

### 6. Google OAuth

**POST** `/api/auth/oauth/google`

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

**Success Response (200):**
```json
{
  "success": true,
  "message": "OAuth authentication successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

---

### 7. GitHub OAuth

**POST** `/api/auth/oauth/github`

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

**Success Response (200):**
```json
{
  "success": true,
  "message": "OAuth authentication successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

---

## Rate Limiting

All endpoints are rate limited:

- **Register**: 5 requests per 15 minutes
- **Login**: 10 requests per 15 minutes
- **Refresh**: 20 requests per 15 minutes
- **OAuth**: 10 requests per 15 minutes
- **Global**: 100 requests per 15 minutes

Rate limit headers:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 2024-01-15T10:15:00.000Z
```

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Human readable error message",
  "details": [] // Optional, for validation errors
}
```

## Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one number
- At least one special character

## Token Expiry

- **Access Token**: 15 minutes
- **Refresh Token**: 7 days
