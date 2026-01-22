import crypto from 'crypto';
import { logger } from '../utils/logger';

export interface EncryptedData {
  ciphertext: string; // Base64 encoded
  iv: string; // Base64 encoded
  tag: string; // Base64 encoded (auth tag)
}

/**
 * CryptoService provides AES-256-GCM encryption/decryption for sensitive data.
 * Uses the CREDENTIALS_ENCRYPTION_KEY environment variable as the master key.
 */
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 12; // Recommended for GCM
  private readonly tagLength = 16; // 128 bits

  private encryptionKey: Buffer | null = null;

  constructor() {
    this.initializeKey();
  }

  /**
   * Initialize the encryption key from environment variable
   */
  private initializeKey(): void {
    const keyHex = process.env.CREDENTIALS_ENCRYPTION_KEY;

    if (!keyHex) {
      logger.warn('CREDENTIALS_ENCRYPTION_KEY not set - credential encryption disabled');
      return;
    }

    if (keyHex.length !== 64) {
      logger.error('CREDENTIALS_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
      return;
    }

    try {
      this.encryptionKey = Buffer.from(keyHex, 'hex');
      if (this.encryptionKey.length !== this.keyLength) {
        throw new Error('Invalid key length after hex decode');
      }
      logger.info('CryptoService initialized with encryption key');
    } catch (error) {
      logger.error('Failed to initialize encryption key:', error);
      this.encryptionKey = null;
    }
  }

  /**
   * Check if encryption is configured and available
   */
  isConfigured(): boolean {
    return this.encryptionKey !== null;
  }

  /**
   * Encrypt a plaintext string using AES-256-GCM
   * @param plaintext The string to encrypt
   * @returns Encrypted data object with ciphertext, iv, and auth tag
   * @throws Error if encryption is not configured or fails
   */
  encrypt(plaintext: string): EncryptedData {
    if (!this.encryptionKey) {
      throw new Error('Encryption not configured - CREDENTIALS_ENCRYPTION_KEY not set');
    }

    try {
      // Generate a random IV for each encryption
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv, {
        authTagLength: this.tagLength,
      });

      // Encrypt the plaintext
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);

      // Get the authentication tag
      const tag = cipher.getAuthTag();

      return {
        ciphertext: encrypted.toString('base64'),
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
      };
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt an encrypted data object
   * @param data The encrypted data object
   * @returns The decrypted plaintext string
   * @throws Error if decryption fails or data has been tampered with
   */
  decrypt(data: EncryptedData): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption not configured - CREDENTIALS_ENCRYPTION_KEY not set');
    }

    try {
      const ciphertext = Buffer.from(data.ciphertext, 'base64');
      const iv = Buffer.from(data.iv, 'base64');
      const tag = Buffer.from(data.tag, 'base64');

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv, {
        authTagLength: this.tagLength,
      });

      // Set the auth tag for verification
      decipher.setAuthTag(tag);

      // Decrypt
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data - data may be corrupted or tampered with');
    }
  }

  /**
   * Encrypt a string and return as JSON string for database storage
   * @param plaintext The string to encrypt
   * @returns JSON string of encrypted data
   */
  encryptToString(plaintext: string): string {
    const encrypted = this.encrypt(plaintext);
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt a JSON string from database
   * @param encryptedString JSON string of encrypted data
   * @returns Decrypted plaintext
   */
  decryptFromString(encryptedString: string): string {
    const data: EncryptedData = JSON.parse(encryptedString);
    return this.decrypt(data);
  }

  /**
   * Mask a sensitive value for logging (show only last 4 characters)
   * @param value The value to mask
   * @returns Masked string like "****abcd"
   */
  static mask(value: string): string {
    if (!value || value.length <= 4) {
      return '****';
    }
    return '****' + value.slice(-4);
  }
}
