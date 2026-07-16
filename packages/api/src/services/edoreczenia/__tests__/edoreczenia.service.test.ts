import { EDoreczeniaService } from '../edoreczenia.service';

describe('EDoreczeniaService', () => {
  it('beginOnboarding generates a CSR and stores the encrypted private key', async () => {
    const configService = { storePrivateKeyAndAddress: jest.fn().mockResolvedValue(undefined) } as never;
    const certService = { generateKeyPairAndCsr: jest.fn().mockReturnValue({ privateKeyPem: 'KEY', csrPem: 'CSR' }) } as never;
    const svc = new EDoreczeniaService({ configService, certService, deadlineService: {} as never, prisma: {} as never });
    const out = await svc.beginOnboarding('u1', 'ADE-PL-1');
    expect(out.csrPem).toBe('CSR');
    expect((certService as { generateKeyPairAndCsr: jest.Mock }).generateKeyPairAndCsr).toHaveBeenCalledWith({ commonName: 'ADE-PL-1' });
  });

  it('markLetterDone updates the row scoped to the user', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const svc = new EDoreczeniaService({ configService: {} as never, certService: {} as never, deadlineService: {} as never, prisma: { eDoreczeniaLetter: { updateMany } } as never });
    await svc.markLetterDone('u1', 'L1');
    expect(updateMany).toHaveBeenCalledWith({ where: { id: 'L1', userId: 'u1' }, data: { status: 'done' } });
  });
});
