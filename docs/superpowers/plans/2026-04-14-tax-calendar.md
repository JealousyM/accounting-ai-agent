# Tax Calendar Service Implementation Plan (AIA-82)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Polish tax payment deadlines (VAT, CIT, PIT, ZUS, PCC, dividends, VAT-UE) as a standalone service with AI tool integration.

**Architecture:** Standalone `TaxCalendarService` generates deadlines from static rules with weekend/holiday shifting. New AI tool `get_tax_deadlines` registered unconditionally (no wFirma dependency). Dashboard merges tax deadlines with user terms.

**Tech Stack:** TypeScript, LangChain tools, Zod, Jest, i18n (pl/en/ru)

**Spec:** `docs/superpowers/specs/2026-04-14-tax-calendar-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `packages/api/src/types/tax-calendar.types.ts` | Type definitions |
| Create | `packages/api/src/services/tax-calendar.service.ts` | Deadline generation, holiday logic |
| Create | `packages/api/src/services/tax-calendar.instance.ts` | Singleton export |
| Create | `packages/api/src/services/ai-chat/tools/tax-calendar.tools.ts` | AI tool `get_tax_deadlines` |
| Create | `packages/api/src/services/ai-chat/formatters/tax-calendar.formatter.ts` | Markdown formatting |
| Create | `packages/api/src/services/__tests__/tax-calendar.service.test.ts` | Unit tests |
| Modify | `packages/api/src/i18n/locales/pl.json` | Polish translations |
| Modify | `packages/api/src/i18n/locales/en.json` | English translations |
| Modify | `packages/api/src/i18n/locales/ru.json` | Russian translations |
| Modify | `packages/api/src/i18n/index.ts` | TaxCalendarTranslations interface + getter |
| Modify | `packages/api/src/services/ai-chat/tools/index.ts` | Register tool in `createAllTools` |
| Modify | `packages/api/src/services/ai-chat/formatters/index.ts` | Re-export formatter |
| Modify | `packages/api/src/types/dashboard.types.ts` | Add `source?` field |
| Modify | `packages/api/src/services/dashboard/dashboard.service.ts` | Merge tax deadlines |

---

### Task 1: Types

**Files:**
- Create: `packages/api/src/types/tax-calendar.types.ts`

- [ ] **Step 1: Create type definitions**

```typescript
/**
 * Tax Calendar Types
 * Polish statutory tax payment deadlines
 */

export type TaxCategory = 'vat' | 'cit' | 'pit' | 'zus' | 'pcc' | 'dividend';
export type TaxFrequency = 'monthly' | 'annual';

export interface TaxDeadlineRule {
  name: string;
  day: number;
  category: TaxCategory;
  frequency: TaxFrequency;
  obligatory: boolean;
  /** For annual deadlines: which month (1-12) */
  month?: number;
  descriptionKey: string;
}

export interface TaxDeadline {
  id: string;
  name: string;
  description: string;
  date: Date;
  originalDay: number;
  category: TaxCategory;
  frequency: TaxFrequency;
  obligatory: boolean;
}

