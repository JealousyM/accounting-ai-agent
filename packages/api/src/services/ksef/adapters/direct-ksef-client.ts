/**
 * DirectKSeFClient — KSeF 2.0 API Client
 *
 * Low-level HTTP client for direct communication with the KSeF v2 API.
 * Implements JWT Bearer authentication, AES-256-CBC invoice encryption,
 * and RSA-OAEP key exchange required by KSeF 2.0.
 *
 * Follows the existing project patterns: retry logic, interceptors, error mapping.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';
import https from 'https';
import { logger } from '../../../utils/logger';
import {
  KSeFAuthenticationError,
  KSeFConnectionError,
  KSeFSessionExpiredError,
  KSeFValidationError,
  KSeFEncryptionError,
  KSeFError,
} from '../errors';
import { KSeFEnvironment } from '../../../types/ksef.types';
import {
  generateAESKey,
  generateIV,
  encryptInvoiceXml,
  encryptKSeFToken,
  encryptSessionKey,
} from '../crypto';

// ============================================
// CONFIGURATION
// ============================================

export interface DirectKSeFClientConfig {
  environment: KSeFEnvironment;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

const KSEF_URLS: Record<KSeFEnvironment, string> = {
  test: 'https://api-test.ksef.mf.gov.pl/v2',
  demo: 'https://api-demo.ksef.mf.gov.pl/v2',
  production: 'https://api.ksef.mf.gov.pl/v2',
};

// ============================================
// SESSION STATE
// ============================================

interface KSeFV2Session {
  /** JWT Bearer token from authentication */
  jwt: string;
  /** Session reference number (used in API paths) */
  sessionRef: string;
  /** AES-256 key for invoice encryption in this session */
  aesKey: Buffer;
  /** AES-CBC initialization vector */
  iv: Buffer;
  /** Session expiry (typically 12 hours from open) */
  validUntil: Date;
}

// ============================================
// DIRECT KSEF CLIENT
// ============================================

export class DirectKSeFClient {
  private readonly apiClient: AxiosInstance;
  private readonly config: Required<DirectKSeFClientConfig>;
  private session?: KSeFV2Session;
  private publicKeys?: {
    tokenEncryption: string;
    symmetricKeyEncryption: string;
  };

