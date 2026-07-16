import forge from 'node-forge';

export interface CsrSubject {
  commonName: string;
  organizationName?: string;
}

/**
 * Generates the RSA keypair and PKCS#10 CSR the user uploads into the
 * e-Doręczenia mailbox Moduł uprawnień. The private key stays server-side
 * (caller encrypts it before persistence); only the CSR is downloaded.
 */
export class EDoreczeniaCertificateService {
  generateKeyPairAndCsr(subject: CsrSubject): { privateKeyPem: string; csrPem: string } {
    const keys = forge.pki.rsa.generateKeyPair(2048);
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = keys.publicKey;

    const attrs: forge.pki.CertificateField[] = [{ name: 'commonName', value: subject.commonName }];
    if (subject.organizationName) {
      attrs.push({ name: 'organizationName', value: subject.organizationName });
    }
    csr.setSubject(attrs);
    csr.sign(keys.privateKey, forge.md.sha256.create());

    return {
      privateKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
      csrPem: forge.pki.certificationRequestToPem(csr),
    };
  }

  parseCertificateExpiry(certPem: string): Date {
    const cert = forge.pki.certificateFromPem(certPem);
    return cert.validity.notAfter;
  }
}
