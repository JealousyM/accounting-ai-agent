# HR Module

## What this is
Employee management, contract lifecycle, payroll calculations, and absence tracking — all within the platform so the AI agent can answer HR queries and generate payslip data without leaving the chat.

## Entry points
- `packages/api/src/services/hr/hr.service.ts` — `HRService`: employees, contracts, payroll, absences (all filtered by `userId`)
- `packages/api/src/services/hr/payroll-calculator.ts` — pure functions for Polish payroll math (employment, mandate, work contract, board resolution, dividend)
- `packages/api/src/services/hr/tax-config.ts` — `getDefaultTaxConfig()` returns current Polish tax rates / thresholds
- `packages/api/src/routes/hr.routes.ts` — `/api/hr/*` REST endpoints
- `packages/api/src/services/ai-chat/tools/hr.tools.ts` — AI tools that delegate to `HRService`
- `packages/api/src/services/ai-chat/formatters/hr.formatter.ts` — markdown formatter for HR data

## Key concepts
- **Contract types** — `employment`, `mandate_contract` (umowa zlecenie), `work_contract` (umowa o dzieło), `board_resolution` (uchwała zarządu), `dividend`; each has its own payroll calculation function.
- **Payroll isolation** — `HRService` always filters by `userId`; no cross-user data access.
- **Pure payroll functions** — `payroll-calculator.ts` is stateless; receives gross/net amount + `TaxConfig` and returns a `PayrollCalculation` breakdown.
- **Polish tax config** — `tax-config.ts` encodes 2025 PIT, ZUS, and health insurance rates; update this file when rates change.
- **Absence tracking** — `AbsenceType` enum covers vacation, sick leave, maternity, unpaid, other.

## Cross-references
- Talks to: `database` — `Employee`, `Contract`, `Payroll`, `Absence` Prisma models
- Used by: `ai-chat` tools (`hr.tools.ts`) for AI-assisted HR queries
- Used by: `api-backend` route `/api/hr/*`

## Where to look first
`packages/api/src/services/hr/payroll-calculator.ts` for payroll logic; `packages/api/src/services/hr/hr.service.ts` for CRUD operations on HR entities.
