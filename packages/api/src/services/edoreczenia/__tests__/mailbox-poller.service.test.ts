import { MailboxPollerService } from '../mailbox-poller.service';

describe('MailboxPollerService.pollOnce', () => {
  const activeConfig = { id: 'c1', userId: 'u1', adeAddress: 'ADE', environment: 'int', certPem: 'C', privateKeyPem: 'K', autoReceive: true };

  function makeDeps(existingMessageIds: string[] = [], configOverrides: Record<string, unknown> = {}) {
    const cfg = { ...activeConfig, ...configOverrides };
    const created: Array<Record<string, unknown>> = [];
    const prisma = {
      $queryRaw: jest.fn(),
      eDoreczeniaConfig: { update: jest.fn().mockResolvedValue({}) },
      eDoreczeniaLetter: {
        findUnique: jest.fn(({ where }: never) =>
          existingMessageIds.includes((where as { userId_messageId: { messageId: string } }).userId_messageId.messageId)
            ? Promise.resolve({ id: 'existing' }) : Promise.resolve(null)),
        create: jest.fn((args: { data: Record<string, unknown> }) => { const row = { id: 'L1', ...args.data }; created.push(row); return Promise.resolve(row); }),
        update: jest.fn().mockResolvedValue({}),
      },
    } as never;
    const configService = { getActiveConfigs: jest.fn().mockResolvedValue([cfg]) } as never;
    const client = {
      listMessages: jest.fn().mockResolvedValue([
        { messageId: 'M1', senderName: 'Urząd Skarbowy', subject: 'Wezwanie', receivedAt: new Date('2026-10-01T00:00:00Z'), hasAttachments: false },
      ]),
      receiveMessage: jest.fn().mockResolvedValue({ messageId: 'M1', bodyText: 'treść', attachments: [] }),
    };
    const analysisService = {
      classifySender: jest.fn().mockReturnValue('us'),
      analyze: jest.fn().mockResolvedValue({ summary: 's', letterType: 'wezwanie', severity: 'high', requiredAction: 'r', deadlines: [] }),
    } as never;
    const deadlineService = {
      buildDeadlines: jest.fn().mockReturnValue([{ type: 'fikcja_doreczenia', dueDate: '2026-10-15', description: 'x' }]),
      persistDeadlines: jest.fn().mockResolvedValue(undefined),
    } as never;
    const onNewLetter = jest.fn().mockResolvedValue(undefined);
    return { prisma, configService, clientFactory: () => client, analysisService, deadlineService, onNewLetter, created, client };
  }

  it('ingests a new message: creates letter, analyses, persists deadlines, fires onNewLetter', async () => {
    const d = makeDeps([]);
    const poller = new MailboxPollerService(d as never);
    await poller.pollOnce();
    expect(d.created).toHaveLength(1);
    expect(d.created[0].messageId).toBe('M1');
    expect((d.deadlineService as { persistDeadlines: jest.Mock }).persistDeadlines).toHaveBeenCalled();
    expect(d.onNewLetter).toHaveBeenCalledWith('u1', 'L1');
  });

  it('skips a message that was already ingested (dedupe by userId+messageId)', async () => {
    const d = makeDeps(['M1']);
    const poller = new MailboxPollerService(d as never);
    await poller.pollOnce();
    expect(d.created).toHaveLength(0);
    expect(d.client.receiveMessage).not.toHaveBeenCalled();
  });

  it('with autoReceive=false, records metadata only and never performs the receiving read', async () => {
    const d = makeDeps([], { autoReceive: false });
    const poller = new MailboxPollerService(d as never);
    await poller.pollOnce();
    expect(d.created).toHaveLength(1);
    expect(d.created[0].bodyText).toBeUndefined();     // no body persisted
    expect(d.client.receiveMessage).not.toHaveBeenCalled(); // no legal receipt
    expect(d.onNewLetter).toHaveBeenCalledWith('u1', 'L1'); // still alerts on metadata
  });
});
