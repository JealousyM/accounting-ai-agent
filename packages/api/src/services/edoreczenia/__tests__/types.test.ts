import type { LetterAnalysis, UAMessageSummary } from '../types';

describe('edoreczenia shared types', () => {
  it('LetterAnalysis carries deadlines with ISO dueDate', () => {
    const a: LetterAnalysis = {
      summary: 's', letterType: 'wezwanie', severity: 'high', requiredAction: 'r',
      deadlines: [{ type: 'response_deadline', dueDate: '2026-10-15', description: 'd' }],
    };
    expect(a.deadlines[0].dueDate).toBe('2026-10-15');
  });
  it('UAMessageSummary uses messageId as identity', () => {
    const m: UAMessageSummary = {
      messageId: 'ABC', senderName: 'US', subject: null, receivedAt: new Date(), hasAttachments: true,
    };
    expect(m.messageId).toBe('ABC');
  });
});
