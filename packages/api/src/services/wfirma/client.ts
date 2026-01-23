/**
 * wFirma API Client
 * Base axios client with retry logic and error handling
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../../utils/logger';
import { WFirmaConfig } from '../../types/wfirma.types';
import {
  WFirmaError,
  WFirmaAuthenticationError,
  WFirmaConnectionError,
  WFirmaValidationError,
} from './errors';

// ============================================
// RETRY CONFIGURATION
// ============================================

export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
};

// ============================================
// WFIRMA API CLIENT
// ============================================

export class WFirmaClient {
  public readonly apiClient: AxiosInstance;
  public readonly config: WFirmaConfig;
  public readonly retryConfig: RetryConfig;

  constructor(config?: Partial<WFirmaConfig>) {
    // Load configuration from environment or provided config
    this.config = {
      accessKey: config?.accessKey || process.env.WFIRMA_ACCESS_KEY || '',
      secretKey: config?.secretKey || process.env.WFIRMA_SECRET_KEY || '',
      appKey: config?.appKey || process.env.WFIRMA_APP_KEY || '',
      apiUrl: config?.apiUrl || process.env.WFIRMA_API_URL || 'https://api2.wfirma.pl',
      companyId: config?.companyId || process.env.WFIRMA_COMPANY_ID,
      timeout: config?.timeout || 30000,
      retryAttempts: config?.retryAttempts || 3,
    };

    if (!this.config.accessKey || !this.config.secretKey || !this.config.appKey) {
      logger.warn('wFirma API keys not fully configured (accessKey, secretKey, appKey required)');
    }

    // Log loaded credentials (masked for security)
    logger.info('WFirmaClient initialized with credentials', {
      accessKey: this.config.accessKey ? `***${this.config.accessKey.slice(-4)}` : 'NOT SET',
      secretKey: this.config.secretKey ? `***${this.config.secretKey.slice(-4)}` : 'NOT SET',
      appKey: this.config.appKey ? `***${this.config.appKey.slice(-4)}` : 'NOT SET',
      companyId: this.config.companyId || 'NOT SET',
      apiUrl: this.config.apiUrl,
    });

    // Initialize retry configuration
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      maxAttempts: this.config.retryAttempts || 3,
    };

    // SSL verification - enabled by default, can be disabled for development only
    const rejectUnauthorized = process.env.WFIRMA_SKIP_SSL_VERIFY !== 'true';
    if (!rejectUnauthorized) {
      logger.warn('SECURITY WARNING: SSL certificate verification is disabled for wFirma API. This should only be used in development!');
    }

    // Initialize axios client with wFirma API Key authentication
    this.apiClient = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'accessKey': this.config.accessKey,
        'secretKey': this.config.secretKey,
        'appKey': this.config.appKey,
      },
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized, // Default: true (secure), set WFIRMA_SKIP_SSL_VERIFY=true only in development
      }),
    });

    // Add request interceptor for logging
    this.apiClient.interceptors.request.use(
      (requestConfig) => {
        logger.debug('wFirma API request', {
          method: requestConfig.method?.toUpperCase(),
          url: requestConfig.url,
          hasData: !!requestConfig.data,
        });
        return requestConfig;
      },
      (error) => {
        logger.error('wFirma API request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.apiClient.interceptors.response.use(
      (response) => {
        logger.debug('wFirma API response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        logger.error('wFirma API response error', {
          message: error.message,
          status: error.response?.status,
        });
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  /**
   * Build query parameters for wFirma API
   */
  buildQueryParams(): Record<string, string> {
    const params: Record<string, string> = {
      inputFormat: 'json',
      outputFormat: 'json',
    };

    if (this.config.companyId) {
      params.company_id = this.config.companyId;
    }

    return params;
  }

  /**
   * Execute operation with retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = this.retryConfig
  ): Promise<T> {
    let lastError: Error;
    let delay = config.delayMs;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on authentication or validation errors
        if (
          error instanceof WFirmaAuthenticationError ||
          error instanceof WFirmaValidationError
        ) {
          throw error;
        }

        // Don't retry on WFirmaError (business logic errors)
        if (error instanceof WFirmaError && !(error instanceof WFirmaConnectionError)) {
          throw error;
        }

        if (attempt < config.maxAttempts) {
          logger.warn('wFirma API operation failed, retrying', {
            attempt,
            maxAttempts: config.maxAttempts,
            delay,
            error: (error as Error).message,
          });

          await this.sleep(delay);
          delay *= config.backoffMultiplier;
        }
      }
    }

    logger.error('wFirma API operation failed after all retries', {
      maxAttempts: config.maxAttempts,
      error: lastError!.message,
    });

    throw new WFirmaConnectionError(
      `Operation failed after ${config.maxAttempts} attempts`,
      { lastError: lastError!.message }
    );
  }

  /**
   * Handle API errors and convert to appropriate error types
   */
  private handleApiError(error: AxiosError): Error {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      logger.error('wFirma API error response', {
        status,
        data: typeof data === 'string' ? data.substring(0, 500) : data,
      });

      // Try to extract error info from JSON response
      let errorCode = 'WFIRMA_API_ERROR';
      let errorMessage = 'wFirma API error';

      if (typeof data === 'object' && data !== null) {
        const apiData = data as any;
        if (apiData.status?.code) {
          errorCode = apiData.status.code;
        }
        if (apiData.status?.message) {
          errorMessage = apiData.status.message;
        }
      }

      // Authentication errors
      if (status === 401 || status === 403 || errorCode === 'AUTH' || errorCode === 'ACCESS DENIED') {
        return new WFirmaAuthenticationError(
          errorMessage || 'Authentication failed',
          { status, errorCode }
        );
      }

      // Validation errors
      if (status === 400 || status === 422 || errorCode === 'INPUT ERROR' || errorCode === 'ERROR') {
        return new WFirmaValidationError(
          errorMessage || 'Validation error',
          { status, errorCode }
        );
      }

      // Server errors
      if (status >= 500) {
        return new WFirmaConnectionError(
          errorMessage || 'wFirma server error',
          { status, errorCode }
        );
      }

      return new WFirmaError(
        errorCode,
        errorMessage,
        { status },
        status
      );
    }

    if (error.request) {
      logger.error('wFirma API no response', { error: error.message });
      return new WFirmaConnectionError('No response from wFirma API', {
        message: error.message,
      });
    }

    logger.error('wFirma API request setup error', { error: error.message });
    return new WFirmaError(
      'WFIRMA_REQUEST_ERROR',
      'Failed to setup wFirma API request',
      { message: error.message }
    );
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
