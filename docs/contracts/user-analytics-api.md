# Contract: User Analytics API

## Endpoint

`GET /api/users/me/analytics`

### Auth

Bearer JWT (same token as all authenticated endpoints). Returns 401 if missing/invalid.

### Query Parameters

| Param   | Type                         | Default  | Description          |
|---------|------------------------------|----------|----------------------|
| `range` | `"week" \| "month" \| "year"` | `month`  | Aggregation window   |

### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "range": "month",
    "conversations": {
      "totalInRange": 42
    },
    "toolUsage": {
      "totalCalls": 187,
      "topTools": [
        { "toolName": "wfirma_get_invoices", "count": 54 },
        { "toolName": "wfirma_get_contractors", "count": 31 },
        { "toolName": "wfirma_create_invoice", "count": 20 },
        { "toolName": "wfirma_get_expenses", "count": 17 },
        { "toolName": "ksef_get_status", "count": 12 }
      ]
    },
    "activityByDay": [
      { "date": "2026-05-01", "conversations": 3, "toolCalls": 12 },
      { "date": "2026-05-02", "conversations": 0, "toolCalls": 0 }
    ],
    "usageQuota": {
      "used": 42,
      "limit": 500
    }
  }
}
```

### Error responses

| Status | Condition                     |
|--------|-------------------------------|
| 401    | Missing or invalid JWT        |
| 400    | Invalid `range` query param   |
| 500    | Internal server error         |

## Notes

- `activityByDay` covers only days within the selected range where at least one conversation
  or tool call occurred (sparse — missing days mean zero activity).
- `usageQuota` reflects the running `aiMessagesUsed` counter from the `User` record.
  It is reset by admins or by the billing cycle; it is not scoped to `range`.
- Top tools are capped at 5 entries, sorted descending by count.
