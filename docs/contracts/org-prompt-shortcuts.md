# Module Contract: Org Prompt Shortcuts

## Purpose
Org-level prompt shortcuts shared across all members of an organisation. Admins create/edit/delete; all active members read.

## Data model

```
OrgPromptShortcut {
  id             UUID  PK
  organizationId UUID  FK → organizations.id CASCADE
  label          VARCHAR(100)
  prompt         TEXT
  sortOrder      INT DEFAULT 0
  createdBy      UUID  FK → users.id
  createdAt      TIMESTAMP
  updatedAt      TIMESTAMP
}
```

## API surface

| Method | URL | Auth | Notes |
|--------|-----|------|-------|
| GET    | /api/organization/shortcuts        | Active org member | Returns org shortcuts ordered by sortOrder |
| POST   | /api/organization/shortcuts        | Org admin only    | Max 20 per org |
| PUT    | /api/organization/shortcuts/:id    | Org admin only    | label/prompt/sortOrder |
| DELETE | /api/organization/shortcuts/:id    | Org admin only    | |

Error codes:
- `ORG_SHORTCUT_LIMIT_REACHED` (422) — org has 20 shortcuts already
- `NOT_ORG_ADMIN` (403) — caller is not an active org admin
- `NOT_ORG_MEMBER` (403) — caller has no active org membership

## Frontend contracts

### `OrgPromptShortcut` (lib/api/org-prompt-shortcuts.ts)
```ts
{ id, label, prompt, sortOrder, createdAt, updatedAt }
```

### `usePromptShortcuts` hook additions
```ts
orgShortcuts: OrgPromptShortcut[]   // raw org list
isOrgAdmin: boolean
isOrgAtLimit: boolean
addOrgShortcut(label, prompt): Promise<void>
editOrgShortcut(id, label, prompt): void
removeOrgShortcut(id): void
isAddingOrg: boolean
```

Combined `shortcuts` array contains both sources tagged with `source: 'personal' | 'org'`, org items first.

### `PromptShortcutsPanel` behaviour
- Org shortcuts section header with building icon
- Non-admins: read-only (no edit/delete)
- Admins: edit/delete on org shortcuts (same UI as personal)
- Personal shortcuts section below

### `OrganizationPanel` behaviour  
- Tabs: "Members" | "Shared Prompts" (shown only when user is active org member)
- Shared Prompts tab: admin sees full CRUD, member sees read-only list
