import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../utils/logger';
import {
  WFirmaCompany,
  WFirmaContractor,
  ContractorFilters,
  ContractorData,
  FinancialData,
  SyncResult,
  WFirmaConfig,
} from '../types/wfirma.types';

// ============================================
// ERROR CLASSES
// ============================================

export class WFirmaError extends Error {
  constructor(
    public code: string,
    public message: string,
    public details?: any,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'WFirmaError';
  }
}

export class WFirmaAuthenticationError extends WFirmaError {
  constructor(message: string = 'Authentication failed', details?: any) {
    super('WFIRMA_AUTH_ERROR', message, details, 401);
  }
}

export class WFirmaConnectionError extends WFirmaError {
  constructor(message: string = 'Connection to wFirma failed', details?: any) {
    super('WFIRMA_CONNECTION_ERROR', message, details, 503);
  }
}

export class WFirmaValidationError extends WFirmaError {
  constructor(message: string = 'Validation error', details?: any) {
    super('WFIRMA_VALIDATION_ERROR', message, details, 400);
  }
}

// ============================================
// RETRY CONFIGURATION
// ============================================

interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
};

// ============================================
// WFIRMA INTEGRATION SERVICE
// ============================================

export class WFirmaIntegrationService {
  private readonly apiClient: AxiosInstance;
  private readonly config: WFirmaConfig;
  private readonly retryConfig: RetryConfig;

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

