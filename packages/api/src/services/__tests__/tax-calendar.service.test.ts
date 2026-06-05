import {
  TaxCalendarService,
  calculateEasterSunday,
  getPolishHolidays,
  shiftToBusinessDay,
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
    expect(calculateEasterSunday(2024)).toEqual(new Date(2024, 2, 31));
    expect(calculateEasterSunday(2025)).toEqual(new Date(2025, 3, 20));
    expect(calculateEasterSunday(2026)).toEqual(new Date(2026, 3, 5));
    expect(calculateEasterSunday(2027)).toEqual(new Date(2027, 2, 28));
  });
});

describe('getPolishHolidays', () => {
  it('returns 13 holidays per year', () => {
    const holidays = getPolishHolidays(2026);
    expect(holidays.size).toBe(13);
  });

  it('includes fixed holidays', () => {
    const holidays = getPolishHolidays(2026);
    expect(holidays.has('2026-01-01')).toBe(true);
    expect(holidays.has('2026-01-06')).toBe(true);
    expect(holidays.has('2026-05-01')).toBe(true);
    expect(holidays.has('2026-05-03')).toBe(true);
    expect(holidays.has('2026-12-25')).toBe(true);
  });

  it('includes Easter-based moveable holidays for 2026', () => {
    const holidays = getPolishHolidays(2026);
    expect(holidays.has('2026-04-05')).toBe(true);
    expect(holidays.has('2026-04-06')).toBe(true);
    expect(holidays.has('2026-05-24')).toBe(true);
    expect(holidays.has('2026-06-04')).toBe(true);
  });
});

describe('shiftToBusinessDay', () => {
  const holidays2026 = getPolishHolidays(2026);

  it('does not shift a weekday that is not a holiday', () => {
    const date = new Date(2026, 3, 7);
    const shifted = shiftToBusinessDay(date, holidays2026);
    expect(shifted.getDate()).toBe(7);
  });

  it('shifts Saturday to Monday', () => {
    const date = new Date(2026, 3, 25);
    const shifted = shiftToBusinessDay(date, holidays2026);
    expect(shifted.getDay()).toBe(1);
    expect(shifted.getDate()).toBe(27);
  });

  it('shifts Sunday to Monday', () => {
    const date = new Date(2026, 3, 26);
    const shifted = shiftToBusinessDay(date, holidays2026);
    expect(shifted.getDate()).toBe(27);
  });

  it('shifts holiday to next business day', () => {
    // May 1 (Fri, holiday) → May 2 (Sat) → May 3 (Sun, holiday) → May 4 (Mon)
    const date = new Date(2026, 4, 1);
    const shifted = shiftToBusinessDay(date, holidays2026);
    expect(shifted.getDate()).toBe(4);
    expect(shifted.getMonth()).toBe(4);
  });
});

describe('TaxCalendarService', () => {
  const service = new TaxCalendarService();

  describe('getDeadlines', () => {
    it('returns 6 monthly deadlines for a regular month', () => {
      const deadlines = service.getDeadlines({ year: 2026, month: 6 }, 'en');
      expect(deadlines.length).toBe(6);
    });

    it('does not include event-driven PCC-3 in the recurring calendar', () => {
      const deadlines = service.getDeadlines({ year: 2026, month: 6 }, 'en');
      expect(deadlines.find(d => d.name === 'PCC-3')).toBeUndefined();
    });

    it('returns 8 deadlines for January (PIT-4R + PIT-8AR annual declarations)', () => {
      const deadlines = service.getDeadlines({ year: 2026, month: 1 }, 'en');
      expect(deadlines.length).toBe(8);
      const annual = deadlines.filter(d => d.frequency === 'annual').map(d => d.name).sort();
      expect(annual).toEqual(['PIT-4R', 'PIT-8AR']);
    });

    it('returns 7 deadlines for March (CIT-8 annual)', () => {
      const deadlines = service.getDeadlines({ year: 2026, month: 3 }, 'en');
      expect(deadlines.length).toBe(7);
      expect(deadlines.find(d => d.name === 'CIT-8')).toBeDefined();
    });

    it('returns 7 deadlines for February (PIT-11 annual)', () => {
      const deadlines = service.getDeadlines({ year: 2026, month: 2 }, 'en');
      expect(deadlines.length).toBe(7);
      expect(deadlines.find(d => d.name === 'PIT-11')).toBeDefined();
    });

    it('schedules the monthly payroll advance (PIT-4) on the 20th', () => {
      const deadlines = service.getDeadlines({ year: 2026, month: 6 }, 'en');
      const pit4 = deadlines.find(d => d.name === 'PIT-4');
      expect(pit4).toBeDefined();
      expect(pit4!.originalDay).toBe(20);
    });

    it('filters by category', () => {
      const deadlines = service.getDeadlines({ year: 2026, month: 4, category: 'vat' }, 'en');
      expect(deadlines.every(d => d.category === 'vat')).toBe(true);
      expect(deadlines.length).toBe(2);
    });

    it('generates full year when month is omitted', () => {
      const deadlines = service.getDeadlines({ year: 2026 }, 'en');
      // 6 monthly × 12 + 4 annual (PIT-4R, PIT-8AR, PIT-11, CIT-8)
      expect(deadlines.length).toBe(76);
    });

    it('shifts VAT-7 when 25th is Saturday', () => {
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
      expect(vat7!.id).toBe('vat-7-2026-04-25');
    });
  });

  describe('getUpcomingDeadlines', () => {
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.useRealTimers(); });

    it('returns correct deadlines for April 1, 2026', () => {
      jest.setSystemTime(new Date(2026, 3, 1));
      const deadlines = service.getUpcomingDeadlines(30, 'en');
      // 6 April deadlines + some late-March overdue (pastDays=7 default)
      expect(deadlines.length).toBeGreaterThanOrEqual(6);
      // First upcoming deadline in April should be ZUS on the 15th
      const aprilDeadlines = deadlines.filter(d => d.date.getMonth() === 3);
      expect(aprilDeadlines[0].name).toBe('ZUS');
    });

    it('includes overdue deadlines from past 7 days', () => {
      jest.setSystemTime(new Date(2026, 3, 22));
      const deadlines = service.getUpcomingDeadlines(30, 'en', 7);
      const overdueNames = deadlines
        .filter(d => d.date < new Date(2026, 3, 22))
        .map(d => d.name);
      // PIT-4 (the 20th) is within the past 7 days → reported as overdue
      expect(overdueNames).toContain('PIT-4');
    });

    it('excludes deadlines older than pastDays', () => {
      jest.setSystemTime(new Date(2026, 3, 25));
      const deadlines = service.getUpcomingDeadlines(30, 'en', 3);
      // The 20th is more than 3 days before the 25th → excluded
      const april20 = deadlines.filter(d => d.date.getDate() === 20 && d.date.getMonth() === 3);
      expect(april20.length).toBe(0);
    });
  });
});