export interface TaxDeadlineFilters {
  year: number;
  month?: number;
  category?: TaxCategory;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/src/types/tax-calendar.types.ts
git commit -m "feat(types): add tax calendar types (AIA-82)"
```

---

### Task 2: TaxCalendarService — core logic

**Files:**
- Create: `packages/api/src/services/tax-calendar.service.ts`
- Create: `packages/api/src/services/tax-calendar.instance.ts`

- [ ] **Step 1: Create the service**

```typescript
/**
 * Tax Calendar Service
 * Generates Polish statutory tax payment deadlines
 */

import {
  TaxDeadline,
  TaxDeadlineFilters,
  TaxDeadlineRule,
  TaxCategory,
} from '../types/tax-calendar.types';
import { getTaxCalendarTranslations, Locale } from '../i18n';

// ============================================
// POLISH TAX DEADLINE RULES
// ============================================

const TAX_DEADLINE_RULES: TaxDeadlineRule[] = [
  // Monthly — 7th
  { name: 'PIT-4R', day: 7, category: 'pit', frequency: 'monthly', obligatory: true, descriptionKey: 'pit4r' },
  { name: 'PCC-3', day: 7, category: 'pcc', frequency: 'monthly', obligatory: false, descriptionKey: 'pcc' },
  { name: 'PIT-8AR', day: 7, category: 'dividend', frequency: 'monthly', obligatory: false, descriptionKey: 'dividend' },
  // Monthly — 15th
  { name: 'ZUS', day: 15, category: 'zus', frequency: 'monthly', obligatory: true, descriptionKey: 'zus' },
  // Monthly — 20th
  { name: 'CIT', day: 20, category: 'cit', frequency: 'monthly', obligatory: true, descriptionKey: 'cit' },
  // Monthly — 25th
  { name: 'VAT-7', day: 25, category: 'vat', frequency: 'monthly', obligatory: true, descriptionKey: 'vat7' },
  { name: 'VAT-UE', day: 25, category: 'vat', frequency: 'monthly', obligatory: false, descriptionKey: 'vatue' },
  // Annual
  { name: 'PIT-11', day: 28, category: 'pit', frequency: 'annual', obligatory: true, month: 2, descriptionKey: 'pit11' },
  { name: 'CIT-8', day: 31, category: 'cit', frequency: 'annual', obligatory: true, month: 3, descriptionKey: 'cit8' },
];

// ============================================
// POLISH PUBLIC HOLIDAYS
// ============================================

/** Fixed Polish public holidays (month, day) */
const FIXED_HOLIDAYS: [number, number][] = [
  [1, 1],   // New Year
  [1, 6],   // Epiphany
  [5, 1],   // Labour Day
  [5, 3],   // Constitution Day
  [8, 15],  // Assumption
  [11, 1],  // All Saints
  [11, 11], // Independence Day
  [12, 25], // Christmas
  [12, 26], // St. Stephen's Day
];

/**
 * Calculate Easter Sunday using Anonymous Gregorian algorithm (Computus)
 */
function calculateEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/**
 * Get all Polish public holidays for a given year
 */
function getPolishHolidays(year: number): Set<string> {
  const holidays = new Set<string>();

  // Fixed holidays
  for (const [month, day] of FIXED_HOLIDAYS) {
    holidays.add(formatDateKey(new Date(year, month - 1, day)));
  }

  // Moveable holidays (Easter-based)
  const easter = calculateEasterSunday(year);
  const easterMs = easter.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  // Easter Sunday
  holidays.add(formatDateKey(easter));
  // Easter Monday (+1)
  holidays.add(formatDateKey(new Date(easterMs + 1 * dayMs)));
  // Whit Sunday / Pentecost (+49)
  holidays.add(formatDateKey(new Date(easterMs + 49 * dayMs)));
  // Corpus Christi (+60)
  holidays.add(formatDateKey(new Date(easterMs + 60 * dayMs)));

  return holidays;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Shift date to next business day if it falls on weekend or Polish holiday
 */
function shiftToBusinessDay(date: Date, holidays: Set<string>): Date {
  const result = new Date(date);
  while (true) {
    const dow = result.getDay();
    if (dow === 0 || dow === 6 || holidays.has(formatDateKey(result))) {
      result.setDate(result.getDate() + 1);
    } else {
      break;
    }
  }
  return result;
}

// ============================================
// SERVICE
// ============================================

export class TaxCalendarService {
  private buildDescriptions(locale: Locale): Record<string, string> {
    const t = getTaxCalendarTranslations(locale);
    return {
      pit4r: t.pit4r, pcc: t.pcc, dividend: t.dividend,
      zus: t.zus, cit: t.cit, vat7: t.vat7,
      vatue: t.vatue, pit11: t.pit11, cit8: t.cit8,
    };
  }

  /**
   * Get tax deadlines for a given period
   */
  getDeadlines(filters: TaxDeadlineFilters, locale: Locale = 'pl'): TaxDeadline[] {
    const { year, month, category } = filters;
    const holidays = getPolishHolidays(year);
    const descriptions = this.buildDescriptions(locale);
    const deadlines: TaxDeadline[] = [];

    const months = month ? [month] : Array.from({ length: 12 }, (_, i) => i + 1);

    for (const m of months) {
      for (const rule of TAX_DEADLINE_RULES) {
        // Skip annual rules in wrong months
        if (rule.frequency === 'annual' && rule.month !== m) continue;
        // Filter by category
        if (category && rule.category !== category) continue;

        const rawDate = new Date(year, m - 1, rule.day);
        const date = shiftToBusinessDay(rawDate, holidays);

        deadlines.push({
          id: `${rule.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${year}-${String(m).padStart(2, '0')}`,
          name: rule.name,
          description: descriptions[rule.descriptionKey] || rule.name,
          date,
          originalDay: rule.day,
          category: rule.category,
          frequency: rule.frequency,
          obligatory: rule.obligatory,
        });
      }
    }

    return deadlines.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Get upcoming tax deadlines within N days from today
   * Includes overdue deadlines from the past `pastDays` days
   */
  getUpcomingDeadlines(days: number, locale: Locale = 'pl', pastDays: number = 7): TaxDeadline[] {
    const now = new Date();
    const year = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Check previous, current and next month to cover edge cases
    const monthsToCheck: { year: number; month: number }[] = [];
    for (let offset = -1; offset <= 1; offset++) {
      let m = currentMonth + offset;
      let y = year;
      if (m < 1) { m = 12; y--; }
      if (m > 12) { m = 1; y++; }
      monthsToCheck.push({ year: y, month: m });
    }

    const allDeadlines: TaxDeadline[] = [];
    for (const { year: y, month: m } of monthsToCheck) {
      allDeadlines.push(...this.getDeadlines({ year: y, month: m }, locale));
    }

    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + days);

    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startDate.setDate(startDate.getDate() - pastDays);

    return allDeadlines.filter(
      (d) => d.date >= startDate && d.date <= endDate
    );
  }
}

// Export for testing
export {
  calculateEasterSunday,
  getPolishHolidays,
  shiftToBusinessDay,
  formatDateKey,
  TAX_DEADLINE_RULES,
};
```

- [ ] **Step 2: Create singleton instance**

```typescript
// tax-calendar.instance.ts
import { TaxCalendarService } from './tax-calendar.service';

export const taxCalendarService = new TaxCalendarService();
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/services/tax-calendar.service.ts packages/api/src/services/tax-calendar.instance.ts
git commit -m "feat(services): add TaxCalendarService with Polish tax deadlines and holiday logic (AIA-82)"
```

---

### Task 3: Unit tests for TaxCalendarService

**Files:**
- Create: `packages/api/src/services/__tests__/tax-calendar.service.test.ts`

- [ ] **Step 1: Write tests**

```typescript
import {
  TaxCalendarService,
  calculateEasterSunday,
  getPolishHolidays,
  shiftToBusinessDay,
  formatDateKey,
  TAX_DEADLINE_RULES,
} from '../tax-calendar.service';

// Mock i18n to avoid needing full translations in test
jest.mock('../../i18n', () => ({
  getTaxCalendarTranslations: () => ({
    pit4r: 'Payroll tax advance',
    pcc: 'Civil law transactions tax',
    dividend: 'Dividend withholding tax',
    zus: 'Social insurance contributions',
    cit: 'Corporate income tax advance',
    vat7: 'VAT-7 declaration and payment',
    vatue: 'EU VAT summary declaration',
    pit11: 'Annual employee tax information',
    cit8: 'Annual corporate tax return',
  }),
}));

describe('calculateEasterSunday', () => {
  it('returns correct Easter dates for known years', () => {
    // Known Easter Sundays
    expect(calculateEasterSunday(2024)).toEqual(new Date(2024, 2, 31)); // Mar 31
    expect(calculateEasterSunday(2025)).toEqual(new Date(2025, 3, 20)); // Apr 20
    expect(calculateEasterSunday(2026)).toEqual(new Date(2026, 3, 5));  // Apr 5
    expect(calculateEasterSunday(2027)).toEqual(new Date(2027, 2, 28)); // Mar 28
  });
});

describe('getPolishHolidays', () => {
  it('returns 13 holidays per year', () => {
    const holidays = getPolishHolidays(2026);
    expect(holidays.size).toBe(13);
  });

  it('includes fixed holidays', () => {
    const holidays = getPolishHolidays(2026);
    expect(holidays.has('2026-01-01')).toBe(true); // New Year
    expect(holidays.has('2026-01-06')).toBe(true); // Epiphany
    expect(holidays.has('2026-05-01')).toBe(true); // Labour Day
    expect(holidays.has('2026-05-03')).toBe(true); // Constitution Day
    expect(holidays.has('2026-12-25')).toBe(true); // Christmas
  });

  it('includes Easter-based moveable holidays for 2026', () => {
    // Easter 2026 = April 5
    const holidays = getPolishHolidays(2026);
    expect(holidays.has('2026-04-05')).toBe(true); // Easter Sunday
    expect(holidays.has('2026-04-06')).toBe(true); // Easter Monday
    expect(holidays.has('2026-05-24')).toBe(true); // Whit Sunday (Pentecost, +49)
    expect(holidays.has('2026-06-04')).toBe(true); // Corpus Christi (+60)
  });
});

describe('shiftToBusinessDay', () => {
  const holidays2026 = getPolishHolidays(2026);

  it('does not shift a weekday that is not a holiday', () => {
    // 2026-04-07 is Tuesday
    const date = new Date(2026, 3, 7);
    const shifted = shiftToBusinessDay(date, holidays2026);
    expect(shifted.getDate()).toBe(7);
  });

  it('shifts Saturday to Monday', () => {
    // 2026-04-25 is Saturday
    const date = new Date(2026, 3, 25);
    const shifted = shiftToBusinessDay(date, holidays2026);
    expect(shifted.getDay()).toBe(1); // Monday
    expect(shifted.getDate()).toBe(27);
  });

  it('shifts Sunday to Monday', () => {
    // 2026-04-26 is Sunday
    const date = new Date(2026, 3, 26);
    const shifted = shiftToBusinessDay(date, holidays2026);
    expect(shifted.getDate()).toBe(27);
  });

  it('shifts holiday to next business day', () => {
    // 2026-05-01 is Friday (Labour Day), 2026-05-03 is Sunday (Constitution Day)
    // May 1 = Friday holiday → shift to May 4 Monday? No, May 3 = Sunday. May 2 is Saturday.
    // Actually: May 1 (Fri, holiday) → May 2 (Sat) → May 3 (Sun, also holiday) → May 4 (Mon)
    const date = new Date(2026, 4, 1);
    const shifted = shiftToBusinessDay(date, holidays2026);
    expect(shifted.getDate()).toBe(4);
    expect(shifted.getMonth()).toBe(4); // May
  });
});

describe('TaxCalendarService', () => {
  const service = new TaxCalendarService();

  describe('getDeadlines', () => {
    it('returns 7 monthly deadlines for a regular month', () => {
      const deadlines = service.getDeadlines({ year: 2026, month: 6 }, 'en');
      expect(deadlines.length).toBe(7);
    });

    it('returns 7 + 1 = 8 deadlines for March (CIT-8 annual)', () => {
      const deadlines = service.getDeadlines({ year: 2026, month: 3 }, 'en');
      expect(deadlines.length).toBe(8);
      expect(deadlines.find(d => d.name === 'CIT-8')).toBeDefined();
    });

    it('returns 7 + 1 = 8 deadlines for February (PIT-11 annual)', () => {
      const deadlines = service.getDeadlines({ year: 2026, month: 2 }, 'en');
      expect(deadlines.length).toBe(8);
      expect(deadlines.find(d => d.name === 'PIT-11')).toBeDefined();
    });

    it('filters by category', () => {
      const deadlines = service.getDeadlines({ year: 2026, month: 4, category: 'vat' }, 'en');
      expect(deadlines.every(d => d.category === 'vat')).toBe(true);
      expect(deadlines.length).toBe(2); // VAT-7 + VAT-UE
    });

    it('generates full year when month is omitted', () => {
      const deadlines = service.getDeadlines({ year: 2026 }, 'en');
      // 12 months × 7 monthly + 2 annual = 86
      expect(deadlines.length).toBe(86);
    });

    it('shifts VAT-7 when 25th is Saturday', () => {
      // April 2026: 25th is Saturday → should shift to Monday 27th
      const deadlines = service.getDeadlines({ year: 2026, month: 4 }, 'en');
      const vat7 = deadlines.find(d => d.name === 'VAT-7');
      expect(vat7).toBeDefined();
      expect(vat7!.date.getDate()).toBe(27);
      expect(vat7!.originalDay).toBe(25);
    });

    it('returns sorted deadlines by date', () => {
      const deadlines = service.getDeadlines({ year: 2026, month: 4 }, 'en');
      for (let i = 1; i < deadlines.length; i++) {
        expect(deadlines[i].date.getTime()).toBeGreaterThanOrEqual(deadlines[i - 1].date.getTime());
      }
    });

    it('generates correct IDs', () => {
      const deadlines = service.getDeadlines({ year: 2026, month: 4 }, 'en');
      const vat7 = deadlines.find(d => d.name === 'VAT-7');
      expect(vat7!.id).toBe('vat-7-2026-04');
    });
  });

  describe('getUpcomingDeadlines', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns correct deadlines for April 1, 2026', () => {
      jest.setSystemTime(new Date(2026, 3, 1)); // April 1, 2026
      const deadlines = service.getUpcomingDeadlines(30, 'en');
      // All 7 monthly April deadlines should be within 30 days
      expect(deadlines.length).toBe(7);
      expect(deadlines[0].name).toBe('PIT-4R');
    });

    it('includes overdue deadlines from past 7 days', () => {
      jest.setSystemTime(new Date(2026, 3, 10)); // April 10
      const deadlines = service.getUpcomingDeadlines(30, 'en', 7);
      // PIT-4R, PCC-3, PIT-8AR are on April 7 (3 days ago, within pastDays=7)
      const overdueNames = deadlines
        .filter(d => d.date < new Date(2026, 3, 10))
        .map(d => d.name);
      expect(overdueNames).toContain('PIT-4R');
    });

    it('excludes deadlines older than pastDays', () => {
      jest.setSystemTime(new Date(2026, 3, 20)); // April 20
      const deadlines = service.getUpcomingDeadlines(30, 'en', 3);
      // April 7 deadlines are 13 days ago, pastDays=3 → excluded
      const april7 = deadlines.filter(d => d.date.getDate() === 7 && d.date.getMonth() === 3);
      expect(april7.length).toBe(0);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `cd packages/api && npx jest src/services/__tests__/tax-calendar.service.test.ts --verbose`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/services/__tests__/tax-calendar.service.test.ts
git commit -m "test: add unit tests for TaxCalendarService (AIA-82)"
```

---

### Task 4: i18n translations

**Files:**
- Modify: `packages/api/src/i18n/locales/pl.json`
- Modify: `packages/api/src/i18n/locales/en.json`
- Modify: `packages/api/src/i18n/locales/ru.json`
- Modify: `packages/api/src/i18n/index.ts`

- [ ] **Step 1: Add `taxCalendar` section to `en.json`**

Add after the last section (before the closing `}`):

```json
"taxCalendar": {
  "title": "Tax Calendar",
  "deadlinesTitle": "Tax Deadlines",
  "date": "Date",
  "name": "Name",
  "description": "Description",
  "category": "Category",
  "status": "Status",
  "obligatory": "Obligatory",
  "optional": "Optional",
  "statusOverdue": "Overdue",
  "statusToday": "Today",
  "statusUpcoming": "Upcoming",
  "shiftNote": "Dates shifted to next business day when falling on weekends/holidays.",
  "optionalNote": "Deadlines marked as \"optional\" (PCC, dividends, VAT-UE) apply only when relevant transactions occurred.",
  "notFound": "No tax deadlines found for the given period.",
  "errorFetch": "Failed to retrieve tax deadlines.",
  "pit4r": "Payroll tax advance (employees)",
  "pcc": "Tax on civil law transactions",
  "dividend": "Dividend withholding tax (PIT-8AR)",
  "zus": "Social insurance contributions (legal entities)",
  "cit": "Corporate income tax advance",
  "vat7": "VAT-7/JPK_VAT declaration and payment",
  "vatue": "EU VAT summary declaration (VAT-UE)",
  "pit11": "Annual employee tax information",
  "cit8": "Annual corporate tax return",
  "categoryVat": "VAT",
  "categoryCit": "CIT",
  "categoryPit": "PIT",
  "categoryZus": "ZUS",
  "categoryPcc": "PCC",
  "categoryDividend": "Dividends"
}
```

- [ ] **Step 2: Add `taxCalendar` section to `pl.json`**

```json
"taxCalendar": {
  "title": "Kalendarz podatkowy",
  "deadlinesTitle": "Terminy podatkowe",
  "date": "Data",
  "name": "Nazwa",
  "description": "Opis",
  "category": "Kategoria",
  "status": "Status",
  "obligatory": "Obowiązkowy",
  "optional": "Opcjonalny",
  "statusOverdue": "Zaległy",
  "statusToday": "Dziś",
  "statusUpcoming": "Nadchodzący",
  "shiftNote": "Daty przesunięte na najbliższy dzień roboczy, jeśli przypadają na weekend/święto.",
  "optionalNote": "Terminy oznaczone jako „opcjonalne" (PCC, dywidendy, VAT-UE) obowiązują tylko gdy wystąpiły odpowiednie transakcje.",
  "notFound": "Brak terminów podatkowych dla podanego okresu.",
  "errorFetch": "Nie udało się pobrać terminów podatkowych.",
  "pit4r": "Zaliczka na podatek od wynagrodzeń (PIT-4R)",
  "pcc": "Podatek od czynności cywilnoprawnych (PCC-3)",
  "dividend": "Zryczałtowany podatek od dywidend (PIT-8AR)",
  "zus": "Składki ZUS (osoby prawne)",
  "cit": "Zaliczka na podatek dochodowy CIT",
  "vat7": "Deklaracja i zapłata VAT-7/JPK_VAT",
  "vatue": "Informacja podsumowująca VAT-UE",
  "pit11": "Roczna informacja o dochodach pracowników (PIT-11)",
  "cit8": "Roczna deklaracja CIT-8",
  "categoryVat": "VAT",
  "categoryCit": "CIT",
  "categoryPit": "PIT",
  "categoryZus": "ZUS",
  "categoryPcc": "PCC",
  "categoryDividend": "Dywidendy"
}
```

- [ ] **Step 3: Add `taxCalendar` section to `ru.json`**

```json
"taxCalendar": {
  "title": "Налоговый календарь",
  "deadlinesTitle": "Налоговые сроки",
  "date": "Дата",
  "name": "Название",
  "description": "Описание",
  "category": "Категория",
  "status": "Статус",
  "obligatory": "Обязательный",
  "optional": "Необязательный",
  "statusOverdue": "Просрочен",
  "statusToday": "Сегодня",
  "statusUpcoming": "Предстоит",
  "shiftNote": "Даты сдвинуты на ближайший рабочий день, если выпадают на выходной/праздник.",
  "optionalNote": "Сроки, отмеченные как «необязательные» (PCC, дивиденды, VAT-UE), применяются только при наличии соответствующих операций.",
  "notFound": "Нет налоговых сроков за указанный период.",
  "errorFetch": "Не удалось получить налоговые сроки.",
  "pit4r": "Аванс по налогу на зарплаты (PIT-4R)",
  "pcc": "Налог на гражданско-правовые сделки (PCC-3)",
  "dividend": "Налог на дивиденды (PIT-8AR)",
  "zus": "Страховые взносы ZUS (юрлица)",
  "cit": "Аванс по корпоративному налогу CIT",
  "vat7": "Декларация и уплата VAT-7/JPK_VAT",
  "vatue": "Сводная декларация VAT-UE",
  "pit11": "Годовая справка о доходах сотрудников (PIT-11)",
  "cit8": "Годовая декларация CIT-8",
  "categoryVat": "НДС",
  "categoryCit": "CIT",
  "categoryPit": "НДФЛ",
  "categoryZus": "ZUS",
  "categoryPcc": "PCC",
  "categoryDividend": "Дивиденды"
}
```

- [ ] **Step 4: Add TaxCalendarTranslations interface and getter to `i18n/index.ts`**

Add interface (after `KSeFTranslations`):

```typescript
export interface TaxCalendarTranslations {
  title: string;
  deadlinesTitle: string;
  date: string;
  name: string;
  description: string;
  category: string;
  status: string;
  obligatory: string;
  optional: string;
  statusOverdue: string;
  statusToday: string;
  statusUpcoming: string;
  shiftNote: string;
  optionalNote: string;
  notFound: string;
  errorFetch: string;
  // Deadline descriptions
  pit4r: string;
  pcc: string;
  dividend: string;
  zus: string;
  cit: string;
  vat7: string;
  vatue: string;
  pit11: string;
  cit8: string;
  // Category names
  categoryVat: string;
  categoryCit: string;
  categoryPit: string;
  categoryZus: string;
  categoryPcc: string;
  categoryDividend: string;
}
```

Add `taxCalendar: TaxCalendarTranslations;` to `Translations` interface.

Add getter (after `getCommonTranslations`):

```typescript
export function getTaxCalendarTranslations(locale: Locale = 'pl'): TaxCalendarTranslations {
  return getTranslations(locale).taxCalendar;
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/i18n/
git commit -m "feat(i18n): add tax calendar translations pl/en/ru (AIA-82)"
```

---

### Task 5: Formatter

**Files:**
- Create: `packages/api/src/services/ai-chat/formatters/tax-calendar.formatter.ts`
- Modify: `packages/api/src/services/ai-chat/formatters/index.ts`

- [ ] **Step 1: Create formatter**

```typescript
/**
 * Tax Calendar Formatter
 * Formats tax deadlines for AI responses (localized)
 */

import { TaxDeadline } from '../../../types/tax-calendar.types';
import { getTaxCalendarTranslations, Locale } from '../../../i18n';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getStatus(date: Date, locale: Locale): string {
  const t = getTaxCalendarTranslations(locale);
  const today = new Date();
  const todayStr = formatDate(today);
  const dateStr = formatDate(date);

  if (dateStr < todayStr) return t.statusOverdue;
  if (dateStr === todayStr) return t.statusToday;
  return t.statusUpcoming;
}

function getCategoryName(category: string, locale: Locale): string {
  const t = getTaxCalendarTranslations(locale);
  const map: Record<string, string> = {
    vat: t.categoryVat,
    cit: t.categoryCit,
    pit: t.categoryPit,
    zus: t.categoryZus,
    pcc: t.categoryPcc,
    dividend: t.categoryDividend,
  };
  return map[category] || category.toUpperCase();
}

export function formatTaxDeadlinesList(
  deadlines: TaxDeadline[],
  locale: Locale = 'pl',
): string {
  const t = getTaxCalendarTranslations(locale);

  if (deadlines.length === 0) {
    return t.notFound;
  }

  let result = `## ${t.deadlinesTitle} (${deadlines.length})\n\n`;
  result += `| # | ${t.date} | ${t.name} | ${t.description} | ${t.category} | ${t.status} |\n`;
  result += '|---|------|------|-------------|----------|--------|\n';

  deadlines.forEach((d, i) => {
    const status = getStatus(d.date, locale);
    const desc = d.description.length > 40
      ? d.description.substring(0, 40) + '...'
      : d.description;
    result += `| ${i + 1} | ${formatDate(d.date)} | **${d.name}** | ${desc} | ${getCategoryName(d.category, locale)} | ${status} |\n`;
  });

  result += `\n> ${t.shiftNote}\n> ${t.optionalNote}`;

  return result;
}
```

- [ ] **Step 2: Add export to `formatters/index.ts`**

Add at end of file:

```typescript
export {
  formatTaxDeadlinesList,
} from './tax-calendar.formatter';
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/services/ai-chat/formatters/tax-calendar.formatter.ts packages/api/src/services/ai-chat/formatters/index.ts
git commit -m "feat(formatters): add tax calendar formatter with localized output (AIA-82)"
```

---

### Task 6: AI Tool

**Files:**
- Create: `packages/api/src/services/ai-chat/tools/tax-calendar.tools.ts`
- Modify: `packages/api/src/services/ai-chat/tools/index.ts`

- [ ] **Step 1: Create tool**

```typescript
/**
 * Tax Calendar Tools
 * LangChain tool for Polish tax payment deadlines
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../../utils/logger';
import { getTaxCalendarTranslations, Locale } from '../../../i18n';
import { TaxCalendarService } from '../../tax-calendar.service';
import { TaxCategory } from '../../../types/tax-calendar.types';
import { formatTaxDeadlinesList } from '../formatters';

export function createGetTaxDeadlinesTool(
  taxCalendarService: TaxCalendarService,
  locale: Locale,
): StructuredToolInterface {
  return (tool as any)(
    async ({
      year,
      month,
      category,
    }: {
      year: number;
      month?: number;
      category?: string;
    }) => {
      try {
        const deadlines = taxCalendarService.getDeadlines(
          {
            year,
            month: month || undefined,
            category: (category as TaxCategory) || undefined,
          },
          locale,
        );

        logger.info('Generated tax deadlines for AI tool', {
          year,
          month,
          category,
          count: deadlines.length,
        });

        return formatTaxDeadlinesList(deadlines, locale);
      } catch (error) {
        logger.error('Failed to get tax deadlines', { error });
        const t = getTaxCalendarTranslations(locale);
        return `Error: ${t.errorFetch}`;
      }
    },
    {
      name: 'get_tax_deadlines',
      description:
        'Get Polish tax payment deadlines (VAT-7, CIT, PIT-4R, ZUS, VAT-UE, PCC, dividends) for a given period. Use when user asks about tax deadlines, payment dates, tax calendar, upcoming tax obligations, or "сроки уплаты налогов". This tool does NOT query wFirma — it generates statutory deadlines based on Polish tax law.',
      schema: z.object({
        year: z.number().int().min(2020).max(2030).describe('Year for the deadlines'),
        month: z
          .number()
          .int()
          .min(1)
          .max(12)
          .nullable()
          .optional()
          .describe('Month (1-12). Omit for full year overview.'),
        category: z
          .enum(['vat', 'cit', 'pit', 'zus', 'pcc', 'dividend'])
          .nullable()
          .optional()
          .describe('Filter by tax category'),
      }),
    },
  );
}
```

- [ ] **Step 2: Register tool in `tools/index.ts`**

Add import at top (after other tool imports):

```typescript
import { createGetTaxDeadlinesTool } from './tax-calendar.tools';
```

Add import for service:

```typescript
import { taxCalendarService } from '../../tax-calendar.instance';
```

Add to the `createAllTools` return array, after Declaration tools section and before Document tools:

```typescript
    // Tax Calendar tool (no wFirma dependency — always available)
    createGetTaxDeadlinesTool(taxCalendarService, locale),
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/services/ai-chat/tools/tax-calendar.tools.ts packages/api/src/services/ai-chat/tools/index.ts
git commit -m "feat(tools): add get_tax_deadlines AI tool (AIA-82)"
```

---

### Task 7: Dashboard integration

**Files:**
- Modify: `packages/api/src/types/dashboard.types.ts`
- Modify: `packages/api/src/services/dashboard/dashboard.service.ts`

- [ ] **Step 1: Add `source` field to `DashboardDeadline`**

In `packages/api/src/types/dashboard.types.ts`, change:

```typescript
export interface DashboardDeadline {
  id: string;
  date: string;
  description: string;
  groupName?: string;
  daysUntil: number;
  urgency: 'overdue' | 'urgent' | 'soon' | 'normal';
}
```

To:

```typescript
export interface DashboardDeadline {
  id: string;
  date: string;
  description: string;
  groupName?: string;
  daysUntil: number;
  urgency: 'overdue' | 'urgent' | 'soon' | 'normal';
  source?: 'user' | 'tax';
}
```

- [ ] **Step 2: Merge tax deadlines in `dashboard.service.ts`**

Add import at top of `dashboard.service.ts`:

```typescript
import { taxCalendarService } from '../tax-calendar.instance';
```

In `getDeadlinesSection()`, after the existing code that builds user term deadlines (around line 174-194), add tax deadlines before the return:

Replace the return statement `return terms.map(...)...sort(...)` with code that:
1. Maps user terms with `source: 'user'`
2. Generates tax deadlines via `taxCalendarService.getUpcomingDeadlines(30, descriptions)`
3. Maps tax deadlines to `DashboardDeadline` format with `source: 'tax'`
4. Merges both arrays
5. Sorts by `daysUntil`

The merged section should look like:

```typescript
      const userDeadlines: DashboardDeadline[] = terms
        .map((term) => {
          const termDate = term.date instanceof Date ? term.date : new Date(term.date);
          const daysUntil = Math.ceil((termDate.getTime() - todayMs) / dayMs);

          let urgency: DashboardDeadline['urgency'];
          if (daysUntil < 0) urgency = 'overdue';
          else if (daysUntil <= 3) urgency = 'urgent';
          else if (daysUntil <= 7) urgency = 'soon';
          else urgency = 'normal';

          return {
            id: term.id,
            date: termDate.toISOString(),
            description: term.description || '',
            groupName: term.groupId ? groupMap.get(term.groupId) : undefined,
            daysUntil,
            urgency,
            source: 'user' as const,
          };
        });

      // Add tax deadlines (dashboard uses 'pl' locale; TODO: pass user locale when available)
      const taxDeadlines = taxCalendarService.getUpcomingDeadlines(30, 'pl');

      const taxDashboardDeadlines: DashboardDeadline[] = taxDeadlines.map((td) => {
        const daysUntil = Math.ceil((td.date.getTime() - todayMs) / dayMs);

        let urgency: DashboardDeadline['urgency'];
        if (daysUntil < 0) urgency = 'overdue';
        else if (daysUntil <= 3) urgency = 'urgent';
        else if (daysUntil <= 7) urgency = 'soon';
        else urgency = 'normal';

        return {
          id: `tax-${td.id}`,
          date: td.date.toISOString(),
          description: `${td.name}: ${td.description}`,
          daysUntil,
          urgency,
          source: 'tax' as const,
        };
      });

      return [...userDeadlines, ...taxDashboardDeadlines]
        .sort((a, b) => a.daysUntil - b.daysUntil);
```

- [ ] **Step 3: Commit**

```bash
git add packages/api/src/types/dashboard.types.ts packages/api/src/services/dashboard/dashboard.service.ts
git commit -m "feat(dashboard): integrate tax deadlines into dashboard deadlines section (AIA-82)"
```

---

### Task 8: Build & verify

- [ ] **Step 1: Run full test suite**

Run: `cd packages/api && npx jest --verbose 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 2: Run build**

Run: `npm run build --filter=@accounting-ai-agent/api`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address build/test issues for tax calendar (AIA-82)"
```