    // Initialize retry configuration
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      maxAttempts: this.config.retryAttempts || 3,
    };

    // Initialize axios client with wFirma API Key authentication
    // wFirma requires three keys in headers: accessKey, secretKey, appKey
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
      // Disable SSL verification for development/testing
      // In production, you should use proper SSL certificates
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false,
      }),
    });

    // Add request interceptor for logging
    this.apiClient.interceptors.request.use(
      (config) => {
        logger.debug('wFirma API request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          hasData: !!config.data,
        });
        return config;
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

  // ============================================
  // PUBLIC METHODS
  // ============================================

  /**
   * Get company data from wFirma
   */
  async getCompanyData(): Promise<WFirmaCompany> {
    logger.info('Fetching company data from wFirma');

    return this.withRetry(async () => {
      try {
        // Build JSON payload for companies/find
        const payload = {
          companies: {
            parameters: {
              limit: 1,
              page: 1,
            },
          },
        };
        
        const response = await this.apiClient.get('/companies/find', {
          params: this.buildQueryParams(),
          data: payload,
        });

        const data = response.data;
        
        // Check status
        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch company data',
            data.status
          );
        }

        // Extract company data from response
        // wFirma returns data in indexed format: companies['0'].company or companies.company
        let companyData = data.companies?.company;
        
        // Check if data is in indexed format
        if (!companyData && data.companies?.['0']?.company) {
          companyData = data.companies['0'].company;
        }
        
        // If still no data, check if companies itself is an array
        if (!companyData && Array.isArray(data.companies?.company)) {
          companyData = data.companies.company[0];
        }
        
        if (!companyData) {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'No company data in response',
            data
          );
        }

        // Convert to our format
        const company: WFirmaCompany = {
          id: companyData.id || companyData.company_id || this.config.companyId || '',
          name: companyData.name || '',
          nip: companyData.nip || '',
          regon: companyData.regon,
          krs: companyData.krs,
          address: {
            street: companyData.street || '',
            city: companyData.city || companyData.post || '',
            zip: companyData.zip || '',
            country: companyData.country || 'PL',
          },
          bankAccounts: companyData.account ? [{
            accountNumber: companyData.account,
            bankName: companyData.bank || '',
          }] : [],
          email: companyData.email,
          phone: companyData.phone,
          website: companyData.www,
        };

        logger.info('Successfully fetched company data from wFirma', {
          companyId: company.id,
          companyName: company.name,
        });

        return company;
      } catch (error) {
        logger.error('Failed to fetch company data from wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Get list of contractors from wFirma
   */
  async getContractors(filters?: ContractorFilters): Promise<WFirmaContractor[]> {
    logger.info('Fetching contractors from wFirma', { filters });

    return this.withRetry(async () => {
      try {
        // Build conditions array
        const conditions: any[] = [];
        
        if (filters?.search) {
          conditions.push({
            field: 'name',
            operator: 'like',
            value: `%${filters.search}%`,
          });
        }
        
        if (filters?.nip) {
          conditions.push({
            field: 'nip',
            operator: 'eq',
            value: filters.nip,
          });
        }

        // Calculate page from offset and limit
        const limit = filters?.limit || 100;
        const page = Math.floor((filters?.offset || 0) / limit) + 1;

        // Build JSON payload
        const payload: any = {
          contractors: {
            parameters: {
              limit,
              page,
            },
          },
        };

        // Add conditions if any
        if (conditions.length > 0) {
          payload.contractors.parameters.conditions = {
            condition: conditions,
          };
        }
        
        const response = await this.apiClient.request({
          method: 'GET',
          url: '/contractors/find',
          params: this.buildQueryParams(),
          data: payload,
        });

        const data = response.data;
        
        // Check status
        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch contractors',
            data.status
          );
        }

        // Extract contractors from response
        // wFirma returns data in indexed format: contractors['0'].contractor, contractors['1'].contractor, etc.
        let contractorsData = data.contractors?.contractor;
        
        // Check if data is in indexed format
        if (!contractorsData) {
          // Try to extract from indexed format
          const contractorsObj = data.contractors;
          if (contractorsObj) {
            contractorsData = [];
            // Iterate through numeric keys
            for (const key in contractorsObj) {
              if (!isNaN(Number(key)) && contractorsObj[key]?.contractor) {
                contractorsData.push(contractorsObj[key].contractor);
              }
            }
          }
        }
        
        // Handle single contractor (not array)
        if (!contractorsData || contractorsData.length === 0) {
          return [];
        }
        
        if (!Array.isArray(contractorsData)) {
          contractorsData = [contractorsData];
        }

        // Convert to our format
        const contractors: WFirmaContractor[] = contractorsData.map((c: any) => ({
          id: c.id || '',
          name: c.name || c.altname || '',
          nip: c.nip,
          regon: c.regon,
          email: c.email,
          phone: c.phone,
          address: c.street || c.city ? {
            street: c.street || '',
            city: c.city || c.post || '',
            zip: c.zip || '',
            country: c.country || 'PL',
          } : undefined,
          bankAccount: c.account,
          notes: c.notes,
        }));

        logger.info('Successfully fetched contractors from wFirma', {
          count: contractors.length,
        });

        return contractors;
      } catch (error) {
        logger.error('Failed to fetch contractors from wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Create a new contractor in wFirma
   */
  async createContractor(data: ContractorData): Promise<WFirmaContractor> {
    logger.info('Creating contractor in wFirma', { name: data.name });

    return this.withRetry(async () => {
      try {
        // Validate required fields
        if (!data.name) {
          throw new WFirmaValidationError('Contractor name is required');
        }

        // Build JSON payload
        const payload = {
          contractor: {
            name: data.name,
            altname: data.name,
            nip: data.nip || '',
            regon: data.regon || '',
            street: data.address?.street || '',
            zip: data.address?.zip || '',
            post: data.address?.city || '',
            city: data.address?.city || '',
            country: data.address?.country || 'PL',
            phone: data.phone || '',
            email: data.email || '',
            account: data.bankAccount || '',
            notes: data.notes || '',
          },
        };
        
        const response = await this.apiClient.request({
          method: 'GET',
          url: '/contractors/add',
          params: this.buildQueryParams(),
          data: payload,
        });

        const responseData = response.data;
        
        // Check status
        if (responseData.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to create contractor',
            responseData.status
          );
        }

        // Extract created contractor
        const contractorData = responseData.contractor;
        if (!contractorData) {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'No contractor data in response',
            responseData
          );
        }

        const contractor: WFirmaContractor = {
          id: contractorData.id || '',
          name: contractorData.name || data.name,
          nip: contractorData.nip || data.nip,
          regon: contractorData.regon || data.regon,
          email: contractorData.email || data.email,
          phone: contractorData.phone || data.phone,
          address: data.address,
          bankAccount: contractorData.account || data.bankAccount,
          notes: contractorData.notes || data.notes,
        };

        logger.info('Successfully created contractor in wFirma', {
          contractorId: contractor.id,
          contractorName: contractor.name,
        });

        return contractor;
      } catch (error) {
        logger.error('Failed to create contractor in wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Get financial data for a specific year
   */
  async getFinancialData(year: number): Promise<FinancialData> {
    logger.info('Fetching financial data from wFirma', { year });

    return this.withRetry(async () => {
      try {
        // wFirma doesn't have a direct financial summary endpoint
        // We need to fetch invoices and calculate totals
        const dateFrom = `${year}-01-01`;
        const dateTo = `${year}-12-31`;

        // Build JSON payload for invoices
        const payload = {
          invoices: {
            parameters: {
              conditions: {
                condition: [
                  {
                    field: 'date',
                    operator: 'ge',
                    value: dateFrom,
                  },
                  {
                    field: 'date',
                    operator: 'le',
                    value: dateTo,
                  },
                ],
              },
              limit: 1000, // Get all invoices for the year
              page: 1,
            },
          },
        };
        
        const response = await this.apiClient.request({
          method: 'GET',
          url: '/invoices/find',
          params: this.buildQueryParams(),
          data: payload,
        });

        const data = response.data;
        
        // Check status
        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch financial data',
            data.status
          );
        }

        // Calculate totals from invoices
        // wFirma returns data in indexed format: invoices['0'].invoice, invoices['1'].invoice, etc.
        let invoicesData = data.invoices?.invoice;
        
        // Check if data is in indexed format
        if (!invoicesData) {
          const invoicesObj = data.invoices;
          if (invoicesObj) {
            invoicesData = [];
            // Iterate through numeric keys
            for (const key in invoicesObj) {
              if (!isNaN(Number(key)) && invoicesObj[key]?.invoice) {
                invoicesData.push(invoicesObj[key].invoice);
              }
            }
          }
        }
        
        if (!invoicesData || invoicesData.length === 0) {
          invoicesData = [];
        } else if (!Array.isArray(invoicesData)) {
          invoicesData = [invoicesData];
        }

        let revenue = 0;
        let expenses = 0;

        invoicesData.forEach((invoice: any) => {
          const total = parseFloat(invoice.total || invoice.brutto || 0);
          if (invoice.type === 'normal' || invoice.type === 'vat') {
            revenue += total;
          } else if (invoice.type === 'purchase') {
            expenses += total;
          }
        });

        const profit = revenue - expenses;

        const financialData: FinancialData = {
          year,
          revenue,
          expenses,
          profit,
          taxPaid: 0, // Would need separate tax data
          vatPaid: 0,
          pitPaid: 0,
          zusPaid: 0,
        };

        logger.info('Successfully fetched financial data from wFirma', {
          year,
          revenue,
          profit,
        });

        return financialData;
      } catch (error) {
        logger.error('Failed to fetch financial data from wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Sync data from wFirma to local cache
   */
  async syncDataFromWFirma(): Promise<SyncResult> {
    logger.info('Starting data synchronization from wFirma');

    const startTime = Date.now();
    const errors: string[] = [];
    let itemsSynced = 0;

    try {
      // Sync company data
      try {
        await this.getCompanyData();
        itemsSynced++;
      } catch (error) {
        const errorMessage = `Failed to sync company data: ${(error as Error).message}`;
        errors.push(errorMessage);
        logger.error(errorMessage, { error });
      }

      // Sync contractors
      try {
        const contractors = await this.getContractors();
        itemsSynced += contractors.length;
      } catch (error) {
        const errorMessage = `Failed to sync contractors: ${(error as Error).message}`;
        errors.push(errorMessage);
        logger.error(errorMessage, { error });
      }

      // Sync financial data for current year
      try {
        const currentYear = new Date().getFullYear();
        await this.getFinancialData(currentYear);
        itemsSynced++;
      } catch (error) {
        const errorMessage = `Failed to sync financial data: ${(error as Error).message}`;
        errors.push(errorMessage);
        logger.error(errorMessage, { error });
      }

      const duration = Date.now() - startTime;
      const success = errors.length === 0;

      logger.info('Data synchronization completed', {
        success,
        itemsSynced,
        duration,
        errors: errors.length,
      });

      return {
        success,
        syncedAt: new Date(),
        itemsSynced,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      logger.error('Data synchronization failed', { error });
      return {
        success: false,
        syncedAt: new Date(),
        itemsSynced,
        errors: [...errors, (error as Error).message],
      };
    }
  }

  /**
   * Check connection to wFirma API
   */
  async checkConnection(): Promise<boolean> {
    logger.info('Checking connection to wFirma API');

    try {
      // Try to fetch company data as a connection test
      await this.getCompanyData();
      
      logger.info('wFirma API connection check', { isConnected: true });
      return true;
    } catch (error) {
      logger.error('wFirma API connection check failed', { error });
      return false;
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Build query parameters for wFirma API
   */
  private buildQueryParams(): Record<string, string> {
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
  private async withRetry<T>(
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
