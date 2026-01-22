import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { logger } from '../utils/logger';
import { CryptoService } from './crypto.service';
import { WFirmaClient } from './wfirma/client';

// ============================================
// TYPES
// ============================================

export interface WFirmaCredentialsInput {
  accessKey: string;
  secretKey: string;
  companyId: string;
}

export interface LLMCredentialsInput {
  provider: 'openai' | 'anthropic';
  apiKey: string;
}

export interface WFirmaCredentials extends WFirmaCredentialsInput {
  appKey: string; // From env, not user-provided
}

export interface LLMCredentials {
  provider: 'openai' | 'anthropic';
  apiKey: string;
}

export interface CredentialsSummary {
  wfirma: {
    enabled: boolean;
    companyId?: string; // Masked
    lastValidated?: string;
  };
  llm: {
    provider: 'openai' | 'anthropic' | null;
    hasCustomKey: boolean;
    lastValidated?: string;
  };
}

// ============================================
// CREDENTIALS SERVICE
// ============================================

export class CredentialsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cryptoService: CryptoService
  ) {}

  // ============================================
  // WFIRMA CREDENTIALS
  // ============================================

  /**
   * Get decrypted wFirma credentials for a user
   * Returns null if not configured
   */
  async getWFirmaCredentials(userId: string): Promise<WFirmaCredentials | null> {
    const creds = await this.prisma.userApiCredentials.findUnique({
      where: { userId },
    });

    if (!creds || !creds.wfirmaEnabled || !creds.wfirmaAccessKey) {
      return null;
    }

    try {
      const accessKey = this.cryptoService.decryptFromString(creds.wfirmaAccessKey);
      const secretKey = this.cryptoService.decryptFromString(creds.wfirmaSecretKey!);
      const companyId = this.cryptoService.decryptFromString(creds.wfirmaCompanyId!);

      return {
        accessKey,
        secretKey,
        companyId,
        appKey: process.env.WFIRMA_APP_KEY || '',
      };
    } catch (error) {
      logger.error('Failed to decrypt wFirma credentials', { userId, error });
      return null;
    }
  }

  /**
   * Set wFirma credentials for a user (validates before saving)
   */
  async setWFirmaCredentials(userId: string, credentials: WFirmaCredentialsInput): Promise<void> {
    if (!this.cryptoService.isConfigured()) {
      throw new Error('Encryption not configured - cannot save credentials securely');
    }

    // Test credentials before saving
    const isValid = await this.testWFirmaCredentials(credentials);
    if (!isValid) {
      throw new Error('Invalid wFirma credentials - authentication failed');
    }

    // Encrypt credentials
    const encryptedAccessKey = this.cryptoService.encryptToString(credentials.accessKey);
    const encryptedSecretKey = this.cryptoService.encryptToString(credentials.secretKey);
    const encryptedCompanyId = this.cryptoService.encryptToString(credentials.companyId);

    // Upsert credentials
    await this.prisma.userApiCredentials.upsert({
      where: { userId },
      create: {
        userId,
        wfirmaEnabled: true,
        wfirmaAccessKey: encryptedAccessKey,
        wfirmaSecretKey: encryptedSecretKey,
        wfirmaCompanyId: encryptedCompanyId,
        wfirmaLastValidated: new Date(),
      },
      update: {
        wfirmaEnabled: true,
        wfirmaAccessKey: encryptedAccessKey,
        wfirmaSecretKey: encryptedSecretKey,
        wfirmaCompanyId: encryptedCompanyId,
        wfirmaLastValidated: new Date(),
      },
    });

    logger.info('wFirma credentials saved', {
      userId,
      companyId: CryptoService.mask(credentials.companyId),
    });
  }

  /**
   * Remove wFirma credentials for a user
   */
  async removeWFirmaCredentials(userId: string): Promise<void> {
    await this.prisma.userApiCredentials.upsert({
      where: { userId },
      create: {
        userId,
        wfirmaEnabled: false,
      },
      update: {
        wfirmaEnabled: false,
        wfirmaAccessKey: null,
        wfirmaSecretKey: null,
        wfirmaCompanyId: null,
        wfirmaLastValidated: null,
      },
    });

    logger.info('wFirma credentials removed', { userId });
  }

  /**
   * Test wFirma credentials by making a test API call
   */
  async testWFirmaCredentials(credentials: WFirmaCredentialsInput): Promise<boolean> {
    try {
      const client = new WFirmaClient({
        accessKey: credentials.accessKey,
        secretKey: credentials.secretKey,
        appKey: process.env.WFIRMA_APP_KEY || '',
        companyId: credentials.companyId,
      });

      // Try to fetch company data
      const payload = {
        api: {
          companies: {
            parameters: { limit: 1, page: 1 },
          },
        },
      };

      const response = await client.apiClient.request({
        method: 'GET',
        url: '/companies/find',
        params: client.buildQueryParams(),
        data: payload,
      });

      const isValid = response.data?.status?.code === 'OK';

      logger.info('wFirma credentials test', {
        companyId: CryptoService.mask(credentials.companyId),
        isValid,
      });

      return isValid;
    } catch (error) {
      logger.warn('wFirma credentials test failed', {
        error: (error as Error).message,
      });
      return false;
    }
  }

  // ============================================
  // LLM CREDENTIALS
  // ============================================

  /**
   * Get decrypted LLM credentials for a user
   * Returns null if not configured (uses app default)
   */
  async getLLMCredentials(userId: string): Promise<LLMCredentials | null> {
    const creds = await this.prisma.userApiCredentials.findUnique({
      where: { userId },
    });

    if (!creds || !creds.llmProvider || !creds.llmApiKey) {
      return null;
    }

    try {
      const apiKey = this.cryptoService.decryptFromString(creds.llmApiKey);
      return {
        provider: creds.llmProvider as 'openai' | 'anthropic',
        apiKey,
      };
    } catch (error) {
      logger.error('Failed to decrypt LLM credentials', { userId, error });
      return null;
    }
  }

  /**
   * Set LLM credentials for a user (validates before saving)
   */
  async setLLMCredentials(userId: string, credentials: LLMCredentialsInput): Promise<void> {
    if (!this.cryptoService.isConfigured()) {
      throw new Error('Encryption not configured - cannot save credentials securely');
    }

    // Test credentials before saving
    const isValid = await this.testLLMCredentials(credentials);
    if (!isValid) {
      throw new Error(`Invalid ${credentials.provider} API key - authentication failed`);
    }

    // Encrypt API key
    const encryptedApiKey = this.cryptoService.encryptToString(credentials.apiKey);

    // Upsert credentials
    await this.prisma.userApiCredentials.upsert({
      where: { userId },
      create: {
        userId,
        llmProvider: credentials.provider,
        llmApiKey: encryptedApiKey,
        llmLastValidated: new Date(),
      },
      update: {
        llmProvider: credentials.provider,
        llmApiKey: encryptedApiKey,
        llmLastValidated: new Date(),
      },
    });

    logger.info('LLM credentials saved', {
      userId,
      provider: credentials.provider,
    });
  }

  /**
   * Remove LLM credentials for a user
   */
  async removeLLMCredentials(userId: string): Promise<void> {
    await this.prisma.userApiCredentials.upsert({
      where: { userId },
      create: {
        userId,
      },
      update: {
        llmProvider: null,
        llmApiKey: null,
        llmLastValidated: null,
      },
    });

    logger.info('LLM credentials removed', { userId });
  }

  /**
   * Test LLM credentials by making a test API call
   */
  async testLLMCredentials(credentials: LLMCredentialsInput): Promise<boolean> {
    try {
      if (credentials.provider === 'openai') {
        const response = await axios.get('https://api.openai.com/v1/models', {
          headers: {
            Authorization: `Bearer ${credentials.apiKey}`,
          },
          timeout: 10000,
        });
        return response.status === 200;
      } else if (credentials.provider === 'anthropic') {
        // Anthropic doesn't have a simple models endpoint, so we make a minimal message request
        const response = await axios.post(
          'https://api.anthropic.com/v1/messages',
          {
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'test' }],
          },
          {
            headers: {
              'x-api-key': credentials.apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        );
        return response.status === 200;
      }

      return false;
    } catch (error) {
      const axiosError = error as any;
      // 401/403 means invalid credentials, other errors might be temporary
      if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        logger.warn('LLM credentials test failed - invalid API key', {
          provider: credentials.provider,
        });
        return false;
      }
      // If we get rate limited or other errors, the key might still be valid
      if (axiosError.response?.status === 429) {
        logger.info('LLM credentials test - rate limited but key appears valid', {
          provider: credentials.provider,
        });
        return true;
      }
      logger.warn('LLM credentials test failed', {
        provider: credentials.provider,
        error: (error as Error).message,
        status: axiosError.response?.status,
      });
      return false;
    }
  }

  // ============================================
  // SUMMARY
  // ============================================

  /**
   * Get credentials summary for UI display (masked values)
   */
  async getCredentialsSummary(userId: string): Promise<CredentialsSummary> {
    const creds = await this.prisma.userApiCredentials.findUnique({
      where: { userId },
    });

    if (!creds) {
      return {
        wfirma: { enabled: false },
        llm: { provider: null, hasCustomKey: false },
      };
    }

    let maskedCompanyId: string | undefined;
    if (creds.wfirmaEnabled && creds.wfirmaCompanyId) {
      try {
        const companyId = this.cryptoService.decryptFromString(creds.wfirmaCompanyId);
        maskedCompanyId = CryptoService.mask(companyId);
      } catch {
        maskedCompanyId = '****';
      }
    }

    return {
      wfirma: {
        enabled: creds.wfirmaEnabled,
        companyId: maskedCompanyId,
        lastValidated: creds.wfirmaLastValidated?.toISOString(),
      },
      llm: {
        provider: creds.llmProvider as 'openai' | 'anthropic' | null,
        hasCustomKey: !!creds.llmApiKey,
        lastValidated: creds.llmLastValidated?.toISOString(),
      },
    };
  }

  /**
   * Check if user has wFirma enabled
   */
  async hasWFirmaEnabled(userId: string): Promise<boolean> {
    const creds = await this.prisma.userApiCredentials.findUnique({
      where: { userId },
      select: { wfirmaEnabled: true },
    });
    return creds?.wfirmaEnabled ?? false;
  }
}