  constructor(config: DirectKSeFClientConfig) {
    this.config = {
      timeout: 30000,
      maxRetries: 0,
      retryDelay: 1000,
      ...config,
    };

    this.apiClient = axios.create({
      baseURL: KSEF_URLS[config.environment],
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: true,
      }),
    });

    this.setupInterceptors();

    logger.info('DirectKSeFClient initialized (v2)', {
      environment: config.environment,
      baseURL: KSEF_URLS[config.environment],
    });
  }

  // ============================================
  // PUBLIC KEY
  // ============================================

  /**
   * Fetch KSeF public key certificates by usage.
   * GET /security/public-key-certificates
   *
   * KSeF 2.0 returns two certificates with different usages:
   * - KsefTokenEncryption: for encrypting auth tokens
   * - SymmetricKeyEncryption: for encrypting AES session keys
   */
  private async fetchPublicKeys(): Promise<{
    tokenEncryption: string;
    symmetricKeyEncryption: string;
  }> {
    if (this.publicKeys) return this.publicKeys;

    logger.info('Fetching KSeF public key certificates');

    try {
      const response = await this.withRetry(() =>
        this.apiClient.get('/security/public-key-certificates'),
      );

      const certs: Array<{ certificate: string; usage: string[] }> = response.data;

      logger.debug('KSeF certificates response', {
        count: certs.length,
        usages: certs.map((c) => c.usage),
      });

      const tokenCert = certs.find((c) => c.usage?.includes('KsefTokenEncryption'));
      const sessionCert = certs.find((c) => c.usage?.includes('SymmetricKeyEncryption'));

      if (!tokenCert || !sessionCert) {
        throw new KSeFEncryptionError(
          `Missing required certificates. Found usages: ${certs.map((c) => c.usage).join(', ')}`,
          { availableUsages: certs.map((c) => c.usage) },
        );
      }

      this.publicKeys = {
        tokenEncryption: this.extractPublicKey(tokenCert),
        symmetricKeyEncryption: this.extractPublicKey(sessionCert),
      };

      logger.info('KSeF public key certificates fetched and cached', {
        tokenCertUsage: tokenCert.usage,
        sessionCertUsage: sessionCert.usage,
      });

      return this.publicKeys;
    } catch (error) {
      if (error instanceof KSeFError) throw error;
      logger.error('Failed to fetch KSeF public key certificates', { error });
      throw this.handleApiError(error as AxiosError);
    }
  }

  /** @deprecated Use fetchPublicKeys() instead */
  async fetchPublicKey(): Promise<string> {
    const keys = await this.fetchPublicKeys();
    return keys.tokenEncryption;
  }

  // ============================================
  // AUTHENTICATION
  // ============================================

  /**
   * Get an authorization challenge from KSeF.
   * POST /auth/challenge
   *
   * Returns the challenge string and the server timestamp converted to Unix ms.
   * The timestamp may be returned as an ISO 8601 string or a number.
   */
  private async getChallenge(nip: string): Promise<{
    challenge: string;
    timestamp: number;
  }> {
    logger.debug('Requesting KSeF auth challenge', { nip });

    const response = await this.withRetry(() =>
      this.apiClient.post('/auth/challenge', {
        contextIdentifier: {
          type: 'nip',
          value: nip,
        },
      }),
    );

    const rawTimestamp = response.data.timestamp;
    let timestampMs: number;

    if (typeof rawTimestamp === 'string') {
      // ISO 8601 DateTimeOffset → convert to Unix milliseconds
      timestampMs = new Date(rawTimestamp).getTime();
    } else if (typeof rawTimestamp === 'number') {
      // If already a number, check if it's seconds or milliseconds
      // Unix seconds are < 10^10, Unix ms are > 10^12
      timestampMs = rawTimestamp < 1e11 ? rawTimestamp * 1000 : rawTimestamp;
    } else {
      throw new KSeFAuthenticationError(
        `Unexpected timestamp format from KSeF challenge: ${typeof rawTimestamp}`,
        response.data,
      );
    }

    logger.debug('KSeF challenge received', {
      challenge: response.data.challenge,
      rawTimestamp,
      rawTimestampType: typeof rawTimestamp,
      timestampMs,
    });

    return {
      challenge: response.data.challenge,
      timestamp: timestampMs,
    };
  }

  /**
   * Authenticate with a KSeF authorization token.
   *
   * KSeF 2.0 token-based auth is a three-step process:
   *   Step 1: POST /auth/ksef-token     → authenticationToken + referenceNumber
   *   Step 2: GET  /auth/{refNo}        → poll until auth status == 200 (complete)
   *   Step 3: POST /auth/token/redeem   → accessToken (long-lived, used for all API calls)
   */
  private async authenticateWithToken(
    nip: string,
    authToken: string,
  ): Promise<{
    jwt: string;
    referenceNumber: string;
  }> {
    logger.info('Authenticating with KSeF token', { nip });

    const { tokenEncryption: publicKey } = await this.fetchPublicKeys();
    const { challenge, timestamp } = await this.getChallenge(nip);

    logger.debug('Encrypting KSeF token', {
      tokenPreview: authToken.substring(0, 10) + '...',
      timestamp,
      encryptPayload: `${authToken.substring(0, 10)}...|${timestamp}`,
    });

    const encryptedToken = encryptKSeFToken(authToken, timestamp, publicKey);
    logger.debug('Token encrypted successfully', {
      encryptedTokenLength: encryptedToken.length,
    });

    // Step 1: POST /auth/ksef-token → authenticationToken (temporary)
    const authResponse = await this.withRetry(() =>
      this.apiClient.post('/auth/ksef-token', {
        challenge,
        contextIdentifier: {
          type: 'nip',
          value: nip,
        },
        encryptedToken,
      }),
    );

    logger.debug('KSeF /auth/ksef-token response', {
      keys: Object.keys(authResponse.data),
      preview: JSON.stringify(authResponse.data).substring(0, 500),
    });

    const authenticationToken =
      authResponse.data.authenticationToken?.token ||
      authResponse.data.token;
    const referenceNumber =
      authResponse.data.authenticationToken?.referenceNumber ||
      authResponse.data.referenceNumber;

    if (!authenticationToken) {
      logger.error('No authenticationToken from KSeF /auth/ksef-token', {
        keys: Object.keys(authResponse.data),
        preview: JSON.stringify(authResponse.data).substring(0, 500),
      });
      throw new KSeFAuthenticationError(
        'No authentication token received from KSeF',
        authResponse.data,
      );
    }

    logger.info('KSeF ksef-token step succeeded', {
      referenceNumber,
      authTokenPreview: authenticationToken.substring(0, 30) + '...',
    });

    // Step 2: GET /auth/{referenceNumber} → poll until auth is complete
    await this.waitForAuthReady(referenceNumber, authenticationToken);

    // Step 3: POST /auth/token/redeem → accessToken (final, long-lived)
    const redeemResponse = await this.apiClient.post(
      '/auth/token/redeem',
      null,
      { headers: { Authorization: `Bearer ${authenticationToken}` } },
    );

    logger.debug('KSeF /auth/token/redeem response', {
      status: redeemResponse.status,
      keys: Object.keys(redeemResponse.data),
      preview: JSON.stringify(redeemResponse.data).substring(0, 500),
    });

    const accessToken =
      redeemResponse.data.accessToken?.token ||
      redeemResponse.data.accessToken ||
      redeemResponse.data.token ||
      redeemResponse.data.authenticationToken?.token;

    if (!accessToken) {
      logger.error('No accessToken from KSeF /auth/token/redeem', {
        keys: Object.keys(redeemResponse.data),
        preview: JSON.stringify(redeemResponse.data).substring(0, 500),
      });
      throw new KSeFAuthenticationError(
        'No access token received from KSeF token/redeem',
        redeemResponse.data,
      );
    }

    logger.info('KSeF authentication complete, accessToken obtained', {
      referenceNumber,
      accessTokenPreview: accessToken.substring(0, 30) + '...',
    });

    return { jwt: accessToken, referenceNumber };
  }

  /**
   * Poll GET /auth/{referenceNumber} until auth verification completes.
   * Response format: { status: { code: 200|300|450, description: "..." } }
   * Status 200 = success, 450 = permanent failure, other = in progress.
   */
  private async waitForAuthReady(
    referenceNumber: string,
    authToken: string,
    maxAttempts = 10,
    intervalMs = 2000,
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.apiClient.get(
          `/auth/${referenceNumber}`,
          { headers: { Authorization: `Bearer ${authToken}` } },
        );

        // Extract numeric status code from nested { status: { code: N } }
        const status = response.data.status;
        const statusCode: number =
          (typeof status === 'object' && status !== null ? status.code : undefined) ||
          response.data.authenticationStatusCode ||
          response.data.statusCode ||
          response.status;
        const statusDescription: string =
          (typeof status === 'object' && status !== null ? status.description : undefined) ||
          response.data.authenticationStatusDescription ||
          '';
        const statusDetails: string[] =
          (typeof status === 'object' && status !== null ? status.details : undefined) || [];

        logger.debug('KSeF auth status poll', {
          attempt,
          statusCode,
          statusDescription,
          statusDetails,
        });

        if (statusCode === 200) {
          logger.info('KSeF auth verification complete (status 200)', {
            referenceNumber,
            attempt,
          });
          return;
        }

        if (statusCode === 450) {
          const detailMsg = statusDetails.length > 0
            ? statusDetails.join('; ')
            : statusDescription;
          throw new KSeFAuthenticationError(
            `KSeF authentication failed (status 450): ${detailMsg}`,
            response.data,
          );
        }

        // Status still in progress (e.g. 300) — wait and retry
        logger.debug('KSeF auth still processing, waiting...', {
          statusCode,
          attempt,
          nextPollMs: intervalMs,
        });
      } catch (error) {
        if (error instanceof KSeFError) throw error;

        // Network/HTTP error on polling — log and retry
        logger.warn('KSeF auth status poll failed', {
          attempt,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    throw new KSeFAuthenticationError(
      `KSeF auth verification timed out after ${maxAttempts} attempts`,
      { referenceNumber },
    );
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * Open an interactive session using token-based auth.
   *
   * Steps:
   * 1. Authenticate with KSeF token → get JWT
   * 2. Generate AES key + IV for invoice encryption
   * 3. Encrypt AES key with KSeF's RSA public key
   * 4. POST /sessions/online to open the session
   */
  async openSessionWithToken(
    nip: string,
    authToken: string,
  ): Promise<{
    sessionToken: string;
    referenceNumber: string;
    expiresAt: Date;
  }> {
    logger.info('Opening KSeF v2 session with token auth', { nip });

    try {
      // Step 1: Authenticate to get JWT
      const { jwt } = await this.authenticateWithToken(nip, authToken);

      // Step 2: Generate session encryption keys
      const aesKey = generateAESKey();
      const iv = generateIV();
      const { symmetricKeyEncryption: sessionPublicKey } = await this.fetchPublicKeys();
      const encryptedSymmetricKey = encryptSessionKey(aesKey, sessionPublicKey);

      // Step 3: Open session
      const response = await this.withRetry(() =>
        this.apiClient.post(
          '/sessions/online',
          {
            formCode: {
              systemCode: 'FA (3)',
              schemaVersion: '1-0E',
              value: 'FA',
            },
            encryption: {
              encryptedSymmetricKey,
              initializationVector: iv.toString('base64'),
            },
          },
          {
            headers: { Authorization: `Bearer ${jwt}` },
          },
        ),
      );

      logger.debug('KSeF session open response', {
        keys: Object.keys(response.data),
        preview: JSON.stringify(response.data).substring(0, 500),
      });

      const sessionRef = response.data.referenceNumber;
      const validUntil = response.data.validUntil
        ? new Date(response.data.validUntil)
        : new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours default

      this.session = {
        jwt,
        sessionRef,
        aesKey,
        iv,
        validUntil,
      };

      logger.info('KSeF v2 session opened', {
        sessionRef,
        validUntil: validUntil.toISOString(),
      });

      return {
        sessionToken: jwt,
        referenceNumber: sessionRef,
        expiresAt: validUntil,
      };
    } catch (error) {
      logger.error('Failed to open KSeF v2 session with token', {
        error: error instanceof Error ? { message: error.message, name: error.name, stack: error.stack } : error,
        nip,
      });
      if (error instanceof KSeFError) throw error;
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Open an interactive session with a signed certificate (XAdES).
   * POST /auth/xades-signature → JWT, then POST /sessions/online.
   */
  async openSession(signedInitToken: string): Promise<{
    sessionToken: string;
    referenceNumber: string;
    expiresAt: Date;
  }> {
    logger.info('Opening KSeF v2 session with certificate auth');

    try {
      // Step 1: Authenticate with XAdES signature
      const authResponse = await this.withRetry(() =>
        this.apiClient.post('/auth/xades-signature', signedInitToken, {
          headers: { 'Content-Type': 'application/octet-stream' },
        }),
      );

      const jwt =
        authResponse.data.authenticationToken?.token ||
        authResponse.data.token;

      // Step 2: Open session with encryption keys
      const { symmetricKeyEncryption: sessionPublicKey } = await this.fetchPublicKeys();
      const aesKey = generateAESKey();
      const iv = generateIV();
      const encryptedSymmetricKey = encryptSessionKey(aesKey, sessionPublicKey);

      const response = await this.withRetry(() =>
        this.apiClient.post(
          '/sessions/online',
          {
            formCode: {
              systemCode: 'FA (3)',
              schemaVersion: '1-0E',
              value: 'FA',
            },
            encryption: {
              encryptedSymmetricKey,
              initializationVector: iv.toString('base64'),
            },
          },
          {
            headers: { Authorization: `Bearer ${jwt}` },
          },
        ),
      );

      const sessionRef = response.data.referenceNumber;
      const validUntil = response.data.validUntil
        ? new Date(response.data.validUntil)
        : new Date(Date.now() + 12 * 60 * 60 * 1000);

      this.session = { jwt, sessionRef, aesKey, iv, validUntil };

      logger.info('KSeF v2 session opened (certificate)', {
        sessionRef,
        validUntil: validUntil.toISOString(),
      });

      return {
        sessionToken: jwt,
        referenceNumber: sessionRef,
        expiresAt: validUntil,
      };
    } catch (error) {
      logger.error('Failed to open KSeF v2 session with certificate', {
        error,
      });
      if (error instanceof KSeFError) throw error;
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Close the active KSeF session.
   * POST /sessions/online/{sessionRef}/close
   * Clears the local session even if the remote close fails.
   */
  async closeSession(): Promise<void> {
    if (!this.session) return;

    logger.info('Closing KSeF v2 session', {
      sessionRef: this.session.sessionRef,
    });

    try {
      await this.apiClient.post(
        `/sessions/online/${this.session.sessionRef}/close`,
        null,
        { headers: this.getAuthHeaders() },
      );
      this.clearSession();
      logger.info('KSeF v2 session closed');
    } catch (error) {
      logger.warn(
        'Failed to close KSeF v2 session (session will expire on its own)',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );
      this.clearSession();
    }
  }

  setSessionToken(_token: string): void {
    // Compatibility — no-op in v2 (session is managed internally)
    logger.debug('setSessionToken called (no-op in v2)');
  }

  getSessionToken(): string | undefined {
    return this.session?.jwt;
  }

  getSessionRef(): string | undefined {
    return this.session?.sessionRef;
  }

  clearSession(): void {
    this.session = undefined;
  }


  // ============================================
  // INVOICE OPERATIONS
  // ============================================

  /**
   * Send an invoice (FA(3) XML) to KSeF.
   * POST /sessions/online/{sessionRef}/invoices
   *
   * KSeF v2 expects a JSON body with the encrypted invoice as base64,
   * along with SHA-256 hashes (base64-encoded) of both plaintext and encrypted data.
   */
  async sendInvoice(invoiceXml: string): Promise<{
    elementReferenceNumber: string;
    processingCode: number;
  }> {
    this.requireSession();
    logger.info('Sending invoice to KSeF v2');

    try {
      const { encryptedData, fileSize, encryptedFileSize } =
        encryptInvoiceXml(invoiceXml, this.session!.aesKey, this.session!.iv);

      // KSeF v2 requires base64-encoded SHA-256 hashes
      const plaintextHash = crypto
        .createHash('sha256')
        .update(Buffer.from(invoiceXml, 'utf8'))
        .digest('base64');
      const encryptedHash = crypto
        .createHash('sha256')
        .update(encryptedData)
        .digest('base64');

      const requestBody = {
        invoiceHash: plaintextHash,
        invoiceSize: fileSize,
        encryptedInvoiceHash: encryptedHash,
        encryptedInvoiceSize: encryptedFileSize,
        encryptedInvoiceContent: encryptedData.toString('base64'),
        offlineMode: false,
      };

      const response = await this.withRetry(() =>
        this.apiClient.post(
          `/sessions/online/${this.session!.sessionRef}/invoices`,
          requestBody,
          {
            headers: this.getAuthHeaders(),
          },
        ),
      );

      const elementReferenceNumber =
        response.data.elementReferenceNumber ||
        response.data.referenceNumber ||
        response.data.ElementReferenceNumber;
      const processingCode =
        response.data.processingCode ||
        response.data.ProcessingCode ||
        200;

      logger.info('Invoice sent to KSeF v2', {
        elementReferenceNumber,
        processingCode,
      });

      return { elementReferenceNumber, processingCode };
    } catch (error) {
      logger.error('Failed to send invoice to KSeF v2', {
        error: error instanceof Error ? { message: error.message, name: error.name, stack: error.stack } : error,
      });
      if (error instanceof KSeFError) throw error;
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Check the processing status of a submitted invoice.
   * GET /sessions/{sessionRef}/invoices/{invoiceRef}
   *
   * @param invoiceRef - The elementReferenceNumber from sendInvoice
   * @param sessionRef - The session where the invoice was sent.
   *                     Defaults to the current active session.
   *                     Pass an old session ref to check invoices from a previous session.
   */
  async getInvoiceStatus(invoiceRef: string, sessionRef?: string): Promise<{
    processingCode: number;
    processingDescription: string;
    ksefReferenceNumber?: string;
    acquisitionTimestamp?: string;
  }> {
    this.requireSession();
    const ref = sessionRef || this.session!.sessionRef;
    logger.debug('Checking KSeF v2 invoice status', { invoiceRef, sessionRef: ref });

    try {
      const response = await this.withRetry(() =>
        this.apiClient.get(
          `/sessions/${ref}/invoices/${invoiceRef}`,
          { headers: this.getAuthHeaders() },
        ),
      );

      // KSeF v2 returns status as nested object: { status: { code, description, details } }
      const d = response.data;
      const code = d.status?.code ?? d.processingCode ?? d.ProcessingCode ?? 0;
      const desc = d.status?.description ?? d.processingDescription ?? d.ProcessingDescription ?? '';
      const details: string[] = d.status?.details ?? [];

      logger.info('KSeF invoice status result', {
        invoiceRef, sessionRef: ref, code, desc, details,
      });

      return {
        processingCode: code,
        processingDescription: details.length > 0 ? `${desc}: ${details.join('; ')}` : desc,
        ksefReferenceNumber:
          d.ksefReferenceNumber || d.KsefReferenceNumber,
        acquisitionTimestamp:
          d.acquisitionTimestamp || d.AcquisitionTimestamp,
      };
    } catch (error) {
      if (error instanceof KSeFError) throw error;
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Get the status of a session (including its invoices).
   * GET /sessions/{sessionRef}
   *
   * Works for any session (current or closed) — uses auth JWT from current session.
   */
  async getSessionStatus(sessionRef: string): Promise<{
    processingCode: number;
    processingDescription: string;
    invoiceCount?: number;
    failedInvoiceCount?: number;
  }> {
    this.requireSession();
    logger.debug('Checking KSeF v2 session status', { sessionRef });

    try {
      const response = await this.withRetry(() =>
        this.apiClient.get(
          `/sessions/${sessionRef}`,
          { headers: this.getAuthHeaders() },
        ),
      );

      // KSeF v2 returns: { status: { code, description }, invoiceCount, failedInvoiceCount, ... }
      const d = response.data;
      const code = d.status?.code ?? d.processingCode ?? d.ProcessingCode ?? 0;
      const desc = d.status?.description ?? d.processingDescription ?? d.ProcessingDescription ?? '';

      logger.info('KSeF session status result', {
        sessionRef, code, desc,
        invoiceCount: d.invoiceCount,
        failedInvoiceCount: d.failedInvoiceCount,
      });

      return {
        processingCode: code,
        processingDescription: desc,
        invoiceCount: d.invoiceCount,
        failedInvoiceCount: d.failedInvoiceCount,
      };
    } catch (error) {
      if (error instanceof KSeFError) throw error;
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Download UPO (Urzedowe Poswiadczenie Odbioru) for an invoice.
   *
   * KSeF v2 endpoints for UPO:
   *   GET /sessions/{sessionRef}/invoices/{invoiceRef}/upo
   *   GET /sessions/{sessionRef}/invoices/ksef/{ksefNumber}/upo
   *
   * UPO is available after session close and successful invoice processing.
   *
   * @param sessionRef - The session reference where the invoice was sent
   * @param invoiceRef - The invoice element reference number (EE number)
   */
  async downloadUPO(sessionRef: string, invoiceRef: string): Promise<Buffer> {
    this.requireSession();
    logger.info('Downloading UPO from KSeF v2', { sessionRef, invoiceRef });

    try {
      const response = await this.withRetry(() =>
        this.apiClient.get(
          `/sessions/${sessionRef}/invoices/${invoiceRef}/upo`,
          {
            headers: this.getAuthHeaders(),
            responseType: 'arraybuffer',
          },
        ),
      );

      return Buffer.from(response.data);
    } catch (error) {
      if (error instanceof KSeFError) throw error;
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Download invoice XML content from KSeF.
   * GET /invoices/ksef/{ksefReferenceNumber}
   *
   * @param ksefReferenceNumber - The KSeF reference number (EE number)
   */
  async downloadInvoice(ksefReferenceNumber: string): Promise<Buffer> {
    this.requireSession();
    logger.info('Downloading invoice from KSeF v2', { ksefReferenceNumber });

    try {
      const response = await this.withRetry(() =>
        this.apiClient.get(
          `/invoices/ksef/${ksefReferenceNumber}`,
          {
            headers: this.getAuthHeaders(),
            responseType: 'arraybuffer',
          },
        ),
      );

      return Buffer.from(response.data);
    } catch (error) {
      if (error instanceof KSeFError) throw error;
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Query invoices in KSeF.
   * POST /invoices/query/metadata
   */
  async queryInvoices(params: {
    subjectType: 'subject1' | 'subject2';
    dateFrom: string;
    dateTo: string;
    dateType?: 'issue' | 'acquisition';
    pageSize?: number;
    pageOffset?: number;
  }): Promise<any> {
    this.requireSession();
    logger.info('Querying KSeF v2 invoices', {
      subjectType: params.subjectType,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    });

    try {
      const response = await this.withRetry(() =>
        this.apiClient.post(
          '/invoices/query/metadata',
          {
            subjectType: params.subjectType,
            dateRange: {
              dateType: params.dateType || 'issue',
              from: params.dateFrom,
              to: params.dateTo,
            },
            pageSize: params.pageSize || 100,
            pageOffset: params.pageOffset || 0,
          },
          { headers: this.getAuthHeaders() },
        ),
      );

      return response.data;
    } catch (error) {
      if (error instanceof KSeFError) throw error;
      throw this.handleApiError(error as AxiosError);
    }
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Extract a usable PEM public key from the KSeF API response.
   * Handles: PEM string, Base64-encoded DER, certificate PEM, nested JSON objects.
   */
  private extractPublicKey(data: any): string {
    // Case 1: Direct PEM string
    if (typeof data === 'string') {
      if (data.includes('BEGIN')) return data;
      // Might be Base64-encoded DER — wrap it
      return `-----BEGIN PUBLIC KEY-----\n${data}\n-----END PUBLIC KEY-----`;
    }

    // Case 2: Binary response (Buffer/ArrayBuffer)
    if (Buffer.isBuffer(data)) {
      const b64 = data.toString('base64');
      return `-----BEGIN PUBLIC KEY-----\n${b64}\n-----END PUBLIC KEY-----`;
    }
    if (data instanceof ArrayBuffer) {
      const b64 = Buffer.from(new Uint8Array(data)).toString('base64');
      return `-----BEGIN PUBLIC KEY-----\n${b64}\n-----END PUBLIC KEY-----`;
    }

    // Case 3: JSON object — try known field names
    if (typeof data === 'object' && data !== null) {
      // Direct key fields
      const rawKey =
        data.publicKey ||
        data.pem ||
        data.key ||
        data.certificate ||
        data.cert;

      if (rawKey && typeof rawKey === 'string') {
        if (rawKey.includes('BEGIN')) return rawKey;
        return `-----BEGIN PUBLIC KEY-----\n${rawKey}\n-----END PUBLIC KEY-----`;
      }

      // Array of certificates
      const certs = data.certificates || data.keys || data.items;
      if (Array.isArray(certs) && certs.length > 0) {
        return this.extractPublicKey(certs[0]);
      }

      // Top-level array
      if (Array.isArray(data) && data.length > 0) {
        return this.extractPublicKey(data[0]);
      }
    }

    throw new KSeFEncryptionError(
      'Unable to extract public key from KSeF response',
      {
        responseType: typeof data,
        keys: typeof data === 'object' && data !== null ? Object.keys(data) : undefined,
      },
    );
  }

  /**
   * Ensure an active session exists before making authenticated calls.
   */
  private requireSession(): void {
    if (!this.session) {
      throw new KSeFSessionExpiredError(
        'No active KSeF session. Please open a session first.',
      );
    }
  }

  /**
   * Build Bearer auth headers for the session JWT.
   */
  private getAuthHeaders(): Record<string, string> {
    return { Authorization: `Bearer ${this.session!.jwt}` };
  }

  /**
   * Authenticate and obtain an accessToken (JWT) WITHOUT opening an interactive session.
   * In KSeF 2.0, authentication is decoupled from sessions — the JWT can be used
   * to call data endpoints (session status, UPO download, invoice retrieval) directly.
   */
  async authenticate(nip: string, authToken: string): Promise<string> {
    const { jwt } = await this.authenticateWithToken(nip, authToken);
    return jwt;
  }

  /**
   * Download UPO using only a JWT (no interactive session required).
   * This is needed because UPO belongs to a closed session, and opening a new
   * interactive session does not grant access to the old session's UPO.
   *
   * KSeF 2.0 provides two UPO endpoints:
   *   - GET /sessions/{sessionRef}/invoices/{elementRef}/upo        — by element reference number
   *   - GET /sessions/{sessionRef}/invoices/ksef/{ksefNumber}/upo   — by KSeF number (NIP-DATE-XX)
   *
   * We detect which one to use based on the format: KSeF numbers match /^\d{10}-\d{8}-/.
   */
  async downloadUPOWithToken(
    jwt: string,
    sessionRef: string,
    invoiceRef: string,
  ): Promise<Buffer> {
    // KSeF number format: 10-digit NIP, dash, 8-digit date, dash, rest
    const isKsefNumber = /^\d{10}-\d{8}-/.test(invoiceRef);
    const path = isKsefNumber
      ? `/sessions/${sessionRef}/invoices/ksef/${invoiceRef}/upo`
      : `/sessions/${sessionRef}/invoices/${invoiceRef}/upo`;

    logger.info('Downloading UPO from KSeF v2 (token-only, no session)', {
      sessionRef, invoiceRef, isKsefNumber, path,
    });

    try {
      const response = await this.withRetry(() =>
        this.apiClient.get(path, {
          headers: { Authorization: `Bearer ${jwt}` },
          responseType: 'arraybuffer',
        }),
      );

      return Buffer.from(response.data);
    } catch (error) {
      if (error instanceof KSeFError) throw error;
      throw this.handleApiError(error as AxiosError);
    }
  }

  /**
   * Execute an operation with retry logic and exponential backoff.
   * Does not retry authentication (401/403) or validation (400/422) errors.
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    const maxRetries = this.config.maxRetries;
    const baseDelay = this.config.retryDelay;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        const axiosError = error as AxiosError;

        // Don't retry on auth or validation errors
        if (axiosError.response) {
          const status = axiosError.response.status;
          if (
            status === 401 ||
            status === 403 ||
            status === 400 ||
            status === 422
          ) {
            throw error;
          }
        }

        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          logger.warn('KSeF v2 API request failed, retrying', {
            attempt: attempt + 1,
            maxRetries,
            delayMs: delay,
            error: lastError.message,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Setup request/response interceptors for logging.
   */
  private setupInterceptors(): void {
    this.apiClient.interceptors.request.use(
      (config) => {
        logger.debug('KSeF v2 API request', {
          method: config.method?.toUpperCase(),
          url: config.url,
        });
        return config;
      },
      (error) => {
        logger.error('KSeF v2 API request setup error', {
          error: error.message,
        });
        return Promise.reject(error);
      },
    );

    this.apiClient.interceptors.response.use(
      (response) => {
        logger.debug('KSeF v2 API response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        logger.error('KSeF v2 API response error', {
          message: error.message,
          status: error.response?.status,
        });
        return Promise.reject(error);
      },
    );
  }

  /**
   * Map AxiosError to the appropriate KSeF error class.
   * KSeF v2 uses { errorCode, errorDescription } response format.
   */
  private handleApiError(error: AxiosError): Error {
    if (error.response) {
      const status = error.response.status;
      let data = error.response.data as any;

      // When responseType is 'arraybuffer', error responses come as Buffer/ArrayBuffer
      // instead of parsed JSON — decode them first
      if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
        const text = Buffer.isBuffer(data)
          ? data.toString('utf-8')
          : Buffer.from(data).toString('utf-8');
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      logger.debug('KSeF API error response', {
        status,
        url: error.config?.url,
        responseData: typeof data === 'string' ? data : JSON.stringify(data),
      });

      // v2 error format — try multiple known shapes
      const errorDescription =
        data?.errorDescription ||
        data?.message ||
        data?.exception?.exceptionDetailList?.[0]?.exceptionDescription ||
        data?.Exception?.ExceptionDetailList?.[0]?.ExceptionDescription ||
        (typeof data === 'string' ? data : undefined) ||
        'Unknown error';

      if (status === 401 || status === 403) {
        return new KSeFAuthenticationError(errorDescription, data);
      }

      if (status === 400 || status === 422) {
        return new KSeFValidationError(errorDescription, data);
      }

      if (status >= 500) {
        return new KSeFConnectionError('KSeF server error', data);
      }

      return new KSeFError(
        'KSEF_API_ERROR',
        `KSeF API error (${status}): ${errorDescription}`,
        data,
        status,
      );
    }

    if (error.request) {
      return new KSeFConnectionError('No response from KSeF API');
    }

    return new KSeFError(
      'KSEF_REQUEST_ERROR',
      'Failed to setup KSeF API request',
    );
  }
}
