# Module Contract: Saved Prompt Shortcuts

## Data Model

```
UserPromptShortcut {
  id        UUID (PK)
  userId    UUID (FK → User)
  label     VARCHAR(100)   — display name shown in panel
  prompt    TEXT           — the prompt text sent or pre-filled
  sortOrder INT            — ascending display order, default 0
  createdAt TIMESTAMP
  updatedAt TIMESTAMP
}
```

**Limits**: 20 shortcuts/user on `free` plan; unlimited on `pro`.

---

## API Routes — `/api/ai/shortcuts`

All routes require `Authorization: Bearer <jwt>` (authenticate middleware).

| Method | Path         | Body / Query                             | Response                    |
|--------|--------------|------------------------------------------|-----------------------------|
| GET    | `/`          | —                                        | `{ data: Shortcut[] }`      |
| POST   | `/`          | `{ label, prompt }`                      | `{ data: Shortcut }`        |
| PUT    | `/:id`       | `{ label?, prompt?, sortOrder? }`        | `{ data: Shortcut }`        |
| DELETE | `/:id`       | —                                        | `{ success: true }`         |
| PUT    | `/reorder`   | `{ ids: string[] }` (ordered list)       | `{ success: true }`         |

**Error cases**:
- `POST /` when cap reached → `422 { error: "SHORTCUT_LIMIT_REACHED", limit: 20 }`
- `PUT|DELETE /:id` with foreign id → `404 Not Found`

---

## Service Interface — `PromptShortcutService`

```typescript
getShortcuts(userId: string): Promise<Shortcut[]>
createShortcut(userId: string, plan: SubscriptionPlan, input: CreateInput): Promise<Shortcut>
updateShortcut(userId: string, id: string, input: UpdateInput): Promise<Shortcut>
deleteShortcut(userId: string, id: string): Promise<void>
reorderShortcuts(userId: string, ids: string[]): Promise<void>
```

---

## Frontend API client — `lib/api/prompt-shortcuts.ts`

```typescript
getShortcuts(): Promise<Shortcut[]>
createShortcut(data: { label: string; prompt: string }): Promise<Shortcut>
updateShortcut(id: string, data: Partial<Shortcut>): Promise<Shortcut>
deleteShortcut(id: string): Promise<void>
reorderShortcuts(ids: string[]): Promise<void>
```

---

## Hook — `usePromptShortcuts`

```typescript
{
  shortcuts: Shortcut[]
  isLoading: boolean
  addShortcut(label, prompt): void
  editShortcut(id, label, prompt): void
  removeShortcut(id): void
  reorder(ids): void
  isAtLimit: boolean     // true when free user has ≥ 20 shortcuts
  limitCount: number     // 20
}
```

---

## Components

### `PromptShortcutsPanel`
- Props: `open`, `onClose`, `onSelect(prompt)`, `translations`
- Renders list of shortcuts; clicking one calls `onSelect(prompt)` (pre-fills input)
- Inline add form: label + prompt textarea
- Per-item delete button
- Shows "Limit reached" badge when `isAtLimit`

### `ChatInput` changes
- New optional prop `onShortcutsClick?: () => void`
- Bookmark icon button (left of mic) calls `onShortcutsClick`

### `ChatContainer` changes
- `showShortcutsPanel` state
- `handleShortcutSelect(prompt)` sets textarea value via `setInputValue`
