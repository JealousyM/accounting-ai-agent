import { EDoreczeniaConfigService } from '../config.service';

const crypto = {
  encryptToString: (s: string) => `enc(${s})`,
  decryptFromString: (s: string) => s.replace(/^enc\(/, '').replace(/\)$/, ''),
} as never;
const certService = { parseCertificateExpiry: () => new Date('2027-01-01T00:00:00Z') } as never;

describe('EDoreczeniaConfigService', () => {
  it('storeCertificate encrypts, sets expiry, and activates', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = { eDoreczeniaConfig: { update } } as never;
    const svc = new EDoreczeniaConfigService(prisma, crypto, certService);
    await svc.storeCertificate('u1', 'CERTPEM');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'u1' },
      data: expect.objectContaining({ certificateEnc: 'enc(CERTPEM)', status: 'active', certExpiresAt: new Date('2027-01-01T00:00:00Z') }),
    }));
  });

  it('getActiveConfigs decrypts key + cert for each active row', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { id: 'c1', userId: 'u1', adeAddress: 'ADE', environment: 'int', autoReceive: true, certificateEnc: 'enc(CERT)', privateKeyEnc: 'enc(KEY)' },
    ]);
    const prisma = { eDoreczeniaConfig: { findMany } } as never;
    const svc = new EDoreczeniaConfigService(prisma, crypto, certService);
    const out = await svc.getActiveConfigs();
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'active' } }));
    expect(out[0]).toMatchObject({ userId: 'u1', certPem: 'CERT', privateKeyPem: 'KEY', autoReceive: true });
  });
});
