# Contract: GET /api/tax-calendar/upcoming

## Purpose
Returns upcoming (and recently-overdue) Polish statutory tax deadlines for display in the chat sidebar nudge widget.

## Request

```
GET /api/tax-calendar/upcoming?days=14&locale=pl
Authorization: Bearer <jwt>
```

| Query param | Type   | Default | Description                             |
|-------------|--------|---------|-----------------------------------------|
| `days`      | number | `14`    | Look-ahead window in days               |
| `locale`    | string | `pl`    | Response language (`pl`, `en`, `ru`)    |

## Response 200

```json
{
  "success": true,
  "data": [
    {
      "id": "vat-7-2026-06",
      "name": "VAT-7",
      "description": "Podatek VAT — deklaracja miesięczna",
      "date": "2026-06-25",
      "daysUntil": 3,
      "urgency": "urgent",
      "obligatory": true,
      "category": "vat"
    }
  ]
}
```

### `urgency` values
| Value      | Condition                |
|------------|--------------------------|
| `overdue`  | `daysUntil < 0`          |
| `urgent`   | `0 <= daysUntil <= 3`    |
| `soon`     | `4 <= daysUntil <= 7`    |
| `normal`   | `daysUntil > 7`          |

## Frontend usage
- Fetched on sidebar mount via `useTaxDeadlines` hook (React Query, 1 h stale-time)
- Clicking a row opens a new AI conversation with a pre-filled prompt
- Shows max 5 rows; overflow hidden with scroll
