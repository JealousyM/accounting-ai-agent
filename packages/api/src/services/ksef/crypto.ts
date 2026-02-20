/**
 * KSeF v2 Encryption Utilities
 *
 * Provides AES-256-CBC and RSA-OAEP encryption required by the KSeF 2.0 API:
 * - Invoice XML is encrypted with AES-256-CBC before submission
 * - The AES session key is encrypted with RSA-OAEP using KSeF's public key
 * - KSeF authorization tokens are encrypted with RSA-OAEP for token-based auth
 *
 * Uses Node.js built-in crypto module — no external dependencies.
 */

import crypto from 'crypto';

/**
 * Generate a random 256-bit AES key (32 bytes).
 */
export function generateAESKey(): Buffer {
  return crypto.randomBytes(32);
}

/**
 * Generate a random 128-bit IV for AES-CBC (16 bytes).
 */
export function generateIV(): Buffer {
  return crypto.randomBytes(16);
}

/**
 * Encrypt invoice XML with AES-256-CBC.
 *
 * Returns the encrypted data along with metadata needed by the KSeF API:
 * - documentHashCode: SHA256 hex hash of the plaintext XML
 * - fileSize: byte length of the plaintext XML (UTF-8)
 * - encryptedData: AES-256-CBC encrypted buffer (PKCS7 padding)
 * - encryptedFileSize: byte length of the encrypted buffer
 */
export function encryptInvoiceXml(
  xml: string,
  aesKey: Buffer,
  iv: Buffer,
): {
  encryptedData: Buffer;
  documentHashCode: string;
  fileSize: number;
  encryptedFileSize: number;
} {
  const plaintext = Buffer.from(xml, 'utf8');

  const documentHashCode = crypto
    .createHash('sha256')
    .update(plaintext)
    .digest('hex');

  const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  return {
    encryptedData: encrypted,
    documentHashCode,
    fileSize: plaintext.length,
    encryptedFileSize: encrypted.length,
  };
}

/**
 * Parse a PEM string into a KeyObject suitable for encryption.
 * Handles both "BEGIN PUBLIC KEY" (SPKI) and "BEGIN CERTIFICATE" (X.509).
 */
function parsePublicKey(pem: string): crypto.KeyObject {
  // Try direct parsing first (works for SPKI public keys)
  try {
    return crypto.createPublicKey({ key: pem, format: 'pem' });
  } catch {
    // Falls through to certificate parsing
  }

  // Try as X.509 certificate — extract public key from it
  try {
    const cert = new crypto.X509Certificate(pem);
    return cert.publicKey;
  } catch {
    // Falls through
  }

  // Try wrapping raw Base64 as a certificate
  const stripped = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s/g, '');
  const certPem = `-----BEGIN CERTIFICATE-----\n${stripped}\n-----END CERTIFICATE-----`;
  try {
    const cert = new crypto.X509Certificate(certPem);
    return cert.publicKey;
  } catch {
    // Falls through
  }

  // Last resort: wrap as public key
  const keyPem = `-----BEGIN PUBLIC KEY-----\n${stripped}\n-----END PUBLIC KEY-----`;
  return crypto.createPublicKey({ key: keyPem, format: 'pem' });
}

/**
 * Encrypt arbitrary data with RSA-OAEP using SHA-256 and MGF1-SHA256.
 * Returns Base64-encoded ciphertext.
 *
 * Accepts PEM public keys, PEM X.509 certificates, or Base64-wrapped DER.
 */
export function rsaOaepEncrypt(data: Buffer, publicKeyPem: string): string {
  const publicKey = parsePublicKey(publicKeyPem);

  const encrypted = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    data,
  );

  return encrypted.toString('base64');
}

/**
 * Encrypt a KSeF authorization token for token-based authentication.
 *
 * KSeF v2 requires: Base64(RSA-OAEP(utf8(token + "|" + timestampMs)))
 */
export function encryptKSeFToken(
  token: string,
  timestampMs: number,
  publicKeyPem: string,
): string {
  const payload = Buffer.from(`${token}|${timestampMs}`, 'utf8');
  return rsaOaepEncrypt(payload, publicKeyPem);
}

/**
 * Encrypt the AES session key with KSeF's RSA public key.
 * Returns Base64-encoded encrypted key for the session open request.
 */
export function encryptSessionKey(
  aesKey: Buffer,
  publicKeyPem: string,
): string {
  return rsaOaepEncrypt(aesKey, publicKeyPem);
}
