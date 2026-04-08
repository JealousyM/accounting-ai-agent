# Admin User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-user admin operations (delete, plan change, limits, deep stats) to `/admin` with privacy-preserving statistics.

**Architecture:** Extend existing `AdminService` and `admin.routes.ts` with new methods and routes. Add a dedicated `/admin/users/[id]` page with focused panel components. Audit every mutation via existing `auditLogService`. No schema migrations.

**Tech Stack:** TypeScript, Express, Prisma, Zod, Jest, Next.js 15, React 19, React Query, Tailwind, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-04-08-admin-user-management-design.md`
**GitHub Issue:** https://github.com/micode-ai/accounting-ai-agent/issues/88

---

## File Structure

### Backend — Create

- `packages/api/src/services/admin.helpers.ts` — `categorizeToolName(toolName)`, `ToolCategory` type, `assertNotSelf(actorId, targetId)`, `assertNotSoftDeleted(user)`.
- `packages/api/src/types/admin.types.ts` — `UserDeepStats`, request DTOs, validation schemas.
- `packages/api/src/services/__tests__/admin.helpers.test.ts` — unit test for tool category helper.
- `packages/api/src/services/__tests__/admin.service.test.ts` — unit tests for new `AdminService` methods.
- `packages/api/src/services/__tests__/admin.routes.test.ts` — integration tests for new routes.

> **Test directory:** all backend tests live in `packages/api/src/services/__tests__/` (existing pattern: `auth.service.test.ts`, `ksef.service.test.ts`, etc.). Do **not** create `packages/api/src/__tests__/`.

### Backend — Modify

- `packages/api/src/services/admin.service.ts` — add: `softDeleteUser`, `hardDeleteUser`, `updateSubscriptionPlan`, `updateUserLimits`, `resetUsageCounter`, `getUserDeepStats`. Drop `conversations` include from `getUserDetail`. Take `auditLogService` via constructor.
- `packages/api/src/services/admin.instance.ts` — wire `auditLogService`.
- `packages/api/src/controllers/admin.controller.ts` — add: `softDeleteUser`, `hardDeleteUser`, `updateSubscription`, `updateLimits`, `resetUsage`, `getUserStats`.
- `packages/api/src/routes/admin.routes.ts` — add new routes + `adminMutationLimiter` (60/15min). Add self-action guard helper.

### Frontend — Create

- `packages/web/src/app/admin/users/[id]/page.tsx` — route, wraps `AdminRoute` + `UserDetailView`.
- `packages/web/src/components/admin/user-detail/UserDetailView.tsx` — top-level page component, fetches user + stats, owns period selector.
- `packages/web/src/components/admin/user-detail/UserProfileCard.tsx`
- `packages/web/src/components/admin/user-detail/SubscriptionPanel.tsx`
- `packages/web/src/components/admin/user-detail/LimitsPanel.tsx`
- `packages/web/src/components/admin/user-detail/UsageStatsPanel.tsx`
- `packages/web/src/components/admin/user-detail/ActivityChart.tsx`
- `packages/web/src/components/admin/user-detail/ToolUsagePanel.tsx`
- `packages/web/src/components/admin/user-detail/BehaviorPanel.tsx`
- `packages/web/src/components/admin/user-detail/DangerZone.tsx`
- `packages/web/src/components/admin/user-detail/index.ts`
- `packages/web/e2e/admin-user-management.spec.ts` — Playwright E2E.

### Frontend — Modify

- `packages/web/src/lib/api/admin.ts` — extend with new endpoints (file already exists, 162 lines).
- `packages/web/src/components/admin/AdminDashboard.tsx` — make user rows clickable → navigate to `/admin/users/[id]`.
- `packages/web/src/i18n/messages/en/admin.json`, `pl/admin.json`, `ru/admin.json` — add new keys.

### Tests — exact paths

- Backend unit: `packages/api/src/services/__tests__/admin.service.test.ts`, `admin.helpers.test.ts`
- Backend integration: `packages/api/src/services/__tests__/admin.routes.test.ts`
- Frontend unit: `packages/web/src/components/admin/user-detail/__tests__/*.test.tsx`
- E2E: `packages/web/e2e/admin-user-management.spec.ts`

### Critical environment notes for the engineer

- **`req.user` shape:** the `authenticateToken` middleware sets `req.user = payload` where `payload.userId` (NOT `payload.id`) is the auth user id. Always use `req.user!.userId` in controllers, never `req.user!.id`. Also available: `req.authUser` (full DB user), but `req.user.userId` is the canonical id.
- **`packages/web/src/lib/api/admin.ts` already exists** (162 lines). You are **modifying** it, not creating it. It uses `import { apiClient } from './api-client'` (note the file name `api-client`, not `client`). Existing exports include `fetchAdminDashboard`, `fetchUsers`, `fetchUserDetail`, `updateUserRole`, `fetchAuditLog`, and a barrel `adminApi`. Add the new functions to that file and extend the `adminApi` barrel.
- **Prisma model casing:** `prisma.aIConversation`, `prisma.aIToolUsage`, `prisma.aIMemory`, `prisma.telegramLink`. Verify with `grep -n "prisma\.aI" packages/api/src/services` if unsure.
- **`AdminService` constructor strategy:** to minimize disruption, **do not inject langsmith via constructor**. Keep the existing module-level `import { langsmithService } from './langsmith.instance'` and call `langsmithService.getDashboardData(...)` directly inside `getUserDeepStats`. Only `auditLogService` is injected via constructor (Task 3). The Task 9 test mocks langsmith via `jest.mock('../langsmith.instance', ...)`.

---

## Phase 1: Backend Foundation

### Task 1: Tool category helper

**Files:**
- Create: `packages/api/src/services/admin.helpers.ts`
- Test: `packages/api/src/services/__tests__/admin.helpers.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/api/src/services/__tests__/admin.helpers.test.ts
import { categorizeToolName } from '../admin.helpers';

describe('categorizeToolName', () => {
  it.each([
    ['wfirma_list_invoices', 'wfirma'],
    ['ksef_send_invoice', 'ksef'],
    ['memory_save', 'memory'],
    ['prefer_set', 'memory'],
    ['hr_list_employees', 'hr'],
    ['employee_add', 'hr'],
    ['org_invite', 'org'],
    ['organization_get', 'org'],
    ['random_unknown_tool', 'other'],
    ['', 'other'],
  ])('maps %s → %s', (tool, category) => {
    expect(categorizeToolName(tool)).toBe(category);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```
npm run test --filter=@accounting-ai-agent/api -- admin.helpers
```
Expected: `Cannot find module '../services/admin.helpers'`

- [ ] **Step 3: Implement helper**

```ts
// packages/api/src/services/admin.helpers.ts
export type ToolCategory = 'wfirma' | 'ksef' | 'memory' | 'hr' | 'org' | 'other';

const PREFIX_MAP: Array<[RegExp, ToolCategory]> = [
  [/^wfirma_/, 'wfirma'],
  [/^ksef_/, 'ksef'],
  [/^(memory_|prefer_)/, 'memory'],
  [/^(hr_|employee_)/, 'hr'],
  [/^(org_|organization_)/, 'org'],
];

export function categorizeToolName(toolName: string): ToolCategory {
  for (const [re, cat] of PREFIX_MAP) {
    if (re.test(toolName)) return cat;
  }
  return 'other';
}

export function assertNotSelf(actorId: string, targetId: string): void {
  if (actorId === targetId) {
    const err = new Error('Cannot perform this action on your own account');
    (err as any).statusCode = 400;
    (err as any).code = 'SELF_ACTION_FORBIDDEN';
    throw err;
  }
}

export function assertNotSoftDeleted(user: { deletedAt: Date | null }): void {
  if (user.deletedAt !== null) {
    const err = new Error('User is soft-deleted');
    (err as any).statusCode = 400;
    (err as any).code = 'USER_SOFT_DELETED';
    throw err;
  }
}
```

- [ ] **Step 4: Run test, expect pass**

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/admin.helpers.ts packages/api/src/services/__tests__/admin.helpers.test.ts
git commit -m "feat(admin): tool category helper + guard helpers"
```

---

### Task 2: Admin types & Zod schemas

**Files:**
- Create: `packages/api/src/types/admin.types.ts`

- [ ] **Step 1: Implement types and schemas**

```ts
// packages/api/src/types/admin.types.ts
import { z } from 'zod';
import type { ToolCategory } from '../services/admin.helpers';
import type { AIMemoryCategory } from '@prisma/client';

export const subscriptionPlanSchema = z.object({
  plan: z.enum(['free', 'pro']),
});

export const limitsSchema = z
  .object({
    aiMessagesLimit: z.number().int().min(0).max(1_000_000).optional(),
    wfirmaRequestsLimit: z.number().int().min(0).max(1_000_000).optional(),
  })
  .refine(
    (d) => d.aiMessagesLimit !== undefined || d.wfirmaRequestsLimit !== undefined,
    { message: 'At least one limit field is required' }
  );

export const resetUsageSchema = z.object({
  type: z.enum(['ai', 'wfirma', 'both']),
});

export const statsRangeSchema = z.object({
  range: z.enum(['week', 'month', 'year']).default('month'),
});

export type StatsRange = 'week' | 'month' | 'year';

export interface UserDeepStats {
  range: StatsRange;
  cost: {
    totalUsd: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    runCount: number;
    langsmithConversationCount: number;
    avgCostPerLangsmithConversation: number;
  };
  activityByDay: Array<{ date: string; toolCalls: number; conversations: number }>;
  conversations: { totalInRange: number };
  toolUsage: {
    totalCalls: number;
    topTools: Array<{ toolName: string; count: number }>;
    byCategory: Array<{ category: ToolCategory; count: number }>;
  };
  channels: {
    web: { active: true };
    telegram: { active: boolean; linkedAt: string | null };
  };
  tts: { charactersUsed: number; costUsd: number };
  memories: { total: number; byCategory: Array<{ category: AIMemoryCategory; count: number }> };
  lastActivity: { lastConversationAt: string | null; lastToolCallAt: string | null };
}
```

- [ ] **Step 2: Type-check**

```
npm run build --filter=@accounting-ai-agent/api
```
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/types/admin.types.ts
git commit -m "feat(admin): types and Zod schemas for user mutations and stats"
```

---

### Task 3: AdminService.softDeleteUser

**Files:**
- Modify: `packages/api/src/services/admin.service.ts`
- Test: `packages/api/src/services/__tests__/admin.service.test.ts`

- [ ] **Step 1: Set up test scaffold + first failing test**

```ts
// packages/api/src/services/__tests__/admin.service.test.ts
// IMPORTANT: mock langsmith.instance BEFORE importing admin.service
jest.mock('../langsmith.instance', () => ({
  langsmithService: {
    getDashboardData: jest.fn().mockResolvedValue({
      userSummary: {
        totalCost: 0, totalTokens: 0, promptTokens: 0, completionTokens: 0,
        runCount: 0, conversationCount: 0, avgCostPerConversation: 0,
      },
    }),
    getAllUserStats: jest.fn().mockResolvedValue(new Map()),
    getAdminTotals: jest.fn().mockResolvedValue({
      totalCost: 0, totalTokens: 0, totalConversations: 0,
      ttsCost: 0, ttsCharacters: 0, ttsCalls: 0,
    }),
  },
}));

import { AdminService } from '../admin.service';
import { PrismaClient } from '@prisma/client';
import { langsmithService } from '../langsmith.instance';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  },
  aIConversation: { count: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn() },
  aIToolUsage: { count: jest.fn(), groupBy: jest.fn(), aggregate: jest.fn(), findFirst: jest.fn() },
  aIMemory: { count: jest.fn(), groupBy: jest.fn() },
  telegramLink: { findUnique: jest.fn() },
  $queryRaw: jest.fn().mockResolvedValue([]),
} as unknown as PrismaClient;

const mockAuditLogService = { create: jest.fn().mockResolvedValue(undefined) };

const ACTOR_ID = '00000000-0000-0000-0000-000000000001';
const TARGET_ID = '00000000-0000-0000-0000-000000000002';

beforeEach(() => jest.clearAllMocks());

describe('AdminService.softDeleteUser', () => {
  it('sets deletedAt on the user', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID,
      email: 't@x',
      deletedAt: null,
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({});

    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await svc.softDeleteUser({ actorId: ACTOR_ID, targetUserId: TARGET_ID });

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: TARGET_ID },
      data: { deletedAt: expect.any(Date) },
    });
    expect(mockAuditLogService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: ACTOR_ID,
        action: 'admin.user.softDelete',
        entity: 'User',
        entityId: TARGET_ID,
      })
    );
  });

  it('rejects self-delete', async () => {
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(
      svc.softDeleteUser({ actorId: ACTOR_ID, targetUserId: ACTOR_ID })
    ).rejects.toThrow(/own account/);
  });

  it('rejects already-deleted user', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID,
      email: 't@x',
      deletedAt: new Date(),
    });
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(
      svc.softDeleteUser({ actorId: ACTOR_ID, targetUserId: TARGET_ID })
    ).rejects.toThrow(/soft-deleted/);
  });

  it('throws 404-style error if user not found', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(
      svc.softDeleteUser({ actorId: ACTOR_ID, targetUserId: TARGET_ID })
    ).rejects.toThrow(/not found/);
  });
});
```

- [ ] **Step 2: Run test, expect failure** (constructor signature mismatch / method missing)

- [ ] **Step 3: Update `AdminService` constructor and add method**

> **Note:** Only `auditLog` is added to the constructor. `langsmithService` keeps its module-level import (already used by `getUsers` / `getDashboardStats`). Tests mock it via `jest.mock('../langsmith.instance', ...)`.

```ts
// In admin.service.ts
import { AuditLogService } from './audit-log.service';
import { assertNotSelf, assertNotSoftDeleted } from './admin.helpers';

export class AdminService {
  constructor(private prisma: PrismaClient, private auditLog: AuditLogService) {}

  // ... existing methods ...

  async softDeleteUser(params: { actorId: string; targetUserId: string }): Promise<void> {
    assertNotSelf(params.actorId, params.targetUserId);
    const user = await this.prisma.user.findUnique({
      where: { id: params.targetUserId },
      select: { id: true, email: true, deletedAt: true },
    });
    if (!user) {
      const err = new Error('User not found');
      (err as any).statusCode = 404;
      throw err;
    }
    assertNotSoftDeleted(user);

    const deletedAt = new Date();
    await this.prisma.user.update({
      where: { id: params.targetUserId },
      data: { deletedAt },
    });
    await this.auditLog.create({
      userId: params.actorId,
      action: 'admin.user.softDelete',
      entity: 'User',
      entityId: params.targetUserId,
      changes: { before: { deletedAt: null }, after: { deletedAt } },
    });
    logger.info('Admin: user soft-deleted', { actorId: params.actorId, targetUserId: params.targetUserId });
  }
}
```

- [ ] **Step 4: Update `admin.instance.ts`**

```ts
// packages/api/src/services/admin.instance.ts
import { prisma } from '../lib/prisma';
import { AdminService } from './admin.service';
import { auditLogService } from './audit-log.instance';

export const adminService = new AdminService(prisma, auditLogService);
```

- [ ] **Step 5: Run all admin tests, expect pass**

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/services/admin.service.ts packages/api/src/services/admin.instance.ts packages/api/src/services/__tests__/admin.service.test.ts
git commit -m "feat(admin): soft delete user with audit log + self/state guards"
```

---

### Task 4: AdminService.hardDeleteUser

**Files:**
- Modify: `packages/api/src/services/admin.service.ts`, `admin.service.test.ts`

- [ ] **Step 1: Add failing tests**

```ts
describe('AdminService.hardDeleteUser', () => {
  it('deletes a soft-deleted user and audits with snapshot', async () => {
    const userRow = {
      id: TARGET_ID, email: 't@x', firstName: 'T', lastName: 'X',
      role: 'user', subscriptionPlan: 'free', deletedAt: new Date('2026-01-01'),
      createdAt: new Date('2025-01-01'),
    };
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(userRow);
    (mockPrisma.user.delete as jest.Mock).mockResolvedValue(userRow);

    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await svc.hardDeleteUser({ actorId: ACTOR_ID, targetUserId: TARGET_ID });

    expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: TARGET_ID } });
    expect(mockAuditLogService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'admin.user.hardDelete',
        entity: 'User',
        entityId: TARGET_ID,
        changes: { before: expect.objectContaining({ id: TARGET_ID, email: 't@x' }), after: null },
      })
    );
  });

  it('works on non-soft-deleted users too', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID, email: 't@x', deletedAt: null, createdAt: new Date(),
    });
    (mockPrisma.user.delete as jest.Mock).mockResolvedValue({});
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(
      svc.hardDeleteUser({ actorId: ACTOR_ID, targetUserId: TARGET_ID })
    ).resolves.not.toThrow();
  });

  it('rejects self-delete', async () => {
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(
      svc.hardDeleteUser({ actorId: ACTOR_ID, targetUserId: ACTOR_ID })
    ).rejects.toThrow(/own account/);
  });
});
```

- [ ] **Step 2: Implement**

```ts
async hardDeleteUser(params: { actorId: string; targetUserId: string }): Promise<void> {
  assertNotSelf(params.actorId, params.targetUserId);
  const user = await this.prisma.user.findUnique({
    where: { id: params.targetUserId },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      role: true, subscriptionPlan: true, deletedAt: true, createdAt: true,
    },
  });
  if (!user) {
    const err = new Error('User not found');
    (err as any).statusCode = 404;
    throw err;
  }
  await this.prisma.user.delete({ where: { id: params.targetUserId } });
  await this.auditLog.create({
    userId: params.actorId,
    action: 'admin.user.hardDelete',
    entity: 'User',
    entityId: params.targetUserId,
    changes: { before: user, after: null },
  });
  logger.warn('Admin: user hard-deleted', { actorId: params.actorId, targetUserId: params.targetUserId });
}
```

- [ ] **Step 3: Run tests, expect pass**

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(admin): hard delete user with snapshot audit"
```

---

### Task 5: AdminService.updateSubscriptionPlan

- [ ] **Step 1: Failing test**

```ts
describe('AdminService.updateSubscriptionPlan', () => {
  it('updates only subscriptionPlan and audits', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID, deletedAt: null, subscriptionPlan: 'free',
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({
      id: TARGET_ID, subscriptionPlan: 'pro',
    });

    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    const result = await svc.updateSubscriptionPlan({
      actorId: ACTOR_ID, targetUserId: TARGET_ID, plan: 'pro',
    });

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: TARGET_ID },
      data: { subscriptionPlan: 'pro' },
      select: { id: true, subscriptionPlan: true },
    });
    expect(result).toEqual({ id: TARGET_ID, subscriptionPlan: 'pro' });
    expect(mockAuditLogService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'admin.user.updateSubscription',
        changes: { before: { subscriptionPlan: 'free' }, after: { subscriptionPlan: 'pro' } },
      })
    );
  });

  it('rejects soft-deleted user', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID, deletedAt: new Date(), subscriptionPlan: 'free',
    });
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(
      svc.updateSubscriptionPlan({ actorId: ACTOR_ID, targetUserId: TARGET_ID, plan: 'pro' })
    ).rejects.toThrow(/soft-deleted/);
  });
});
```

- [ ] **Step 2: Implement**

```ts
async updateSubscriptionPlan(params: {
  actorId: string;
  targetUserId: string;
  plan: 'free' | 'pro';
}): Promise<{ id: string; subscriptionPlan: 'free' | 'pro' }> {
  const user = await this.prisma.user.findUnique({
    where: { id: params.targetUserId },
    select: { id: true, deletedAt: true, subscriptionPlan: true },
  });
  if (!user) {
    const err = new Error('User not found');
    (err as any).statusCode = 404;
    throw err;
  }
  assertNotSoftDeleted(user);

  const updated = await this.prisma.user.update({
    where: { id: params.targetUserId },
    data: { subscriptionPlan: params.plan },
    select: { id: true, subscriptionPlan: true },
  });

  await this.auditLog.create({
    userId: params.actorId,
    action: 'admin.user.updateSubscription',
    entity: 'User',
    entityId: params.targetUserId,
    changes: { before: { subscriptionPlan: user.subscriptionPlan }, after: { subscriptionPlan: params.plan } },
  });

  return updated as any;
}
```

- [ ] **Step 3: Run tests, expect pass**

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(admin): updateSubscriptionPlan with audit"
```

---

### Task 6: AdminService.updateUserLimits

- [ ] **Step 1: Failing tests** (happy path + soft-delete reject; validation is done by Zod at controller layer, so service trusts the input)

```ts
describe('AdminService.updateUserLimits', () => {
  it('updates only provided fields and audits', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID, deletedAt: null, aiMessagesLimit: 500, wfirmaRequestsLimit: 30,
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({
      id: TARGET_ID, aiMessagesLimit: 1000, wfirmaRequestsLimit: 30,
    });
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);

    const result = await svc.updateUserLimits({
      actorId: ACTOR_ID, targetUserId: TARGET_ID, aiMessagesLimit: 1000,
    });

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: TARGET_ID },
      data: { aiMessagesLimit: 1000 },
      select: { id: true, aiMessagesLimit: true, wfirmaRequestsLimit: true },
    });
    expect(result.aiMessagesLimit).toBe(1000);
  });
});
```

- [ ] **Step 2: Implement**

```ts
async updateUserLimits(params: {
  actorId: string;
  targetUserId: string;
  aiMessagesLimit?: number;
  wfirmaRequestsLimit?: number;
}): Promise<{ id: string; aiMessagesLimit: number; wfirmaRequestsLimit: number }> {
  const user = await this.prisma.user.findUnique({
    where: { id: params.targetUserId },
    select: { id: true, deletedAt: true, aiMessagesLimit: true, wfirmaRequestsLimit: true },
  });
  if (!user) {
    const err = new Error('User not found');
    (err as any).statusCode = 404;
    throw err;
  }
  assertNotSoftDeleted(user);

  const data: { aiMessagesLimit?: number; wfirmaRequestsLimit?: number } = {};
  if (params.aiMessagesLimit !== undefined) data.aiMessagesLimit = params.aiMessagesLimit;
  if (params.wfirmaRequestsLimit !== undefined) data.wfirmaRequestsLimit = params.wfirmaRequestsLimit;

  const updated = await this.prisma.user.update({
    where: { id: params.targetUserId },
    data,
    select: { id: true, aiMessagesLimit: true, wfirmaRequestsLimit: true },
  });

  await this.auditLog.create({
    userId: params.actorId,
    action: 'admin.user.updateLimits',
    entity: 'User',
    entityId: params.targetUserId,
    changes: {
      before: { aiMessagesLimit: user.aiMessagesLimit, wfirmaRequestsLimit: user.wfirmaRequestsLimit },
      after: { aiMessagesLimit: updated.aiMessagesLimit, wfirmaRequestsLimit: updated.wfirmaRequestsLimit },
    },
  });

  return updated;
}
```

- [ ] **Step 3: Run, pass, commit**

```bash
git commit -am "feat(admin): updateUserLimits with audit"
```

---

### Task 7: AdminService.resetUsageCounter

- [ ] **Step 1: Failing tests for each `type` value**

```ts
describe('AdminService.resetUsageCounter', () => {
  beforeEach(() => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID, deletedAt: null, aiMessagesUsed: 42, wfirmaRequestsUsed: 7,
    });
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({
      id: TARGET_ID, aiMessagesUsed: 0, wfirmaRequestsUsed: 7,
    });
  });

  it('resets ai only', async () => {
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await svc.resetUsageCounter({ actorId: ACTOR_ID, targetUserId: TARGET_ID, type: 'ai' });
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { aiMessagesUsed: 0 } })
    );
  });

  it('resets wfirma only', async () => {
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({
      id: TARGET_ID, aiMessagesUsed: 42, wfirmaRequestsUsed: 0,
    });
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await svc.resetUsageCounter({ actorId: ACTOR_ID, targetUserId: TARGET_ID, type: 'wfirma' });
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { wfirmaRequestsUsed: 0 } })
    );
  });

  it('resets both', async () => {
    (mockPrisma.user.update as jest.Mock).mockResolvedValue({
      id: TARGET_ID, aiMessagesUsed: 0, wfirmaRequestsUsed: 0,
    });
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await svc.resetUsageCounter({ actorId: ACTOR_ID, targetUserId: TARGET_ID, type: 'both' });
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { aiMessagesUsed: 0, wfirmaRequestsUsed: 0 } })
    );
  });
});
```

- [ ] **Step 2: Implement**

```ts
async resetUsageCounter(params: {
  actorId: string;
  targetUserId: string;
  type: 'ai' | 'wfirma' | 'both';
}): Promise<{ id: string; aiMessagesUsed: number; wfirmaRequestsUsed: number }> {
  const user = await this.prisma.user.findUnique({
    where: { id: params.targetUserId },
    select: { id: true, deletedAt: true, aiMessagesUsed: true, wfirmaRequestsUsed: true },
  });
  if (!user) {
    const err = new Error('User not found');
    (err as any).statusCode = 404;
    throw err;
  }
  assertNotSoftDeleted(user);

  const data: { aiMessagesUsed?: number; wfirmaRequestsUsed?: number } = {};
  if (params.type === 'ai' || params.type === 'both') data.aiMessagesUsed = 0;
  if (params.type === 'wfirma' || params.type === 'both') data.wfirmaRequestsUsed = 0;

  const updated = await this.prisma.user.update({
    where: { id: params.targetUserId },
    data,
    select: { id: true, aiMessagesUsed: true, wfirmaRequestsUsed: true },
  });

  await this.auditLog.create({
    userId: params.actorId,
    action: 'admin.user.resetUsage',
    entity: 'User',
    entityId: params.targetUserId,
    changes: {
      before: { aiMessagesUsed: user.aiMessagesUsed, wfirmaRequestsUsed: user.wfirmaRequestsUsed },
      after: { aiMessagesUsed: updated.aiMessagesUsed, wfirmaRequestsUsed: updated.wfirmaRequestsUsed },
      type: params.type,
    },
  });

  return updated;
}
```

- [ ] **Step 3: Run, pass, commit**

```bash
git commit -am "feat(admin): resetUsageCounter with audit"
```

---

### Task 8: Drop conversations from getUserDetail

- [ ] **Step 1: Add test asserting `result.conversations` is undefined**

```ts
describe('AdminService.getUserDetail (privacy)', () => {
  it('does not include conversations array or costData', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID, email: 't@x', firstName: null, lastName: null,
      role: 'user', locale: 'en', createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      subscriptionPlan: 'free', subscriptionStatus: 'active', subscriptionEndDate: null,
      aiMessagesLimit: 500, aiMessagesUsed: 0,
      wfirmaRequestsLimit: 30, wfirmaRequestsUsed: 0,
      ttsCharactersUsed: 0, ttsCostUsd: 0,
    });
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    const result = await svc.getUserDetail(TARGET_ID);
    expect(result?.conversations).toBeUndefined();
    expect(result?.costData).toBeUndefined();
    expect(result?.user.subscriptionPlan).toBe('free');
  });
});
```

- [ ] **Step 2: First grep for any frontend caller of `getUserDetail` that reads `costData` or `conversations`**

```bash
grep -rn "fetchUserDetail\|userDetail.*costData\|userDetail.*conversations" packages/web/src
```

If any caller reads those fields, update it in this same task. The current `AdminDashboard` likely reads only `user` — verify.

- [ ] **Step 3: Edit `getUserDetail`** — remove the `conversations` include and the `conversations` field from return value. Also stop calling langsmith there (stats live on `/stats` now); keep the basic profile only.

```ts
async getUserDetail(userId: string): Promise<any> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      role: true, locale: true, createdAt: true, updatedAt: true, deletedAt: true,
      subscriptionPlan: true, subscriptionStatus: true, subscriptionEndDate: true,
      aiMessagesLimit: true, aiMessagesUsed: true,
      wfirmaRequestsLimit: true, wfirmaRequestsUsed: true,
      ttsCharactersUsed: true, ttsCostUsd: true,
    },
  });
  if (!user) return null;
  return { user };
}
```

- [ ] **Step 4: Run all admin service tests; fix any existing test that asserted on `conversations` or `costData`**

- [ ] **Step 5: Commit**

```bash
git commit -am "refactor(admin): drop conversation titles from getUserDetail (privacy)"
```

---

### Task 9: AdminService.getUserDeepStats

This is the largest service method. Implement step-by-step.

**Files:** `admin.service.ts`, `admin.service.test.ts`

- [ ] **Step 1: Skeleton failing test**

```ts
describe('AdminService.getUserDeepStats', () => {
  beforeEach(() => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: TARGET_ID, ttsCharactersUsed: 1234, ttsCostUsd: 0.12,
    });
    (mockPrisma.aIConversation.count as jest.Mock).mockResolvedValue(5);
    (mockPrisma.aIConversation.aggregate as jest.Mock).mockResolvedValue({ _max: { updatedAt: new Date('2026-04-01') } });
    (mockPrisma.aIConversation.groupBy as jest.Mock).mockResolvedValue([]);
    (mockPrisma.aIToolUsage.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.aIToolUsage.groupBy as jest.Mock).mockResolvedValue([]);
    (mockPrisma.aIToolUsage.findFirst as jest.Mock).mockResolvedValue({ createdAt: new Date('2026-04-02') });
    (mockPrisma.aIMemory.count as jest.Mock).mockResolvedValue(0);
    (mockPrisma.aIMemory.groupBy as jest.Mock).mockResolvedValue([]);
    (mockPrisma.telegramLink.findUnique as jest.Mock).mockResolvedValue(null);
  });

  it('returns full stats shape', async () => {
    (langsmithService.getDashboardData as jest.Mock).mockResolvedValue({
      userSummary: {
        totalCost: 12.34, totalTokens: 5000,
        promptTokens: 3000, completionTokens: 2000,
        runCount: 50, conversationCount: 4, avgCostPerConversation: 3.085,
      },
    });
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);

    const stats = await svc.getUserDeepStats(TARGET_ID, 'month');

    expect(stats.range).toBe('month');
    expect(stats.cost).toEqual({
      totalUsd: 12.34, totalTokens: 5000,
      promptTokens: 3000, completionTokens: 2000,
      runCount: 50, langsmithConversationCount: 4,
      avgCostPerLangsmithConversation: 3.085,
    });
    expect(stats.conversations.totalInRange).toBe(5);
    expect(stats.tts).toEqual({ charactersUsed: 1234, costUsd: 0.12 });
    expect(stats.channels.web.active).toBe(true);
    expect(stats.channels.telegram.active).toBe(false);
    expect(stats.lastActivity.lastConversationAt).toBe(new Date('2026-04-01').toISOString());
  });

  it('aggregates tool usage by category', async () => {
    (mockPrisma.aIToolUsage.groupBy as jest.Mock).mockResolvedValue([
      { toolName: 'wfirma_list_invoices', _count: { _all: 10 } },
      { toolName: 'ksef_send_invoice', _count: { _all: 3 } },
      { toolName: 'random_tool', _count: { _all: 2 } },
    ]);
    (mockPrisma.aIToolUsage.count as jest.Mock).mockResolvedValue(15);
    (langsmithService.getDashboardData as jest.Mock).mockResolvedValue({ userSummary: emptySummary() });

    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    const stats = await svc.getUserDeepStats(TARGET_ID, 'week');

    expect(stats.toolUsage.totalCalls).toBe(15);
    expect(stats.toolUsage.topTools[0]).toEqual({ toolName: 'wfirma_list_invoices', count: 10 });
    const cats = Object.fromEntries(stats.toolUsage.byCategory.map((c) => [c.category, c.count]));
    expect(cats).toMatchObject({ wfirma: 10, ksef: 3, other: 2 });
  });

  it('throws 404 if user missing', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(svc.getUserDeepStats(TARGET_ID, 'month')).rejects.toThrow(/not found/);
  });

  it('merges activityByDay from $queryRaw conv + tool day buckets', async () => {
    (mockPrisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([{ day: new Date('2026-04-01T00:00:00Z'), cnt: 2n }])  // convs
      .mockResolvedValueOnce([                                                       // tools
        { day: new Date('2026-04-01T00:00:00Z'), cnt: 5n },
        { day: new Date('2026-04-02T00:00:00Z'), cnt: 1n },
      ]);
    (langsmithService.getDashboardData as jest.Mock).mockResolvedValue({ userSummary: emptySummary() });
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    const stats = await svc.getUserDeepStats(TARGET_ID, 'week');
    expect(stats.activityByDay).toEqual([
      { date: '2026-04-01', toolCalls: 5, conversations: 2 },
      { date: '2026-04-02', toolCalls: 1, conversations: 0 },
    ]);
  });
});

function emptySummary() {
  return {
    totalCost: 0, totalTokens: 0, promptTokens: 0, completionTokens: 0,
    runCount: 0, conversationCount: 0, avgCostPerConversation: 0,
  };
}
```

- [ ] **Step 2: Implement `getUserDeepStats` (uses module-level `langsmithService`, no constructor change)**

```ts
async getUserDeepStats(userId: string, range: StatsRange): Promise<UserDeepStats> {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, ttsCharactersUsed: true, ttsCostUsd: true },
  });
  if (!user) {
    const err = new Error('User not found');
    (err as any).statusCode = 404;
    throw err;
  }

  const since = startOfRange(range);

  const [
    cost,
    convsInRange,
    lastConv,
    lastTool,
    toolsGrouped,
    toolsTotal,
    convsByDay,
    toolsByDay,
    memTotal,
    memByCat,
    telegram,
  ] = await Promise.all([
    langsmithService.getDashboardData({ userId, timeRange: range }),
    this.prisma.aIConversation.count({ where: { userId, createdAt: { gte: since } } }),
    this.prisma.aIConversation.aggregate({ where: { userId }, _max: { updatedAt: true } }),
    this.prisma.aIToolUsage.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    this.prisma.aIToolUsage.groupBy({
      by: ['toolName'],
      where: { userId, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    this.prisma.aIToolUsage.count({ where: { userId, createdAt: { gte: since } } }),
    this.prisma.$queryRaw<Array<{ day: Date; cnt: bigint }>>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS cnt
      FROM ai_conversations WHERE "userId" = ${userId}::uuid AND "createdAt" >= ${since}
      GROUP BY day ORDER BY day ASC`,
    this.prisma.$queryRaw<Array<{ day: Date; cnt: bigint }>>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS cnt
      FROM ai_tool_usage WHERE "userId" = ${userId}::uuid AND "createdAt" >= ${since}
      GROUP BY day ORDER BY day ASC`,
    this.prisma.aIMemory.count({ where: { userId } }),
    this.prisma.aIMemory.groupBy({ by: ['category'], where: { userId }, _count: { _all: true } }),
    this.prisma.telegramLink.findUnique({ where: { userId }, select: { createdAt: true } }),
  ]);

  const summary = (cost as any).userSummary;
  const topTools = [...toolsGrouped]
    .sort((a, b) => (b._count?._all ?? 0) - (a._count?._all ?? 0))
    .slice(0, 10)
    .map((t) => ({ toolName: t.toolName, count: t._count?._all ?? 0 }));

  const byCategoryMap = new Map<string, number>();
  for (const t of toolsGrouped) {
    const cat = categorizeToolName(t.toolName);
    byCategoryMap.set(cat, (byCategoryMap.get(cat) ?? 0) + (t._count?._all ?? 0));
  }

  const dayMap = new Map<string, { toolCalls: number; conversations: number }>();
  for (const r of toolsByDay) {
    const k = r.day.toISOString().slice(0, 10);
    const cur = dayMap.get(k) ?? { toolCalls: 0, conversations: 0 };
    cur.toolCalls = Number(r.cnt);
    dayMap.set(k, cur);
  }
  for (const r of convsByDay) {
    const k = r.day.toISOString().slice(0, 10);
    const cur = dayMap.get(k) ?? { toolCalls: 0, conversations: 0 };
    cur.conversations = Number(r.cnt);
    dayMap.set(k, cur);
  }

  return {
    range,
    cost: {
      totalUsd: summary.totalCost,
      totalTokens: summary.totalTokens,
      promptTokens: summary.promptTokens,
      completionTokens: summary.completionTokens,
      runCount: summary.runCount,
      langsmithConversationCount: summary.conversationCount,
      avgCostPerLangsmithConversation: summary.avgCostPerConversation,
    },
    activityByDay: [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v })),
    conversations: { totalInRange: convsInRange },
    toolUsage: {
      totalCalls: toolsTotal,
      topTools,
      byCategory: [...byCategoryMap.entries()].map(([category, count]) => ({ category: category as any, count })),
    },
    channels: {
      web: { active: true },
      telegram: {
        active: telegram !== null,
        linkedAt: telegram?.createdAt?.toISOString() ?? null,
      },
    },
    tts: { charactersUsed: user.ttsCharactersUsed, costUsd: user.ttsCostUsd },
    memories: {
      total: memTotal,
      byCategory: memByCat.map((m) => ({ category: m.category, count: m._count?._all ?? 0 })),
    },
    lastActivity: {
      lastConversationAt: lastConv._max.updatedAt?.toISOString() ?? null,
      lastToolCallAt: lastTool?.createdAt?.toISOString() ?? null,
    },
  };
}

// helper at top of file
function startOfRange(range: StatsRange): Date {
  const now = new Date();
  const d = new Date(now);
  if (range === 'week') d.setDate(d.getDate() - 7);
  else if (range === 'month') d.setMonth(d.getMonth() - 1);
  else d.setFullYear(d.getFullYear() - 1);
  return d;
}
```

- [ ] **Step 3: Run tests, fix until green**

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/services/admin.service.ts packages/api/src/services/__tests__/admin.service.test.ts
git commit -m "feat(admin): getUserDeepStats with privacy-preserving aggregates"
```

> **Note on activityByDay query semantics:** the raw SQL bucket queries are "rolling N days" — `gte: since` where `since` is `now - 7d` / `now - 1 month` / `now - 1 year`. They include soft-deleted conversations (no `deletedAt` filter) — admin stats intentionally show all activity.

---

## Phase 2: Routes & Controllers

### Task 10: Controller methods + Zod validation

**Files:** `packages/api/src/controllers/admin.controller.ts`

- [ ] **Step 1: Add controller methods (no test yet — covered by integration tests in Task 12)**

```ts
import { subscriptionPlanSchema, limitsSchema, resetUsageSchema, statsRangeSchema } from '../types/admin.types';

// helper
function handleServiceError(res: Response, error: any, fallbackMessage: string, ctx: object): void {
  const status = error?.statusCode ?? 500;
  if (status >= 500) logger.error(fallbackMessage, { error, ...ctx });
  res.status(status).json({
    success: false,
    error: status === 400 ? 'Validation Error' : status === 404 ? 'Not Found' : 'Internal Server Error',
    message: error?.message ?? fallbackMessage,
  });
}

async softDeleteUser(req: Request, res: Response): Promise<void> {
  try {
    await adminService.softDeleteUser({ actorId: req.user!.userId, targetUserId: req.params.id });
    res.status(200).json({ success: true, data: { ok: true, mode: 'soft' } });
  } catch (e) { handleServiceError(res, e, 'Failed to soft-delete user', { id: req.params.id }); }
}

async hardDeleteUser(req: Request, res: Response): Promise<void> {
  try {
    await adminService.hardDeleteUser({ actorId: req.user!.userId, targetUserId: req.params.id });
    res.status(200).json({ success: true, data: { ok: true, mode: 'hard' } });
  } catch (e) { handleServiceError(res, e, 'Failed to hard-delete user', { id: req.params.id }); }
}

async updateSubscription(req: Request, res: Response): Promise<void> {
  try {
    const { plan } = subscriptionPlanSchema.parse(req.body);
    const data = await adminService.updateSubscriptionPlan({
      actorId: req.user!.userId, targetUserId: req.params.id, plan,
    });
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    if (e?.name === 'ZodError') return handleServiceError(res, { statusCode: 400, message: e.errors[0]?.message }, 'Invalid payload', {});
    handleServiceError(res, e, 'Failed to update subscription', { id: req.params.id });
  }
}

async updateLimits(req: Request, res: Response): Promise<void> {
  try {
    const body = limitsSchema.parse(req.body);
    const data = await adminService.updateUserLimits({
      actorId: req.user!.userId, targetUserId: req.params.id, ...body,
    });
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    if (e?.name === 'ZodError') return handleServiceError(res, { statusCode: 400, message: e.errors[0]?.message }, 'Invalid payload', {});
    handleServiceError(res, e, 'Failed to update limits', { id: req.params.id });
  }
}

async resetUsage(req: Request, res: Response): Promise<void> {
  try {
    const { type } = resetUsageSchema.parse(req.body);
    const data = await adminService.resetUsageCounter({
      actorId: req.user!.userId, targetUserId: req.params.id, type,
    });
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    if (e?.name === 'ZodError') return handleServiceError(res, { statusCode: 400, message: e.errors[0]?.message }, 'Invalid payload', {});
    handleServiceError(res, e, 'Failed to reset usage', { id: req.params.id });
  }
}

async getUserStats(req: Request, res: Response): Promise<void> {
  try {
    const { range } = statsRangeSchema.parse({ range: req.query.range });
    const data = await adminService.getUserDeepStats(req.params.id, range);
    res.status(200).json({ success: true, data });
  } catch (e: any) {
    if (e?.name === 'ZodError') return handleServiceError(res, { statusCode: 400, message: 'Invalid range' }, 'Invalid range', {});
    handleServiceError(res, e, 'Failed to fetch user stats', { id: req.params.id });
  }
}
```

- [ ] **Step 2: Type-check, commit**

```bash
git commit -am "feat(admin): controller methods for user mutations and stats"
```

---

### Task 10b: Add self-guard to existing updateUserRole

Spec requires self-action guard on `PATCH /users/:id/role` (currently missing).

**Files:** `admin.service.ts`, `admin.service.test.ts`, `admin.controller.ts`

- [ ] **Step 1: Failing test**

```ts
describe('AdminService.updateUserRole self-guard', () => {
  it('throws when actorId === targetId', async () => {
    const svc = new AdminService(mockPrisma, mockAuditLogService as any);
    await expect(
      svc.updateUserRole(ACTOR_ID, 'user', { actorId: ACTOR_ID })
    ).rejects.toThrow(/own account/);
  });
});
```

- [ ] **Step 2: Update `updateUserRole` signature**

```ts
async updateUserRole(userId: string, role: UserRole, opts: { actorId: string }): Promise<void> {
  assertNotSelf(opts.actorId, userId);
  // ... existing logic ...
}
```

- [ ] **Step 3: Update controller to pass actorId**

In `admin.controller.ts` `updateUserRole`:
```ts
await adminService.updateUserRole(id, role, { actorId: req.user!.userId });
```

- [ ] **Step 4: Run, fix any existing role-change tests, commit**

```bash
git commit -am "feat(admin): self-action guard on updateUserRole"
```

---

### Task 11: Routes wiring + adminMutationLimiter

**Files:** `packages/api/src/routes/admin.routes.ts`

- [ ] **Step 1: Add limiter and routes**

```ts
// Spec: separate limiter for new mutation routes; existing `updateLimiter` (30/15min)
// remains attached to PATCH /users/:id/role.
const adminMutationLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 60 });

router.delete('/users/:id', adminMutationLimiter, adminController.softDeleteUser.bind(adminController));
router.delete('/users/:id/hard', adminMutationLimiter, adminController.hardDeleteUser.bind(adminController));
router.patch('/users/:id/subscription', adminMutationLimiter, adminController.updateSubscription.bind(adminController));
router.patch('/users/:id/limits', adminMutationLimiter, adminController.updateLimits.bind(adminController));
router.post('/users/:id/reset-usage', adminMutationLimiter, adminController.resetUsage.bind(adminController));
router.get('/users/:id/stats', usersLimiter, adminController.getUserStats.bind(adminController));
```

- [ ] **Step 2: Build, commit**

```bash
git commit -am "feat(admin): wire routes for user management endpoints"
```

---

### Task 12: Integration tests for new routes

**Files:** `packages/api/src/services/__tests__/admin.routes.test.ts`

Use existing integration test pattern from `wfirma-integration.integration.test.ts` (supertest + a real test app + a stub auth middleware injecting a fake admin user).

- [ ] **Step 1: Scaffold test app and helpers**

```ts
import express from 'express';
import request from 'supertest';
import adminRoutes from '../../routes/admin.routes';

// Mock services so we test routing/validation/auth glue, not business logic
jest.mock('../admin.instance', () => ({
  adminService: {
    softDeleteUser: jest.fn().mockResolvedValue(undefined),
    hardDeleteUser: jest.fn().mockResolvedValue(undefined),
    updateSubscriptionPlan: jest.fn().mockResolvedValue({ id: 'u', subscriptionPlan: 'pro' }),
    updateUserLimits: jest.fn().mockResolvedValue({ id: 'u', aiMessagesLimit: 1000, wfirmaRequestsLimit: 30 }),
    resetUsageCounter: jest.fn().mockResolvedValue({ id: 'u', aiMessagesUsed: 0, wfirmaRequestsUsed: 0 }),
    getUserDeepStats: jest.fn().mockResolvedValue({
      range: 'month',
      cost: { totalUsd: 0, totalTokens: 0, promptTokens: 0, completionTokens: 0, runCount: 0, langsmithConversationCount: 0, avgCostPerLangsmithConversation: 0 },
      activityByDay: [],
      conversations: { totalInRange: 0 },
      toolUsage: { totalCalls: 0, topTools: [], byCategory: [] },
      channels: { web: { active: true }, telegram: { active: false, linkedAt: null } },
      tts: { charactersUsed: 0, costUsd: 0 },
      memories: { total: 0, byCategory: [] },
      lastActivity: { lastConversationAt: null, lastToolCallAt: null },
    }),
    getUsers: jest.fn(), getDashboardStats: jest.fn(), getUserDetail: jest.fn(), updateUserRole: jest.fn(),
  },
}));

jest.mock('../../middleware/auth.middleware', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    // req.user.userId is the canonical id (NOT req.user.id)
    req.user = { userId: 'admin-1', email: 'admin@example.com', role: 'admin' };
    next();
  },
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

import { adminService } from '../admin.instance';
```

> **Note on import paths:** since the test file lives at `packages/api/src/services/__tests__/admin.routes.test.ts`, relative imports go `../../routes/admin.routes`, `../../middleware/auth.middleware`, and `../admin.instance` (the service one folder up).

- [ ] **Step 2: Tests**

```ts
describe('admin routes — user management', () => {
  beforeEach(() => jest.clearAllMocks());

  it('DELETE /users/:id → 200 calls softDeleteUser', async () => {
    const r = await request(app).delete('/api/admin/users/u-2');
    expect(r.status).toBe(200);
    expect(r.body.data.mode).toBe('soft');
    expect(adminService.softDeleteUser).toHaveBeenCalledWith({ actorId: 'admin-1', targetUserId: 'u-2' });
    // Confirms controller reads req.user.userId (NOT req.user.id)
  });

  it('DELETE /users/:id/hard → 200 calls hardDeleteUser', async () => {
    const r = await request(app).delete('/api/admin/users/u-2/hard');
    expect(r.status).toBe(200);
    expect(r.body.data.mode).toBe('hard');
  });

  it('PATCH /users/:id/subscription → 400 on invalid plan', async () => {
    const r = await request(app).patch('/api/admin/users/u-2/subscription').send({ plan: 'gold' });
    expect(r.status).toBe(400);
  });

  it('PATCH /users/:id/subscription → 200 on valid', async () => {
    const r = await request(app).patch('/api/admin/users/u-2/subscription').send({ plan: 'pro' });
    expect(r.status).toBe(200);
    expect(r.body.data.subscriptionPlan).toBe('pro');
  });

  it('PATCH /users/:id/limits → 400 when no field provided', async () => {
    const r = await request(app).patch('/api/admin/users/u-2/limits').send({});
    expect(r.status).toBe(400);
  });

  it('PATCH /users/:id/limits → 400 on float', async () => {
    const r = await request(app).patch('/api/admin/users/u-2/limits').send({ aiMessagesLimit: 100.5 });
    expect(r.status).toBe(400);
  });

  it('PATCH /users/:id/limits → 400 on out-of-range', async () => {
    const r = await request(app).patch('/api/admin/users/u-2/limits').send({ aiMessagesLimit: 2_000_000 });
    expect(r.status).toBe(400);
  });

  it('PATCH /users/:id/limits → 200 on valid', async () => {
    const r = await request(app).patch('/api/admin/users/u-2/limits').send({ aiMessagesLimit: 1000 });
    expect(r.status).toBe(200);
  });

  it('POST /users/:id/reset-usage → 400 on invalid type', async () => {
    const r = await request(app).post('/api/admin/users/u-2/reset-usage').send({ type: 'all' });
    expect(r.status).toBe(400);
  });

  it('POST /users/:id/reset-usage → 200 on valid type', async () => {
    const r = await request(app).post('/api/admin/users/u-2/reset-usage').send({ type: 'both' });
    expect(r.status).toBe(200);
  });

  it('GET /users/:id/stats → 400 on invalid range', async () => {
    const r = await request(app).get('/api/admin/users/u-2/stats?range=decade');
    expect(r.status).toBe(400);
  });

  it('GET /users/:id/stats → 200 default range=month', async () => {
    const r = await request(app).get('/api/admin/users/u-2/stats');
    expect(r.status).toBe(200);
    expect(adminService.getUserDeepStats).toHaveBeenCalledWith('u-2', 'month');
  });

  it('soft delete propagates 400 for self-action error from service', async () => {
    (adminService.softDeleteUser as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('Cannot perform this action on your own account'), { statusCode: 400 })
    );
    const r = await request(app).delete('/api/admin/users/admin-1');
    expect(r.status).toBe(400);
  });

  it('returns 404 when service throws statusCode=404', async () => {
    (adminService.updateSubscriptionPlan as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('User not found'), { statusCode: 404 })
    );
    const r = await request(app).patch('/api/admin/users/u-2/subscription').send({ plan: 'pro' });
    expect(r.status).toBe(404);
  });
});
```

- [ ] **Step 3: Run, fix until green**

```
npm run test --filter=@accounting-ai-agent/api -- admin.routes
```

- [ ] **Step 4: Commit**

```bash
git commit -am "test(admin): integration tests for user management routes"
```

---

## Phase 3: Frontend

### Task 13: Extend API client (admin.ts already exists)

**Files:** `packages/web/src/lib/api/admin.ts` — **MODIFY**, not create.

The file already exists (162 lines). It uses `import { apiClient } from './api-client'` and exports `fetchAdminDashboard`, `fetchUsers`, `fetchUserDetail`, `updateUserRole`, `fetchAuditLog`, plus a barrel `adminApi`. Add new functions and extend the barrel.

- [ ] **Step 1: Append new types and functions to existing file**

```ts
// At top, after existing imports (apiClient is already imported)
export type StatsRange = 'week' | 'month' | 'year';

export interface UserDeepStats {
  // Mirror packages/api/src/types/admin.types.ts UserDeepStats exactly.
  // No shared types package exists yet — duplication is acceptable per spec.
  range: StatsRange;
  cost: {
    totalUsd: number; totalTokens: number;
    promptTokens: number; completionTokens: number;
    runCount: number; langsmithConversationCount: number;
    avgCostPerLangsmithConversation: number;
  };
  activityByDay: Array<{ date: string; toolCalls: number; conversations: number }>;
  conversations: { totalInRange: number };
  toolUsage: {
    totalCalls: number;
    topTools: Array<{ toolName: string; count: number }>;
    byCategory: Array<{ category: 'wfirma'|'ksef'|'memory'|'hr'|'org'|'other'; count: number }>;
  };
  channels: { web: { active: true }; telegram: { active: boolean; linkedAt: string | null } };
  tts: { charactersUsed: number; costUsd: number };
  memories: { total: number; byCategory: Array<{ category: string; count: number }> };
  lastActivity: { lastConversationAt: string | null; lastToolCallAt: string | null };
}

// Append new functions
export async function fetchUserStats(userId: string, range: StatsRange): Promise<UserDeepStats> {
  const res = await apiClient.get(`/admin/users/${userId}/stats`, { params: { range } });
  return res.data.data;
}

export async function softDeleteUser(userId: string): Promise<void> {
  await apiClient.delete(`/admin/users/${userId}`);
}

export async function hardDeleteUser(userId: string): Promise<void> {
  await apiClient.delete(`/admin/users/${userId}/hard`);
}

export async function updateUserSubscription(userId: string, plan: 'free' | 'pro') {
  const res = await apiClient.patch(`/admin/users/${userId}/subscription`, { plan });
  return res.data.data;
}

export async function updateUserLimits(
  userId: string,
  body: { aiMessagesLimit?: number; wfirmaRequestsLimit?: number }
) {
  const res = await apiClient.patch(`/admin/users/${userId}/limits`, body);
  return res.data.data;
}

export async function resetUserUsage(userId: string, type: 'ai' | 'wfirma' | 'both') {
  const res = await apiClient.post(`/admin/users/${userId}/reset-usage`, { type });
  return res.data.data;
}
```

- [ ] **Step 2: Extend the existing `adminApi` barrel**

```ts
export const adminApi = {
  fetchDashboard: fetchAdminDashboard,
  fetchUsers,
  fetchUserDetail,
  updateUserRole,
  fetchAuditLog,
  // NEW
  fetchUserStats,
  softDeleteUser,
  hardDeleteUser,
  updateUserSubscription,
  updateUserLimits,
  resetUserUsage,
};
```

- [ ] **Step 2: Type-check, commit**

```bash
git commit -am "feat(web): admin user management API client"
```

---

### Task 14: i18n keys

**Files:** `packages/web/src/i18n/messages/{en,pl,ru}/admin.json`

- [ ] **Step 1: Add new keys under `admin.userDetail` in all three locales**

Required keys (en shown; mirror in pl, ru):
```json
{
  "userDetail": {
    "back": "Back to users",
    "deletedBadge": "Deleted",
    "activeBadge": "Active",
    "subscription": {
      "title": "Subscription",
      "plan": "Plan",
      "save": "Save plan",
      "saved": "Plan updated",
      "free": "Free",
      "pro": "Pro",
      "status": "Status",
      "endDate": "Ends at"
    },
    "limits": {
      "title": "Usage limits",
      "aiMessages": "AI messages limit",
      "wfirmaRequests": "wFirma requests limit",
      "save": "Save limits",
      "saved": "Limits updated",
      "resetAi": "Reset AI usage",
      "resetWfirma": "Reset wFirma usage",
      "resetBoth": "Reset both",
      "confirmReset": "Reset usage counter to 0?",
      "used": "Used: {used} / {limit}"
    },
    "stats": {
      "title": "Statistics",
      "range": "Range",
      "week": "Week",
      "month": "Month",
      "year": "Year",
      "cost": "Cost & tokens",
      "totalCost": "Total cost",
      "totalTokens": "Total tokens",
      "promptTokens": "Prompt tokens",
      "completionTokens": "Completion tokens",
      "runs": "Runs",
      "conversations": "Conversations",
      "activity": "Activity",
      "topTools": "Top tools",
      "byCategory": "Tool categories",
      "behavior": "Behavior",
      "channels": "Channels",
      "telegram": "Telegram",
      "telegramLinkedAt": "Linked at",
      "tts": "Text-to-speech",
      "ttsCharacters": "Characters",
      "ttsCost": "Cost",
      "memories": "AI memories",
      "lastConversation": "Last conversation",
      "lastToolCall": "Last tool call",
      "noActivity": "No activity"
    },
    "danger": {
      "title": "Danger zone",
      "softDelete": "Soft delete user",
      "softDeleteHint": "User will be hidden from lists; data is preserved.",
      "softDeleteConfirm": "Soft-delete this user?",
      "hardDelete": "Hard delete user",
      "hardDeleteHint": "Irreversible. Removes the user and all related data.",
      "hardDeleteConfirm": "To confirm, type the user's email exactly:",
      "selfActionDisabled": "You cannot perform this action on your own account"
    }
  }
}
```

- [ ] **Step 2: Add Polish and Russian translations**

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(web): i18n keys for admin user detail page"
```

---

### Task 15: Page route + UserDetailView shell

**Files:**
- Create: `packages/web/src/app/admin/users/[id]/page.tsx`
- Create: `packages/web/src/components/admin/user-detail/UserDetailView.tsx`
- Create: `packages/web/src/components/admin/user-detail/index.ts`

- [ ] **Step 1: Implement page wrapper**

```tsx
// packages/web/src/app/admin/users/[id]/page.tsx
'use client';

import { AdminRoute } from '@/components/auth/ProtectedRoute';
import { UserDetailView } from '@/components/admin/user-detail';
import { useParams } from 'next/navigation';

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <AdminRoute>
      <UserDetailView userId={id} />
    </AdminRoute>
  );
}
```

- [ ] **Step 2: Implement `UserDetailView` shell**

```tsx
// packages/web/src/components/admin/user-detail/UserDetailView.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { adminApi, type StatsRange } from '@/lib/api/admin';
import { UserProfileCard } from './UserProfileCard';
import { SubscriptionPanel } from './SubscriptionPanel';
import { LimitsPanel } from './LimitsPanel';
import { UsageStatsPanel } from './UsageStatsPanel';
import { ActivityChart } from './ActivityChart';
import { ToolUsagePanel } from './ToolUsagePanel';
import { BehaviorPanel } from './BehaviorPanel';
import { DangerZone } from './DangerZone';

export function UserDetailView({ userId }: { userId: string }) {
  const t = useTranslations('admin.userDetail');
  const [range, setRange] = useState<StatsRange>('month');

  const userQ = useQuery({ queryKey: ['admin', 'user', userId], queryFn: () => adminApi.fetchUserDetail(userId) });
  const statsQ = useQuery({
    queryKey: ['admin', 'user', userId, 'stats', range],
    queryFn: () => adminApi.fetchUserStats(userId, range),
    enabled: !!userQ.data,
  });

  if (userQ.isLoading) return <div className="p-6">Loading…</div>;
  if (userQ.isError || !userQ.data) return <div className="p-6 text-red-500">Failed to load user</div>;

  const { user } = userQ.data;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Link href="/admin" className="text-sm text-blue-600 hover:underline">← {t('back')}</Link>

      <UserProfileCard user={user} stats={statsQ.data} />

      <div className="grid gap-6 md:grid-cols-2">
        <SubscriptionPanel user={user} />
        <LimitsPanel user={user} />
      </div>

      <section>
        <header className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{t('stats.title')}</h2>
          <select
            className="border rounded px-2 py-1"
            value={range}
            onChange={(e) => setRange(e.target.value as StatsRange)}
          >
            <option value="week">{t('stats.week')}</option>
            <option value="month">{t('stats.month')}</option>
            <option value="year">{t('stats.year')}</option>
          </select>
        </header>

        {statsQ.data ? (
          <div className="grid gap-6 md:grid-cols-2">
            <UsageStatsPanel stats={statsQ.data} />
            <ActivityChart data={statsQ.data.activityByDay} />
            <ToolUsagePanel toolUsage={statsQ.data.toolUsage} />
            <BehaviorPanel stats={statsQ.data} />
          </div>
        ) : (
          <div>Loading stats…</div>
        )}
      </section>

      <DangerZone user={user} />
    </div>
  );
}
```

- [ ] **Step 3: Create `index.ts` re-exporting all sub-components (initial stubs ok)**

- [ ] **Step 4: Create stub components for each panel that just renders its name (so the app builds). Each stub is a one-liner; we flesh them out in Tasks 16–22.**

- [ ] **Step 5: Verify build**

```
npm run build --filter=@accounting-ai-agent/web
```

- [ ] **Step 6: Commit**

```bash
git commit -am "feat(web): admin user detail page shell + route"
```

---

### Task 16: UserProfileCard

**File:** `packages/web/src/components/admin/user-detail/UserProfileCard.tsx`
**Test:** `packages/web/src/components/admin/user-detail/__tests__/UserProfileCard.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { UserProfileCard } from '../UserProfileCard';
import en from '@/i18n/messages/en/admin.json';

const wrap = (ui: React.ReactNode) =>
  <NextIntlClientProvider locale="en" messages={{ admin: en }}>{ui}</NextIntlClientProvider>;

const baseUser = {
  id: 'u', email: 'a@b.c', firstName: 'Anna', lastName: 'B',
  role: 'user', subscriptionPlan: 'pro', subscriptionStatus: 'active',
  createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-02-01T00:00:00Z',
  deletedAt: null,
};

test('shows email, name, plan badge, active badge', () => {
  render(wrap(<UserProfileCard user={baseUser as any} stats={undefined} />));
  expect(screen.getByText('a@b.c')).toBeInTheDocument();
  expect(screen.getByText(/Anna/)).toBeInTheDocument();
  expect(screen.getByText('Pro')).toBeInTheDocument();
  expect(screen.getByText('Active')).toBeInTheDocument();
});

test('shows deleted badge when deletedAt is set', () => {
  render(wrap(<UserProfileCard user={{ ...baseUser, deletedAt: '2026-01-01T00:00:00Z' } as any} stats={undefined} />));
  expect(screen.getByText('Deleted')).toBeInTheDocument();
});
```

- [ ] **Step 2: Implement component (Tailwind, simple layout, KPIs from stats?.cost when present)**

- [ ] **Step 3: Run vitest, pass, commit**

```bash
git commit -am "feat(web): UserProfileCard with deleted badge"
```

---

### Task 17: SubscriptionPanel

**File + test** in same folder.

- [ ] **Step 1: Failing test** — change select, click save, expect API called with `pro`, expect toast

```tsx
import { vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { SubscriptionPanel } from '../SubscriptionPanel';

vi.mock('@/lib/api/admin', () => ({
  adminApi: { updateUserSubscription: vi.fn().mockResolvedValue({ id: 'u', subscriptionPlan: 'pro' }) },
}));

test('saves new plan', async () => {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <SubscriptionPanel user={{ id: 'u', subscriptionPlan: 'free', subscriptionStatus: 'active', subscriptionEndDate: null } as any} />
    </QueryClientProvider>
  );
  fireEvent.change(screen.getByLabelText(/plan/i), { target: { value: 'pro' } });
  fireEvent.click(screen.getByRole('button', { name: /save/i }));
  await waitFor(() => expect(adminApi.updateUserSubscription).toHaveBeenCalledWith('u', 'pro'));
});
```

- [ ] **Step 2: Implement** with `useMutation` + React Query invalidation of `['admin', 'user', user.id]`. Use existing toast util.

- [ ] **Step 3: Pass, commit**

```bash
git commit -am "feat(web): SubscriptionPanel"
```

---

### Task 18: LimitsPanel

- [ ] **Step 1: Failing tests** — input validation (rejects negative, rejects float), save calls API, three reset buttons each call API with correct type and require inline confirmation

```tsx
test('rejects negative', () => {
  // render, type -5, click save, expect error message visible, API not called
});

test('save calls API with both fields', async () => {
  // render with values, click save → expect updateLimits called
});

test('reset ai requires confirmation then calls API', async () => {
  // click reset ai → confirmation appears → click confirm → resetUsage('ai')
});
```

- [ ] **Step 2: Implement** with two `<input type="number" min=0 max=1_000_000 step=1>`, save button, three reset buttons each toggling an inline `Confirm?` row.

- [ ] **Step 3: Pass, commit**

```bash
git commit -am "feat(web): LimitsPanel with reset confirmations"
```

---

### Task 19: UsageStatsPanel + ActivityChart

- [ ] **Step 1: Implement `UsageStatsPanel`** — pure presentational, renders fields from `stats.cost`. Test: snapshot or assert numbers are displayed.

- [ ] **Step 2: Implement `ActivityChart`** — check whether project already uses recharts (`grep -r "recharts" packages/web/package.json`). If yes, use `BarChart`. If not, use a simple SVG bar generator (no new dependency). Test: assert correct number of bars by data length.

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(web): UsageStatsPanel and ActivityChart"
```

---

### Task 20: ToolUsagePanel

- [ ] **Step 1: Implement** — top 10 horizontal bar list (just CSS widths, no library) and category list with counts.

- [ ] **Step 2: Test** — renders all topTools and category names

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(web): ToolUsagePanel"
```

---

### Task 21: BehaviorPanel

- [ ] **Step 1: Implement** — channels (web/telegram badges, telegram linkedAt), TTS (chars + cost), memories total + per category, last activity timestamps.

- [ ] **Step 2: Test** — renders telegram badge based on `channels.telegram.active`

- [ ] **Step 3: Commit**

```bash
git commit -am "feat(web): BehaviorPanel"
```

---

### Task 22: DangerZone

- [ ] **Step 1: Failing test for hard-delete confirmation flow**

```tsx
test('hard delete requires typing email exactly', async () => {
  vi.mocked(adminApi.hardDeleteUser).mockResolvedValue(undefined);
  render(<DangerZone user={{ id: 'u', email: 'a@b.c', deletedAt: null } as any} currentAdminId="admin-1" />);
  fireEvent.click(screen.getByRole('button', { name: /hard delete/i }));
  fireEvent.change(screen.getByPlaceholderText('a@b.c'), { target: { value: 'wrong' } });
  expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
  fireEvent.change(screen.getByPlaceholderText('a@b.c'), { target: { value: 'a@b.c' } });
  fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
  await waitFor(() => expect(adminApi.hardDeleteUser).toHaveBeenCalledWith('u'));
});

test('buttons disabled when targetUserId === currentAdminId', () => {
  render(<DangerZone user={{ id: 'admin-1', email: 'a@b.c', deletedAt: null } as any} currentAdminId="admin-1" />);
  expect(screen.getByRole('button', { name: /soft delete/i })).toBeDisabled();
  expect(screen.getByRole('button', { name: /hard delete/i })).toBeDisabled();
});
```

- [ ] **Step 2: Implement** — soft delete with single modal confirmation; hard delete with email-typed confirmation. After successful soft delete, navigate `router.push('/admin')`. After successful hard delete, same.

- [ ] **Step 3: Pass, commit**

```bash
git commit -am "feat(web): DangerZone with email-typed hard delete"
```

---

### Task 23: AdminDashboard rows clickable

**File:** `packages/web/src/components/admin/AdminDashboard.tsx`

- [ ] **Step 1: Wrap user row in `<Link href={\`/admin/users/${user.id}\`}>` or `useRouter().push` on row click**

- [ ] **Step 2: Existing role-change controls must keep working — wrap them with `e.stopPropagation()` or use `<Link>` only on a sub-cell**

- [ ] **Step 3: Update existing AdminDashboard story / test if any**

- [ ] **Step 4: Commit**

```bash
git commit -am "feat(web): make admin user rows navigate to detail page"
```

---

## Phase 4: E2E

### Task 24: Playwright E2E

**File:** `packages/web/e2e/admin-user-management.spec.ts`

> **Engineer note:** look at existing E2E tests in `packages/web/e2e/` for the admin login helper / fixture pattern. Reuse it.

- [ ] **Step 1: Tests**

```ts
import { test, expect } from '@playwright/test';
// import or create an admin login helper

test('admin can change user plan', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin');
  await page.getByText('test-user@example.com').click();
  await expect(page).toHaveURL(/\/admin\/users\//);
  await page.getByLabel(/plan/i).selectOption('pro');
  await page.getByRole('button', { name: /save plan/i }).click();
  await expect(page.getByText(/plan updated/i)).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(/plan/i)).toHaveValue('pro');
});

test('admin can soft-delete a user', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/users/<seeded-uuid>');
  await page.getByRole('button', { name: /soft delete/i }).click();
  await page.getByRole('button', { name: /confirm/i }).click();
  await expect(page).toHaveURL('/admin');
  await expect(page.getByText('test-user@example.com')).not.toBeVisible();

  // Direct navigation still works and shows "Deleted" badge
  await page.goto('/admin/users/<seeded-uuid>');
  await expect(page.getByText('Deleted')).toBeVisible();
});

test('admin cannot delete themselves', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/users/<admin-uuid>');
  await expect(page.getByRole('button', { name: /soft delete/i })).toBeDisabled();
  await expect(page.getByRole('button', { name: /hard delete/i })).toBeDisabled();
});
```

- [ ] **Step 2: Run E2E**

```
cd packages/web && npm run test:e2e -- admin-user-management
```

- [ ] **Step 3: Commit**

```bash
git commit -am "test(e2e): admin user management flows"
```

---

## Final Verification Checklist

- [ ] `npm run lint` — clean
- [ ] `npm run build` — both packages build
- [ ] `npm run test --filter=@accounting-ai-agent/api` — all green
- [ ] `npm run test --filter=@accounting-ai-agent/web` — all green
- [ ] `cd packages/web && npm run test:e2e` — all admin specs green
- [ ] Manual smoke test on running app:
  - [ ] Click user → detail page loads
  - [ ] Change plan → persists after refresh
  - [ ] Edit limits → persists, used/limit hint updates
  - [ ] Reset usage → counter goes to 0
  - [ ] Soft delete → user disappears from list, direct URL shows badge
  - [ ] Hard delete → 404 on subsequent navigation
  - [ ] Self-action buttons disabled on own user page
  - [ ] Stats panel shows numbers and chart
  - [ ] Audit log entries created (visit `/admin/audit-log` and filter `entity=User`)
- [ ] All commits referenced GitHub issue #88 in PR body when merging

---

## Notes for the engineer

- **Pattern reference for routes/controllers:** look at how `wfirma.routes.ts` and its controller handle Zod errors and status codes; mirror that style.
- **Pattern reference for service tests:** `packages/api/src/services/__tests__/auth.service.test.ts` shows the project's preferred Jest mocking style for Prisma.
- **Pattern reference for frontend panels:** look at how existing components in `packages/web/src/components/admin/AdminDashboard.tsx` use `useQuery`, mutations, and toasts.
- **i18n:** the existing keys live under `admin.*` in the en/pl/ru JSON files. Add a `userDetail` sub-namespace and use `useTranslations('admin.userDetail')`.
- **Prisma model casing:** prisma client uses `aIConversation`, `aIToolUsage`, `aIMemory` (lowercase first letter, then PascalCase). Verify by `grep -n "prisma\.aI" packages/api/src/services` if unsure.
- **Authority for auth user shape:** `req.user.userId` is canonical (verified in `auth.middleware.ts`). Do NOT use `req.user.id`.
- **No schema migration in this plan.** Do not run `prisma migrate`.
- **DRY:** the four mutation routes share an identical try/catch shape. If you find yourself writing the same five lines repeatedly, extract a small `runMutation(req, res, fn)` helper in the controller.
- **Frequent commits:** every task ends with a commit; do not batch multiple tasks into one commit.
