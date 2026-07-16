import { createGetOfficialLettersTool, createMarkLetterDoneTool } from '../edelivery.tools';

describe('edelivery tools', () => {
  it('get_official_letters returns a localized list string', async () => {
    const service = { getLetters: jest.fn().mockResolvedValue([
      { id: 'L1', senderName: 'Urząd Skarbowy', subject: 'Wezwanie', receivedAt: new Date('2026-10-01'), status: 'needs_action', analysis: { severity: 'high' }, deadlines: [] },
    ]) } as never;
    const tool = createGetOfficialLettersTool(service, 'u1', 'pl') as never as { invoke: (a: unknown) => Promise<string> };
    const out = await tool.invoke({ filter: 'needs_action' });
    expect(out).toContain('Urząd Skarbowy');
  });

  it('mark_letter_done calls the service and confirms', async () => {
    const service = { markLetterDone: jest.fn().mockResolvedValue(undefined) } as never;
    const tool = createMarkLetterDoneTool(service, 'u1', 'pl') as never as { invoke: (a: unknown) => Promise<string> };
    const out = await tool.invoke({ letterId: 'L1' });
    expect((service as { markLetterDone: jest.Mock }).markLetterDone).toHaveBeenCalledWith('u1', 'L1');
    expect(out).toBeTruthy();
  });
});
