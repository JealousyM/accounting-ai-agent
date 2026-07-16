import { LetterAnalysisService } from '../letter-analysis.service';
import type { LetterAnalysis } from '../types';

describe('LetterAnalysisService', () => {
  const result: LetterAnalysis = {
    summary: 'Urząd wzywa do złożenia wyjaśnień', letterType: 'wezwanie', severity: 'high',
    requiredAction: 'Złóż wyjaśnienia', deadlines: [{ type: 'response_deadline', dueDate: '2026-10-21', description: 'x' }],
  };
  const model = { invoke: jest.fn().mockResolvedValue(result) };
  const svc = new LetterAnalysisService(async () => model as never);

  it('classifies sender type from the sender name', () => {
    expect(svc.classifySender('Urząd Skarbowy w Warszawie')).toBe('us');
    expect(svc.classifySender('Zakład Ubezpieczeń Społecznych')).toBe('zus');
    expect(svc.classifySender('Sąd Rejonowy')).toBe('court');
    expect(svc.classifySender('Jan Kowalski')).toBe('other');
    expect(svc.classifySender(null)).toBe('unknown');
  });

  it('returns the structured analysis from the model', async () => {
    const out = await svc.analyze('u1', { senderName: 'US', subject: 'Wezwanie', bodyText: 'treść', locale: 'pl' });
    expect(out.letterType).toBe('wezwanie');
    expect(model.invoke).toHaveBeenCalled();
  });
});
