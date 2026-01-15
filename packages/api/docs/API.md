# API Documentation

## Base URL
```
http://localhost:3001/api
```

## Authentication
All protected endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

## Endpoints

### Health Check
```http
GET /health
```
Server health check.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

### Authentication

#### Register
```http
POST /api/auth/register
```

#### Login
```http
POST /api/auth/login
```

### Transactions

#### Get All Transactions
```http
GET /api/transactions
```

#### Create Transaction
```http
POST /api/transactions
```

### AI Agent

#### Analyze Document
```http
POST /api/ai/analyze
```

#### Generate Report
```http
POST /api/ai/report
```

## Error Responses

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```
