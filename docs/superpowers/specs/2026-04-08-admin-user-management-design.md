# Admin User Management — Design Spec

**Date:** 2026-04-08
**Status:** Approved (brainstorming) — revised after spec review
**Author:** Claude Code (with user)

## Goal

Extend the existing `/admin` page so that an admin can:

1. Delete a user (soft delete by default, hard delete with confirmation).
2. Change a user's subscription plan (`free` ↔ `pro`).
3. Edit usage limits (`aiMessagesLimit`, `wfirmaRequestsLimit`) and reset usage counters.
4. View a deep, **privacy-preserving** statistics page per user (no message content, no memory contents, no conversation titles, no tool arguments).

A GitHub issue will be created before implementation begins.

## Non-Goals

- Stripe synchronization on plan change (out of scope — admin override only changes the local `subscriptionPlan` field).
- Adding new tracking columns (e.g., `lastLoginAt`, `AIToolUsage.success/duration`). Statistics are derived from what is already in the database.
- Editing personal user info (name, email, locale) from admin UI.
- Bulk operations.
- Restoring soft-deleted users from the admin UI.

## Existing State

- **Frontend:** `packages/web/src/app/admin/page.tsx` → `AdminDashboard` (list of users with search, pagination, role change), `/admin/audit-log` page exists.
- **Backend:**
  - `AdminService` (`packages/api/src/services/admin.service.ts`) has `getUsers`, `getDashboardStats`, `getUserDetail`, `updateUserRole`.
  - `admin.routes.ts` exposes `GET /dashboard`, `GET /users`, `GET /users/:id`, `PATCH /users/:id/role`, `GET /audit-log`. All routes are protected by `authenticateToken` + `requireAdmin`.
- **Schema:** `User` already has `subscriptionPlan`, `subscriptionStatus`, `aiMessagesLimit`, `aiMessagesUsed`, `wfirmaRequestsLimit`, `wfirmaRequestsUsed`, `deletedAt`, `ttsCharactersUsed`, `ttsCostUsd`. Cascade deletes are configured for relations like `AIToolUsage`, `AIMemory`, etc.
- **Stats source:** `langsmithService.getDashboardData({ userId, timeRange })` already returns cost/tokens per user; field names are `promptTokens` / `completionTokens`.
- **AuditLog model:** has `userId` (actor), `action`, `entity`, `entityId`, `changes` (JSONB), `ip`, `userAgent`, `createdAt`.

## Schema Limitations (Accepted)

- `AIToolUsage` does **not** track success/error or duration → tool success rate and avg execution time are excluded from the spec.
- `User` has no `lastLoginAt` → "last activity" is derived from `MAX(AIConversation.updatedAt)` and `MAX(AIToolUsage.createdAt)`.
- Telegram-specific peak hours are not split out — only "channel active" flag is reported.

## Architecture

### Frontend

- **New route:** `packages/web/src/app/admin/users/[id]/page.tsx` → `UserDetailView`.
- The user list in `AdminDashboard` becomes clickable; clicking a row navigates to the detail page.
- New component folder: `packages/web/src/components/admin/user-detail/`
  - `UserProfileCard.tsx` — read-only header (email, name, role badge, plan badge, dates, **deleted/active badge**, KPIs from stats).
  - `SubscriptionPanel.tsx` — dropdown `free | pro`, save button, displays read-only `subscriptionStatus` and `subscriptionEndDate`.
  - `LimitsPanel.tsx` — two number inputs (`aiMessagesLimit`, `wfirmaRequestsLimit`) with `used / limit` hint, save button, separate "Reset AI usage", "Reset wFirma usage", "Reset both" buttons.
  - `UsageStatsPanel.tsx` — cost & tokens block.
  - `ActivityChart.tsx` — bar/line chart for `activityByDay` (toolCalls + conversations series).
  - `ToolUsagePanel.tsx` — top-10 tools horizontal bar + category donut.
  - `BehaviorPanel.tsx` — channels, TTS, memories, last activity.
  - `DangerZone.tsx` — soft delete (single confirmation modal) and hard delete (modal requires typing user email to confirm).
- **State / data fetching:** React Query, with mutation invalidation. Optimistic updates for plan and limits.
- **i18n:** new keys added to `packages/web/src/i18n/messages/{en,pl,ru}/admin.json` (extend the existing `admin` namespace).
- **Notifications:** existing toast library used in the project.
- **Disabled actions:** soft-delete, hard-delete, and role-change buttons are disabled when `targetUserId === currentAdminId`.
- **`getUserDetail` change:** the existing `getUserDetail` service method currently returns the last 10 `conversations` with their `title` field. **For the new admin user detail page, the `conversations` array is removed from the response** to avoid leaking conversation titles. The new `UserDetailView` does not display individual conversations — only aggregate counts via `/stats`.

### Backend

