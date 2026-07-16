import { EDoreczeniaCertificateService } from '../certificate.service';
import forge from 'node-forge';

describe('EDoreczeniaCertificateService', () => {
  const svc = new EDoreczeniaCertificateService();

  it('generates a private key and a valid PKCS#10 CSR carrying the CN', () => {
    const { privateKeyPem, csrPem } = svc.generateKeyPairAndCsr({ commonName: 'ADE-PL-12345' });
    expect(privateKeyPem).toContain('BEGIN RSA PRIVATE KEY');
    expect(csrPem).toContain('BEGIN CERTIFICATE REQUEST');
    const csr = forge.pki.certificationRequestFromPem(csrPem);
    expect(csr.verify()).toBe(true);
    const cn = csr.subject.getField('CN');
    expect(cn.value).toBe('ADE-PL-12345');
  });

  it('parses certificate expiry from a PEM cert', () => {
    // Build a short-lived self-signed cert to parse.
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.validity.notBefore = new Date('2026-01-01T00:00:00Z');
    cert.validity.notAfter = new Date('2027-01-01T00:00:00Z');
    cert.setSubject([{ name: 'commonName', value: 'x' }]);
    cert.setIssuer([{ name: 'commonName', value: 'x' }]);
    cert.sign(keys.privateKey);
    const pem = forge.pki.certificateToPem(cert);
    expect(svc.parseCertificateExpiry(pem).toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});
