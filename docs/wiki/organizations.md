# Organizations

## What this is
Groups users from the same company into an organization so they can share AI conversation history in real time. Supports org-level roles (admin/member), a membership approval workflow, and cross-member conversation visibility.

## Entry points
- `packages/api/src/services/organization.service.ts` — `OrganizationService`: create/join org, manage members, roles
- `packages/api/src/routes/organization.routes.ts` — `/api/organizations/*` endpoints
- `packages/api/src/controllers/organization.controller.ts` — HTTP handlers
- `packages/web/src/app/` (settings pages) — frontend entry points for org management

## Key concepts
- **Auto-join on profile completion** — when a user sets their company name (on first OAuth login), `OrganizationService.findOrCreateByName()` either creates the org (user becomes admin) or puts them in `pending` status for an existing org.
- **Normalized name matching** — org lookup uses `nameNorm` (lowercased, trimmed), so "ABC Sp. z o.o." and "abc sp. z o.o." resolve to the same org.
- **Roles** — `OrgRole.admin` can approve/reject members; `OrgRole.member` can only view.
- **Shared conversations** — org members see each other's conversations; frontend polls every 5 s for new messages and every 10 s for conversation list updates.
- **Membership status** — `active | pending | rejected`; pending users cannot access shared conversations until approved by an admin.

## Cross-references
- Talks to: `database` — `Organization`, `User` (orgId, orgRole, orgMembershipStatus fields)
- Used by: `auth` — called during complete-profile flow
- Used by: `ai-chat` — conversations are shared at org level if user has `orgId`
- Used by: `web-frontend` — organization settings UI

## Where to look first
`packages/api/src/services/organization.service.ts` method `findOrCreateByName()` for the join/create logic; `packages/api/src/routes/organization.routes.ts` for all available API actions.