- **`AdminService` extension** (`packages/api/src/services/admin.service.ts`):
  - `softDeleteUser(userId)` — sets `deletedAt = now()`.
  - `hardDeleteUser(userId)` — `prisma.user.delete()` (cascades through `onDelete: Cascade`).
  - `updateSubscriptionPlan(userId, plan)` — updates only `subscriptionPlan`.
  - `updateUserLimits(userId, { aiMessagesLimit?, wfirmaRequestsLimit? })` — at least one field required, both must be integers, `>= 0`, `<= 1_000_000`. `0` means "hard block — user cannot make requests". Float values are rejected.
  - `resetUsageCounter(userId, type: 'ai' | 'wfirma' | 'both')` — zeroes the corresponding `*Used` fields.
  - `getUserDeepStats(userId, range: 'week' | 'month' | 'year')` — returns `UserDeepStats` (see below).
- **New routes** (in existing `admin.routes.ts`):
  - `DELETE /api/admin/users/:id` → soft delete.
  - `DELETE /api/admin/users/:id/hard` → hard delete (separate route for safety; query-string boolean rejected by reviewer).
  - `PATCH /api/admin/users/:id/subscription` → `{ plan }`.
  - `PATCH /api/admin/users/:id/limits` → `{ aiMessagesLimit?, wfirmaRequestsLimit? }`.
  - `POST /api/admin/users/:id/reset-usage` → `{ type }`.
  - `GET /api/admin/users/:id/stats?range=week|month|year` → `UserDeepStats`.
- **Audit logging:** every mutation calls a helper `auditAdminAction(actorId, action, targetUserId, changes)` that writes to `AuditLog` as:
  - `userId = actorId` (the admin)
  - `entity = 'User'`
  - `entityId = targetUserId`
  - `action = 'admin.user.<operation>'` (e.g., `admin.user.softDelete`, `admin.user.updateLimits`)
  - `changes = { before, after }` JSONB
  - For **hard delete**: `changes.before` = full snapshot of the deleted user row (selected fields, no sensitive blobs); `changes.after = null`.
- **Self-action guard:** rejects with HTTP 400 when `req.user.id === params.id` for these routes only:
  - `DELETE /users/:id` (soft)
  - `DELETE /users/:id/hard`
  - `PATCH /users/:id/role` (existing — guard added if missing)
  - Other routes (`subscription`, `limits`, `reset-usage`, `stats`) are NOT self-guarded.
- **Soft-deleted user handling:**
  - `GET /users/:id`, `GET /users/:id/stats`, and `DELETE /users/:id/hard` work on soft-deleted users (admin needs to recover/purge them).
  - `PATCH /users/:id/subscription`, `PATCH /users/:id/limits`, `POST /users/:id/reset-usage`, and `DELETE /users/:id` (soft) reject with HTTP 400 if the target user is already soft-deleted.
  - `getUsers` continues to filter `deletedAt: null` (soft-deleted users do not appear in the list).
