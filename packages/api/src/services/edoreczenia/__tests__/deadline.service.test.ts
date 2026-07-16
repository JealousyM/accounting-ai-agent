import { EDoreczeniaDeadlineService } from '../deadline.service';
import type { LetterAnalysis } from '../types';

const analysis = (deadlines: LetterAnalysis['deadlines']): LetterAnalysis => ({
  summary: 's', letterType: 'wezwanie', severity: 'high', requiredAction: 'r', deadlines,
});

describe('EDoreczeniaDeadlineService.buildDeadlines', () => {
  const svc = new EDoreczeniaDeadlineService({} as never);

  it('always adds a 14-day fikcja_doreczenia deadline from receivedAt', () => {
    const out = svc.buildDeadlines(new Date('2026-10-01T00:00:00Z'), analysis([]));
    const fikcja = out.find((d) => d.type === 'fikcja_doreczenia');
    expect(fikcja?.dueDate).toBe('2026-10-15');
  });

  it('includes AI-extracted response deadlines alongside the fikcja one', () => {
    const out = svc.buildDeadlines(new Date('2026-10-01T00:00:00Z'), analysis([
      { type: 'response_deadline', dueDate: '2026-10-21', description: 'odpowiedź na wezwanie' },
    ]));
    expect(out.map((d) => d.type).sort()).toEqual(['fikcja_doreczenia', 'response_deadline']);
  });
});
