/**
 * Tax Calendar Service
 * Generates Polish statutory tax payment deadlines
 */

import {
  TaxDeadline,
  TaxDeadlineFilters,
  TaxDeadlineRule,
} from '../types/tax-calendar.types';
import { getTaxCalendarTranslations, Locale } from '../i18n';

// ============================================
// POLISH TAX DEADLINE RULES
// ============================================

// Deadlines are stated as the statutory day; shiftToBusinessDay() moves them to
// the next working day when they fall on a weekend/holiday.
//
// PCC-3 is intentionally NOT listed: it is event-driven (filed and paid within
// 14 days of the transaction), so it has no fixed recurring date.
const TAX_DEADLINE_RULES: TaxDeadlineRule[] = [
  // Monthly — 15th (ZUS for legal entities / płatnicy będący osobami prawnymi)
  { name: 'ZUS', day: 15, category: 'zus', frequency: 'monthly', obligatory: true, descriptionKey: 'zus' },
  // Monthly — 20th: płatnik advances are due by the 20th of the following month
  { name: 'PIT-4', day: 20, category: 'pit', frequency: 'monthly', obligatory: true, descriptionKey: 'pit4' },
  { name: 'PIT-8AR', day: 20, category: 'dividend', frequency: 'monthly', obligatory: false, descriptionKey: 'dividend' },
  { name: 'CIT', day: 20, category: 'cit', frequency: 'monthly', obligatory: true, descriptionKey: 'cit' },
  // Monthly — 25th
  { name: 'VAT-7', day: 25, category: 'vat', frequency: 'monthly', obligatory: true, descriptionKey: 'vat7' },
  { name: 'VAT-UE', day: 25, category: 'vat', frequency: 'monthly', obligatory: false, descriptionKey: 'vatue' },
  // Annual — 31 January: płatnik annual declarations
  { name: 'PIT-4R', day: 31, category: 'pit', frequency: 'annual', obligatory: true, month: 1, descriptionKey: 'pit4r' },
  { name: 'PIT-8AR', day: 31, category: 'dividend', frequency: 'annual', obligatory: false, month: 1, descriptionKey: 'pit8ar' },
  // Annual — PIT-11 (employee copy by end of February)
  { name: 'PIT-11', day: 28, category: 'pit', frequency: 'annual', obligatory: true, month: 2, descriptionKey: 'pit11' },
  // Annual — CIT-8 (31 March)
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
  let dow = result.getDay();
  while (dow === 0 || dow === 6 || holidays.has(formatDateKey(result))) {
    result.setDate(result.getDate() + 1);
    dow = result.getDay();
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
      pit4: t.pit4, pit4r: t.pit4r, dividend: t.dividend, pit8ar: t.pit8ar,
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
        if (rule.frequency === 'annual' && rule.month !== m) continue;
        if (category && rule.category !== category) continue;

        const rawDate = new Date(year, m - 1, rule.day);
        const date = shiftToBusinessDay(rawDate, holidays);

        deadlines.push({
          // Day is part of the id so distinct obligations that share a name and
          // month (e.g. monthly PIT-8AR on the 20th vs annual PIT-8AR on the
          // 31st of January) get unique ids.
          id: `${rule.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${year}-${String(m).padStart(2, '0')}-${String(rule.day).padStart(2, '0')}`,
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