- **Validation:** Zod schemas in the controller layer (matches the project's existing pattern). All numeric inputs use `.int()`.
- **Rate limit:** new dedicated `adminMutationLimiter` at **60 req / 15 min** (separate from `updateLimiter`) to allow legitimate admin audit sessions.

## API Contracts

```ts
// DELETE /api/admin/users/:id
// 200 → { ok: true, mode: 'soft' }
// 400 → cannot delete self | already soft-deleted
// 404 → user not found

// DELETE /api/admin/users/:id/hard
// 200 → { ok: true, mode: 'hard' }
// 400 → cannot delete self
// 404 → user not found

// PATCH /api/admin/users/:id/subscription
// body: { plan: 'free' | 'pro' }
// 200 → { id, subscriptionPlan }
// 400 → invalid plan | user is soft-deleted
// 404 → user not found

// PATCH /api/admin/users/:id/limits
// body: { aiMessagesLimit?: number (int, 0..1_000_000), wfirmaRequestsLimit?: number (int, 0..1_000_000) }
// (at least one field required)
// 200 → { id, aiMessagesLimit, wfirmaRequestsLimit }
// 400 → invalid payload | user is soft-deleted
// 404 → user not found

// POST /api/admin/users/:id/reset-usage
// body: { type: 'ai' | 'wfirma' | 'both' }
// 200 → { id, aiMessagesUsed, wfirmaRequestsUsed }
// 400 → invalid type | user is soft-deleted
// 404 → user not found

// GET /api/admin/users/:id/stats?range=week|month|year
// 200 → UserDeepStats
// 400 → invalid range
// 404 → user not found
```

## `UserDeepStats` Shape

All `Date`-typed fields below are serialized as ISO 8601 strings over the wire.

```ts
type UserDeepStats = {
  range: 'week' | 'month' | 'year';

  // From langsmithService.getDashboardData (single source of truth for cost/tokens)
  cost: {
    totalUsd: number;
    totalTokens: number;
    promptTokens: number;       // langsmith field name (was inputTokens)
    completionTokens: number;   // langsmith field name (was outputTokens)
    runCount: number;
    langsmithConversationCount: number; // distinct conversationIds observed in LangSmith runs
    avgCostPerLangsmithConversation: number; // totalUsd / langsmithConversationCount
  };

  // From DB (AIConversation, AIToolUsage). Distinct from cost.* numbers.
  activityByDay: Array<{
    date: string;        // YYYY-MM-DD (UTC)
    toolCalls: number;   // count from AIToolUsage where createdAt in day
    conversations: number; // count from AIConversation where createdAt in day
  }>;

  conversations: {
    totalInRange: number; // count from AIConversation where createdAt in range
  };

  toolUsage: {
    totalCalls: number;
    topTools: Array<{ toolName: string; count: number }>; // top 10
    byCategory: Array<{ category: ToolCategory; count: number }>;
  };

  channels: {
    web: { active: true }; // always true (account exists)
    telegram: { active: boolean; linkedAt: string | null }; // ISO date string
  };

  tts: {
    charactersUsed: number;
    costUsd: number;
  };

  memories: {
    total: number;
    byCategory: Array<{ category: AIMemoryCategory; count: number }>;
  };

  lastActivity: {
    lastConversationAt: string | null; // ISO date string from MAX(AIConversation.updatedAt), all-time
    lastToolCallAt: string | null;     // ISO date string from MAX(AIToolUsage.createdAt), all-time
  };
};

// Closed enum — toolName prefix → category mapping
type ToolCategory =
  | 'wfirma'   // wfirma_*
  | 'ksef'     // ksef_*
  | 'memory'   // memory_*, prefer_*
  | 'hr'       // hr_*, employee_*
  | 'org'      // org_*, organization_*
  | 'other';   // fallback for any toolName not matching the above prefixes

// AIMemoryCategory comes from Prisma enum (business_fact, frequent_entity, user_preference, workflow_pattern)
```

The exact prefix → category mapping is implemented in a single helper `categorizeToolName(toolName: string): ToolCategory` to keep frontend and backend in sync; the helper lives in `packages/api/src/services/admin.helpers.ts` and the frontend imports the same map via a shared types file.

## Privacy

The `/stats` endpoint never returns:
- Conversation titles or message content.
- Tool call arguments or results.
- AI memory `value` fields (only category counts).
- File contents, KSeF invoice payloads, or personal contractor data.

The endpoint returns only **aggregates and counts**. The existing `getUserDetail` endpoint is modified to drop the `conversations` include (which previously returned conversation titles), so the new admin user detail page never shows conversation titles or content.

**Acknowledged inference risk:** category counts for `AIMemoryCategory` and tool category counts are themselves a coarse profile of how the user uses the system. This is judged acceptable for an admin role and is documented here for transparency.

## Testing

### Backend (Jest)

`admin.service.spec.ts` — unit tests:
- `softDeleteUser` sets `deletedAt`; rejects if already soft-deleted.
- `hardDeleteUser` removes the row; works on soft-deleted users.
- `updateSubscriptionPlan` updates only `subscriptionPlan`; rejects if soft-deleted.
- `updateUserLimits` validates: integer, range `0..1_000_000` inclusive, at least one field.
- `resetUsageCounter` zeroes the correct counter for each `type`.
- `getUserDeepStats` returns the expected shape (langsmith mocked); category mapping matches the closed enum.
- Self-action guard throws when `actorId === targetId` for soft-delete, hard-delete, role change.

`admin.routes.spec.ts` — integration tests:
- 401/403 without admin token.
- 400 for invalid payloads (Zod), self-action, soft-deleted target where applicable.
- 404 for non-existent users on every new route.
- 200 happy paths for each new route.
- AuditLog entry written after every mutation, with `entity='User'`, `entityId=targetId`, action prefix `admin.user.`, and `changes.before` / `changes.after`.
- Hard-delete audit entry contains `changes.before` snapshot and `changes.after = null`.

### Frontend (Vitest + RTL)

- `UserDetailView.test.tsx` — renders all sections from a mocked API response; shows "deleted" badge when `user.deletedAt != null`.
- `LimitsPanel.test.tsx` — input change, validation, mutation call; rejects floats.
- `DangerZone.test.tsx` — hard delete confirmation flow (must type email exactly).

### E2E (Playwright)

- Admin opens user detail → changes plan → value persists after refresh.
- Admin soft-deletes a user → user no longer appears in the list, but admin can navigate to `/admin/users/:id` directly and sees the "deleted" badge in `UserProfileCard`.
- Admin hard-deletes a soft-deleted user → 404 on subsequent navigation.

## Security

- Routes protected by `authenticateToken` + `requireAdmin` (existing middleware).
- Self-action guard on soft delete, hard delete, and role change (enumerated above).
- New `adminMutationLimiter` (60 req / 15 min) on all mutation routes.
- Each mutation writes an `AuditLog` entry with `entity='User'`, `entityId=targetUserId`, `action='admin.user.<op>'`, and `changes={before, after}`.
- The `/stats` endpoint exposes only aggregates; no personal content is included.
- The `getUserDetail` endpoint is modified to no longer leak conversation titles to admins.

## Out of Scope / Future Work

- Adding `lastLoginAt` to the `User` model.
- Adding `success` and `durationMs` to `AIToolUsage` to enable error-rate and latency stats.
- Stripe sync on admin plan changes.
- Bulk operations on users.
- Restoring soft-deleted users from the admin UI.
