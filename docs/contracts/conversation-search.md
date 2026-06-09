# Module Contract: Conversation Search

## Backend — GET /api/ai/conversations

**New optional query param**: `q` (string, max 200 chars)

When present: filters results to conversations whose `title` contains `q` (case-insensitive).
When absent: existing behaviour (return latest 50, ordered by `updatedAt DESC`).

Scope: user's own conversations only (same as the base endpoint).

```
GET /api/ai/conversations?q=faktura+VAT&limit=50
Authorization: Bearer <token>

200 OK
{ success: true, data: ConversationListItem[] }
```

## Frontend — ConversationList component

**New prop**: none (search state is internal to the component).

**Behaviours**:
- Search `<input>` at the top of the list, placeholder "Search conversations…".
- `useRef` for the input element; `document.addEventListener('keydown')` binds Ctrl+K / Cmd+K → `input.focus()`.
- `useState<string>` for the raw query value.
- Filtering: `conversations` and `sharedConversations` arrays filtered by `title.toLowerCase().includes(q.toLowerCase())`.
- `HighlightedText` helper component wraps matching substring in `<mark>`.
- Empty state when both filtered arrays are empty and `q !== ''`.
- Ctrl+K shortcut registered in the component, cleaned up on unmount.
