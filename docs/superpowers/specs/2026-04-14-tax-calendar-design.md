# Tax Calendar Service Design (AIA-82)

## Problem

wFirma API `/terms/find` returns only user-created terms. System-generated tax payment deadlines (VAT-7, CIT, ZUS, PIT-4R, etc.) are not available via API — confirmed by testing all plausible endpoints (`payment_commitments`, `obligations`, `tax_calendar`, etc. — all return `CONTROLLER NOT FOUND`).

Users expect to see Polish statutory tax deadlines when asking about upcoming deadlines.

## Solution

Standalone `TaxCalendarService` that generates Polish tax payment deadlines based on static rules. New AI tool `get_tax_deadlines`. Dashboard integration to merge tax deadlines with user terms.

## Tax Deadlines

For Sp. z o.o. (VAT payer, full accounting / `ledger_register`):

### Monthly

| Day | Obligation | Category | Obligatory |
|-----|-----------|----------|------------|
| 7th | PIT-4R — payroll tax advance | pit | yes |
| 7th | PCC — tax on civil law transactions | pcc | no |
| 7th | Dividend tax (PIT-8AR / CIT withholding) | dividend | no |
| 15th | ZUS — social insurance (legal entities) | zus | yes |
| 20th | CIT advance — corporate income tax | cit | yes |
| 25th | VAT-7 / JPK_VAT — declaration + payment | vat | yes |
| 25th | VAT-UE — EU VAT summary | vat | no |

### Annual

| Date | Obligation | Category |
|------|-----------|----------|
| Feb 28 | PIT-11 — annual employee tax info | pit |
| Mar 31 | CIT-8 — annual corporate tax return | cit |

Weekend/holiday rule: if deadline falls on Saturday/Sunday/Polish public holiday, shift to next business day.

## Architecture

### New Files

```
packages/api/src/types/tax-calendar.types.ts
packages/api/src/services/tax-calendar.service.ts
packages/api/src/services/ai-chat/tools/tax-calendar.tools.ts
packages/api/src/services/ai-chat/formatters/tax-calendar.formatter.ts
```

### Modified Files

```
packages/api/src/i18n/locales/pl.json — tax calendar translations
packages/api/src/i18n/locales/en.json — tax calendar translations
packages/api/src/i18n/locales/ru.json — tax calendar translations
packages/api/src/i18n/index.ts — export getTaxCalendarTranslations
packages/api/src/services/ai-chat/tools/index.ts — register get_tax_deadlines tool
packages/api/src/services/ai-chat/formatters/index.ts — export tax calendar formatter
packages/api/src/services/dashboard/dashboard.service.ts — merge tax deadlines into deadlines section
```

### Types (`tax-calendar.types.ts`)

```typescript
export type TaxCategory = 'vat' | 'cit' | 'pit' | 'zus' | 'pcc' | 'dividend';
export type TaxFrequency = 'monthly' | 'annual';

export interface TaxDeadline {
  id: string;              // e.g. "vat-7-2026-04"
  name: string;            // e.g. "VAT-7"
  description: string;     // localized description
  date: Date;              // actual date (shifted for weekends/holidays)
  originalDay: number;     // statutory day before shift
  category: TaxCategory;
  frequency: TaxFrequency;
  obligatory: boolean;     // true for VAT/CIT/ZUS/PIT-4R, false for PCC/dividends
}

export interface TaxDeadlineFilters {
  year: number;
  month?: number;          // omit for full year
  category?: TaxCategory;
}
```

### TaxCalendarService (`tax-calendar.service.ts`)

Pure service, no external dependencies (no DB, no API calls).

```typescript
class TaxCalendarService {
  getDeadlines(filters: TaxDeadlineFilters, locale: Locale): TaxDeadline[]
  getUpcomingDeadlines(days: number, locale: Locale): TaxDeadline[]
}
```

Internal structure:
- Static array of deadline rules: `{ day, name, category, frequency, obligatory, monthRestriction? }`
- `isPolishHoliday(date)` — checks against fixed + moveable holidays (Easter-based)
- `shiftToBusinessDay(date)` — if weekend/holiday, move to next Monday/business day
- Polish public holidays list (fixed dates + Easter Monday, Corpus Christi)

### AI Tool (`tax-calendar.tools.ts`)

Tool name: `get_tax_deadlines`

Description: "Get Polish tax payment deadlines (VAT-7, CIT, PIT-4R, ZUS, VAT-UE, PCC, dividends) for a given period. Use when user asks about tax deadlines, payment dates, tax calendar, or upcoming tax obligations."

Schema:
```typescript
z.object({
  year: z.number().int().min(2020).max(2030).describe('Year'),
  month: z.number().int().min(1).max(12).nullable().optional().describe('Month (1-12), omit for full year'),
  category: z.enum(['vat', 'cit', 'pit', 'zus', 'pcc', 'dividend']).nullable().optional().describe('Filter by tax category'),
})
```

### Formatter (`tax-calendar.formatter.ts`)

`formatTaxDeadlinesList(deadlines, locale)` — markdown table:

```markdown
## Tax Calendar — April 2026 (7)

| # | Date | Name | Description | Category | Status |
|---|------|------|-------------|----------|--------|
| 1 | 2026-04-07 | PIT-4R | Payroll tax advance | PIT | Upcoming |
| 2 | 2026-04-07 | PCC | Civil law transactions tax | PCC | Upcoming |
...

> Dates shifted to next business day when falling on weekends/holidays.
> Deadlines marked as "optional" (PCC, dividends, VAT-UE) apply only when relevant transactions occurred.
```

Status column: "Overdue" / "Today" / "Upcoming" based on current date.

### Dashboard Integration

In `dashboard.service.ts` `getDeadlinesSection()`:
1. Fetch user terms (existing)
2. Fetch tax deadlines via `TaxCalendarService.getUpcomingDeadlines(30)`
3. Merge both lists, sort by date
4. Add `source: 'user' | 'tax'` to `DashboardDeadline` type

## Data Flow

```
User: "какие сроки в апреле?"
  → AI calls get_tax_deadlines(year=2026, month=4)
    → TaxCalendarService.getDeadlines({year: 2026, month: 4}, locale)
      → iterates deadline rules
      → for each: creates date, shifts for weekends/holidays
      → filters by category if specified
    → formatTaxDeadlinesList(deadlines, locale)
  → returns markdown table to user
```

## Testing

Unit tests for `TaxCalendarService`:
- Correct deadlines generated for a given month
- Weekend shift (e.g., if 25th is Saturday → 27th Monday)
- Holiday shift (e.g., May 1 is a holiday)
- Annual deadlines only in correct months
- Category filtering
- Full year generation
