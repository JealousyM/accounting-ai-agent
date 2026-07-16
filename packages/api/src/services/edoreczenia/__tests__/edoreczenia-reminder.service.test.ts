import { EDoreczeniaReminderService } from '../edoreczenia-reminder.service';

jest.mock('../../../lib/redis', () => ({ redis: { get: jest.fn(), setEx: jest.fn() } }));
jest.mock('../../../lib/prisma', () => ({ prisma: { eDoreczeniaLetter: { findFirst: jest.fn() }, telegramLink: { findUnique: jest.fn() }, eDoreczeniaDeadline: { findMany: jest.fn() } } }));

import { prisma } from '../../../lib/prisma';

describe('EDoreczeniaReminderService.alertNewLetter', () => {
  const sendProactiveMessage = jest.fn().mockResolvedValue(undefined);
  const telegram = { isInitialized: () => true, sendProactiveMessage } as never;
  const svc = new EDoreczeniaReminderService(telegram);

  beforeEach(() => { jest.clearAllMocks(); });

  it('DMs the linked user a localized alert for a new letter', async () => {
    (prisma.eDoreczeniaLetter.findFirst as jest.Mock).mockResolvedValue({
      id: 'L1', senderName: 'Urząd Skarbowy', subject: 'Wezwanie',
      analysis: { severity: 'high', requiredAction: 'Złóż wyjaśnienia' },
      user: { locale: 'pl' },
    });
    (prisma.telegramLink.findUnique as jest.Mock).mockResolvedValue({ telegramUserId: 'tg1' });
    await svc.alertNewLetter('u1', 'L1');
    expect(sendProactiveMessage).toHaveBeenCalledWith('tg1', expect.stringContaining('Urząd Skarbowy'));
  });

  it('does nothing when the user has no Telegram link', async () => {
    (prisma.eDoreczeniaLetter.findFirst as jest.Mock).mockResolvedValue({ id: 'L1', user: { locale: 'pl' }, analysis: null });
    (prisma.telegramLink.findUnique as jest.Mock).mockResolvedValue(null);
    await svc.alertNewLetter('u1', 'L1');
    expect(sendProactiveMessage).not.toHaveBeenCalled();
  });
});
