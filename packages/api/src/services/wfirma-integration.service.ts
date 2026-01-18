import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../utils/logger';
import {
  WFirmaCompany,
  WFirmaContractor,
  ContractorFilters,
  ContractorData,
  ContractorUpdateData,
  DeleteResult,
  FinancialData,
  SyncResult,
  WFirmaConfig,
  WFirmaInvoice,
  WFirmaInvoiceFilters,
  WFirmaInvoiceItem,
  SendInvoiceOptions,
  SendInvoiceResult,
  WFirmaNote,
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
        // Build JSON payload for companies/find - wFirma expects: api > companies > parameters
        const payload = {
          api: {
            companies: {
              parameters: {
                limit: 1,
                page: 1,
              },
            },
          },
        };

        const response = await this.apiClient.request({
          method: 'GET',
          url: '/companies/find',
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

        // Build JSON payload - wFirma expects: api > contractors > parameters
        const contractorsParams: any = {
          parameters: {
            limit,
            page,
          },
        };

        // Add conditions if any
        if (conditions.length > 0) {
          contractorsParams.parameters.conditions = {
            condition: conditions,
          };
        }

        const payload = {
          api: {
            contractors: contractorsParams,
          },
        };

        logger.debug('wFirma getContractors payload', { payload });

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

        // Build JSON payload - only include fields with actual values
        // wFirma API returns INPUT ERROR if empty strings are sent for certain fields

        // Determine tax_id_type based on provided identifiers
        // Allowed values: nip, vat, pesel, regon, custom, none
        let taxIdType = 'none';
        if (data.nip) {
          taxIdType = 'nip';
        } else if (data.regon) {
          taxIdType = 'regon';
        }

        const contractorData: Record<string, string> = {
          name: data.name,
          altname: data.name,
          country: data.address?.country || 'PL',
          tax_id_type: taxIdType,
        };

        // Add optional fields only if they have values
        if (data.nip) contractorData.nip = data.nip;
        if (data.regon) contractorData.regon = data.regon;
        if (data.address?.street) contractorData.street = data.address.street;
        if (data.address?.zip) contractorData.zip = data.address.zip;
        if (data.address?.city) {
          contractorData.post = data.address.city;
          contractorData.city = data.address.city;
        }
        if (data.phone) contractorData.phone = data.phone;
        if (data.email) contractorData.email = data.email;
        if (data.bankAccount) contractorData.account = data.bankAccount;
        if (data.notes) contractorData.notes = data.notes;

        // wFirma API expects structure: api > contractors > contractor
        const payload = {
          api: {
            contractors: {
              contractor: contractorData,
            },
          },
        };

        const queryParams = this.buildQueryParams();
        logger.info('wFirma create contractor REQUEST', {
          url: '/contractors/add',
          method: 'POST',
          params: queryParams,
          payload: JSON.stringify(payload, null, 2),
        });

        const response = await this.apiClient.request({
          method: 'POST',
          url: '/contractors/add',
          params: queryParams,
          data: payload,
        });

        const responseData = response.data;

        logger.info('wFirma create contractor RESPONSE', {
          responseData: JSON.stringify(responseData, null, 2),
        });

        // Check status
        if (responseData.status?.code !== 'OK') {
          // Extract detailed error message from wFirma response
          const errorMessage = responseData.status?.message
            || responseData.status?.code
            || 'Unknown error';
          const errorDetails = responseData.status?.fields
            ? `Поля с ошибками: ${Object.keys(responseData.status.fields).join(', ')}`
            : '';

          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            `Ошибка wFirma: ${errorMessage}. ${errorDetails}`.trim(),
            responseData.status
          );
        }

        // Extract created contractor from response
        // wFirma returns data in indexed format: contractors['0'].contractor
        let createdContractor = responseData.contractors?.['0']?.contractor;

        // Fallback: try direct contractor property
        if (!createdContractor) {
          createdContractor = responseData.contractor;
        }

        // Fallback: try contractors.contractor
        if (!createdContractor && responseData.contractors?.contractor) {
          createdContractor = responseData.contractors.contractor;
        }

        if (!createdContractor) {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'No contractor data in response',
            responseData
          );
        }

        const contractor: WFirmaContractor = {
          id: createdContractor.id || '',
          name: createdContractor.name || data.name,
          nip: createdContractor.nip || data.nip,
          regon: createdContractor.regon || data.regon,
          email: createdContractor.email || data.email,
          phone: createdContractor.phone || data.phone,
          address: data.address,
          bankAccount: createdContractor.account || data.bankAccount,
          notes: createdContractor.notes || data.notes,
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
   * Get a single contractor by ID from wFirma
   */
  async getContractorById(id: string): Promise<WFirmaContractor | null> {
    logger.info('Fetching contractor by ID from wFirma', { contractorId: id });

    return this.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Contractor ID is required');
        }

        const response = await this.apiClient.request({
          method: 'GET',
          url: `/contractors/get/${id}`,
          params: this.buildQueryParams(),
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          if (data.status?.code === 'NOT FOUND' || data.status?.code === 'ACTION NOT FOUND') {
            return null;
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch contractor',
            data.status
          );
        }

        // Extract contractor from response - wFirma may return in different formats
        let contractorData = data.contractors?.contractor;
        if (!contractorData) {
          // Try indexed format
          const contractorsObj = data.contractors;
          if (contractorsObj) {
            for (const key in contractorsObj) {
              if (!isNaN(Number(key)) && contractorsObj[key]?.contractor) {
                contractorData = contractorsObj[key].contractor;
                break;
              }
            }
          }
        }

        if (!contractorData) {
          return null;
        }

        const contractor: WFirmaContractor = {
          id: contractorData.id || id,
          name: contractorData.name || contractorData.altname || '',
          nip: contractorData.nip,
          regon: contractorData.regon,
          email: contractorData.email,
          phone: contractorData.phone,
          address: contractorData.street || contractorData.city ? {
            street: contractorData.street || '',
            city: contractorData.city || contractorData.post || '',
            zip: contractorData.zip || '',
            country: contractorData.country || 'PL',
          } : undefined,
          bankAccount: contractorData.account,
          notes: contractorData.notes,
        };

        logger.info('Successfully fetched contractor by ID', {
          contractorId: contractor.id,
          contractorName: contractor.name,
        });

        return contractor;
      } catch (error) {
        logger.error('Failed to fetch contractor by ID', { error, contractorId: id });
        throw error;
      }
    });
  }

  /**
   * Update an existing contractor in wFirma
   */
  async updateContractor(id: string, data: ContractorUpdateData): Promise<WFirmaContractor> {
    logger.info('Updating contractor in wFirma', { contractorId: id, updates: Object.keys(data) });

    return this.withRetry(async () => {
      try {
        // Validate ID
        if (!id) {
          throw new WFirmaValidationError('Contractor ID is required');
        }

        // Build payload with only provided fields
        const contractorPayload: Record<string, unknown> = { id };

        if (data.name !== undefined) {
          contractorPayload.name = data.name;
          contractorPayload.altname = data.name;
        }
        if (data.nip !== undefined) contractorPayload.nip = data.nip;
        if (data.regon !== undefined) contractorPayload.regon = data.regon;
        if (data.email !== undefined) contractorPayload.email = data.email;
        if (data.phone !== undefined) contractorPayload.phone = data.phone;
        if (data.bankAccount !== undefined) contractorPayload.account = data.bankAccount;
        if (data.notes !== undefined) contractorPayload.notes = data.notes;

        // Handle address fields
        if (data.address) {
          if (data.address.street !== undefined) contractorPayload.street = data.address.street;
          if (data.address.city !== undefined) {
            contractorPayload.city = data.address.city;
            contractorPayload.post = data.address.city;
          }
          if (data.address.zip !== undefined) contractorPayload.zip = data.address.zip;
          if (data.address.country !== undefined) contractorPayload.country = data.address.country;
        }

        // wFirma expects: api > contractors > contractor
        const payload = {
          api: {
            contractors: {
              contractor: contractorPayload,
            },
          },
        };

        // wFirma uses POST with edit action
        const response = await this.apiClient.request({
          method: 'POST',
          url: `/contractors/edit/${id}`,
          params: this.buildQueryParams(),
          data: payload,
        });

        const responseData = response.data;

        // Check status
        if (responseData.status?.code !== 'OK') {
          if (responseData.status?.code === 'NOT FOUND' || responseData.status?.code === 'ACTION NOT FOUND') {
            throw new WFirmaError(
              'WFIRMA_NOT_FOUND',
              `Contractor with ID ${id} not found`,
              responseData.status,
              404
            );
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            responseData.status?.message || 'Failed to update contractor',
            responseData.status
          );
        }

        // Extract updated contractor from response
        let contractorData = responseData.contractors?.contractor;
        if (!contractorData) {
          const contractorsObj = responseData.contractors;
          if (contractorsObj) {
            for (const key in contractorsObj) {
              if (!isNaN(Number(key)) && contractorsObj[key]?.contractor) {
                contractorData = contractorsObj[key].contractor;
                break;
              }
            }
          }
        }

        if (!contractorData) {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'No contractor data in response',
            responseData
          );
        }

        const contractor: WFirmaContractor = {
          id: contractorData.id || id,
          name: contractorData.name || '',
          nip: contractorData.nip,
          regon: contractorData.regon,
          email: contractorData.email,
          phone: contractorData.phone,
          address: contractorData.street || contractorData.city ? {
            street: contractorData.street || '',
            city: contractorData.city || contractorData.post || '',
            zip: contractorData.zip || '',
            country: contractorData.country || 'PL',
          } : undefined,
          bankAccount: contractorData.account,
          notes: contractorData.notes,
        };

        logger.info('Successfully updated contractor in wFirma', {
          contractorId: contractor.id,
          contractorName: contractor.name,
        });

        return contractor;
      } catch (error) {
        logger.error('Failed to update contractor in wFirma', { error, contractorId: id });
        throw error;
      }
    });
  }

  /**
   * Delete a contractor from wFirma
   */
  async deleteContractor(id: string): Promise<DeleteResult> {
    logger.info('Deleting contractor from wFirma', { contractorId: id });

    return this.withRetry(async () => {
      try {
        // Validate ID
        if (!id) {
          throw new WFirmaValidationError('Contractor ID is required');
        }

        const response = await this.apiClient.request({
          method: 'DELETE',
          url: `/contractors/delete/${id}`,
          params: this.buildQueryParams(),
        });

        const responseData = response.data;

        // Check status
        if (responseData.status?.code !== 'OK') {
          // Handle specific error cases
          if (responseData.status?.code === 'NOT FOUND' || responseData.status?.code === 'ACTION NOT FOUND') {
            throw new WFirmaError(
              'WFIRMA_NOT_FOUND',
              `Contractor with ID ${id} not found`,
              responseData.status,
              404
            );
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            responseData.status?.message || 'Failed to delete contractor',
            responseData.status
          );
        }

        logger.info('Successfully deleted contractor from wFirma', { contractorId: id });

        return {
          success: true,
          id,
          message: `Contractor ${id} deleted successfully`,
        };
      } catch (error) {
        logger.error('Failed to delete contractor from wFirma', { error, contractorId: id });
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

        // Build JSON payload for invoices - wFirma expects: api > invoices > parameters
        const payload = {
          api: {
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
   * Find invoices with filtering, sorting, and pagination
   */
  async findInvoices(filters?: WFirmaInvoiceFilters): Promise<WFirmaInvoice[]> {
    logger.info('Fetching invoices from wFirma', { filters });

    return this.withRetry(async () => {
      try {
        // Build conditions array
        const conditions: any[] = [];

        if (filters?.dateFrom) {
          const dateFrom = filters.dateFrom instanceof Date
            ? filters.dateFrom.toISOString().split('T')[0]
            : filters.dateFrom;
          conditions.push({
            field: 'date',
            operator: 'ge',
            value: dateFrom,
          });
        }

        if (filters?.dateTo) {
          const dateTo = filters.dateTo instanceof Date
            ? filters.dateTo.toISOString().split('T')[0]
            : filters.dateTo;
          conditions.push({
            field: 'date',
            operator: 'le',
            value: dateTo,
          });
        }

        if (filters?.type) {
          conditions.push({
            field: 'type',
            operator: 'eq',
            value: filters.type,
          });
        }

        if (filters?.contractorId) {
          conditions.push({
            field: 'contractor',
            operator: 'eq',
            value: filters.contractorId,
          });
        }

        if (filters?.invoiceNumber) {
          conditions.push({
            field: 'fullnumber',
            operator: 'like',
            value: `%${filters.invoiceNumber}%`,
          });
        }

        // Calculate page from offset and limit
        const limit = filters?.limit || 100;
        const page = Math.floor((filters?.offset || 0) / limit) + 1;

        // Build parameters
        const invoicesParams: any = {
          parameters: {
            limit,
            page,
          },
        };

        // Add sorting
        if (filters?.sortBy) {
          const sortField = this.mapInvoiceSortField(filters.sortBy);
          if (filters.sortOrder === 'asc') {
            invoicesParams.parameters.order = { asc: sortField };
          } else {
            invoicesParams.parameters.order = { desc: sortField };
          }
        } else {
          // Default: newest first
          invoicesParams.parameters.order = { desc: 'Invoice.id' };
        }

        // Add conditions if any
        if (conditions.length > 0) {
          invoicesParams.parameters.conditions = {
            condition: conditions,
          };
        }

        const payload = {
          api: {
            invoices: invoicesParams,
          },
        };

        logger.debug('wFirma findInvoices payload', { payload });

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
            'Failed to fetch invoices',
            data.status
          );
        }

        // Extract invoices from response (handle indexed format)
        let invoicesData = data.invoices?.invoice;

        if (!invoicesData) {
          const invoicesObj = data.invoices;
          if (invoicesObj) {
            invoicesData = [];
            for (const key in invoicesObj) {
              if (!isNaN(Number(key)) && invoicesObj[key]?.invoice) {
                invoicesData.push(invoicesObj[key].invoice);
              }
            }
          }
        }

        if (!invoicesData || invoicesData.length === 0) {
          return [];
        }

        if (!Array.isArray(invoicesData)) {
          invoicesData = [invoicesData];
        }

        // Convert to our format and apply status filter if needed
        let invoices: WFirmaInvoice[] = invoicesData.map((inv: any) => this.mapInvoiceData(inv));

        // Apply status filter (wFirma doesn't have direct status field, we compute it)
        if (filters?.status) {
          invoices = invoices.filter(inv => inv.status === filters.status);
        }

        logger.info('Successfully fetched invoices from wFirma', {
          count: invoices.length,
        });

        return invoices;
      } catch (error) {
        logger.error('Failed to fetch invoices from wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Get a single invoice by ID from wFirma
   */
  async getInvoiceById(id: string): Promise<WFirmaInvoice | null> {
    logger.info('Fetching invoice by ID from wFirma', { invoiceId: id });

    return this.withRetry(async () => {
      try {
        if (!id) {
          throw new WFirmaValidationError('Invoice ID is required');
        }

        const response = await this.apiClient.request({
          method: 'GET',
          url: `/invoices/get/${id}`,
          params: this.buildQueryParams(),
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          if (data.status?.code === 'NOT FOUND' || data.status?.code === 'ACTION NOT FOUND') {
            return null;
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch invoice',
            data.status
          );
        }

        // Extract invoice from response
        let invoiceData = data.invoices?.invoice;
        if (!invoiceData) {
          const invoicesObj = data.invoices;
          if (invoicesObj) {
            for (const key in invoicesObj) {
              if (!isNaN(Number(key)) && invoicesObj[key]?.invoice) {
                invoiceData = invoicesObj[key].invoice;
                break;
              }
            }
          }
        }

        if (!invoiceData) {
          return null;
        }

        const invoice = this.mapInvoiceData(invoiceData);

        logger.info('Successfully fetched invoice by ID', {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
        });

        return invoice;
      } catch (error) {
        logger.error('Failed to fetch invoice by ID', { error, invoiceId: id });
        throw error;
      }
    });
  }

  /**
   * Send invoice via email
   */
  async sendInvoice(invoiceId: string, options: SendInvoiceOptions = {}): Promise<SendInvoiceResult> {
    logger.info('Sending invoice via email', { invoiceId, options });

    return this.withRetry(async () => {
      try {
        if (!invoiceId) {
          throw new WFirmaValidationError('Invoice ID is required');
        }

        // Build parameters array for send
        const parameters: Array<{ name: string; value: string }> = [];

        if (options.email) {
          parameters.push({ name: 'email', value: options.email });
        }
        if (options.subject) {
          parameters.push({ name: 'subject', value: options.subject });
        }
        if (options.body) {
          parameters.push({ name: 'body', value: options.body });
        }
        parameters.push({ name: 'page', value: options.page || 'invoice' });
        parameters.push({ name: 'leaflet', value: options.leaflet ? '1' : '0' });
        parameters.push({ name: 'duplicate', value: options.duplicate ? '1' : '0' });

        const payload = {
          api: {
            invoices: {
              parameters: {
                parameter: parameters,
              },
            },
          },
        };

        logger.debug('wFirma sendInvoice payload', { payload });

        const response = await this.apiClient.request({
          method: 'POST',
          url: `/invoices/send/${invoiceId}`,
          params: this.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            data.status?.message || 'Failed to send invoice',
            data.status
          );
        }

        // Extract delivery info if available
        let deliveryId: string | undefined;
        if (data.invoice_deliveries) {
          const deliveriesObj = data.invoice_deliveries;
          for (const key in deliveriesObj) {
            if (!isNaN(Number(key)) && deliveriesObj[key]?.invoice_delivery) {
              deliveryId = deliveriesObj[key].invoice_delivery.id;
              break;
            }
          }
        }

        const result: SendInvoiceResult = {
          success: true,
          invoiceId,
          deliveryId,
          email: options.email || '',
          sentAt: new Date(),
          message: 'Invoice sent successfully',
        };

        logger.info('Successfully sent invoice', { invoiceId, deliveryId });

        return result;
      } catch (error) {
        logger.error('Failed to send invoice', { error, invoiceId });
        throw error;
      }
    });
  }

  /**
   * Delete an invoice delivery
   */
  async deleteInvoiceDelivery(deliveryId: string): Promise<DeleteResult> {
    logger.info('Deleting invoice delivery', { deliveryId });

    return this.withRetry(async () => {
      try {
        if (!deliveryId) {
          throw new WFirmaValidationError('Delivery ID is required');
        }

        const response = await this.apiClient.request({
          method: 'DELETE',
          url: `/invoice_deliveries/delete/${deliveryId}`,
          params: this.buildQueryParams(),
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          if (data.status?.code === 'NOT FOUND' || data.status?.code === 'ACTION NOT FOUND') {
            throw new WFirmaError(
              'WFIRMA_NOT_FOUND',
              `Invoice delivery with ID ${deliveryId} not found`,
              data.status,
              404
            );
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            data.status?.message || 'Failed to delete invoice delivery',
            data.status
          );
        }

        logger.info('Successfully deleted invoice delivery', { deliveryId });

        return {
          success: true,
          id: deliveryId,
          message: `Invoice delivery ${deliveryId} deleted successfully`,
        };
      } catch (error) {
        logger.error('Failed to delete invoice delivery', { error, deliveryId });
        throw error;
      }
    });
  }

  // ============================================
  // NOTES METHODS
  // ============================================

  /**
   * Add a note to an object (invoice, contractor, etc.)
   */
  async addNote(objectName: string, objectId: string, text: string): Promise<WFirmaNote> {
    logger.info('Adding note', { objectName, objectId });

    return this.withRetry(async () => {
      try {
        if (!objectName || !objectId || !text) {
          throw new WFirmaValidationError('Object name, object ID, and text are required');
        }

        const payload = {
          api: {
            notes: {
              note: {
                object_name: objectName,
                object_id: objectId,
                text,
              },
            },
          },
        };

        logger.info('wFirma addNote REQUEST', {
          url: '/notes/add',
          payload: JSON.stringify(payload, null, 2),
        });

        const response = await this.apiClient.request({
          method: 'POST',
          url: '/notes/add',
          params: this.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        logger.info('wFirma addNote RESPONSE', {
          responseData: JSON.stringify(data, null, 2),
        });

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            data.status?.message || 'Failed to add note',
            data.status
          );
        }

        // Extract created note
        let noteData = data.notes?.note;
        if (!noteData) {
          const notesObj = data.notes;
          if (notesObj) {
            for (const key in notesObj) {
              if (!isNaN(Number(key)) && notesObj[key]?.note) {
                noteData = notesObj[key].note;
                break;
              }
            }
          }
        }

        if (!noteData) {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'No note data in response',
            data
          );
        }

        const note: WFirmaNote = {
          id: noteData.id,
          objectName: noteData.object_name || objectName,
          objectId: noteData.object_id || objectId,
          text: noteData.text || text,
          created: new Date(noteData.created || Date.now()),
          modified: new Date(noteData.modified || Date.now()),
        };

        logger.info('Successfully added note', { noteId: note.id });

        return note;
      } catch (error) {
        logger.error('Failed to add note', { error, objectName, objectId });
        throw error;
      }
    });
  }

  /**
   * Get a note by ID
   */
  async getNote(noteId: string): Promise<WFirmaNote | null> {
    logger.info('Fetching note by ID', { noteId });

    return this.withRetry(async () => {
      try {
        if (!noteId) {
          throw new WFirmaValidationError('Note ID is required');
        }

        const response = await this.apiClient.request({
          method: 'GET',
          url: `/notes/get/${noteId}`,
          params: this.buildQueryParams(),
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          if (data.status?.code === 'NOT FOUND' || data.status?.code === 'ACTION NOT FOUND') {
            return null;
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch note',
            data.status
          );
        }

        let noteData = data.notes?.note;
        if (!noteData) {
          const notesObj = data.notes;
          if (notesObj) {
            for (const key in notesObj) {
              if (!isNaN(Number(key)) && notesObj[key]?.note) {
                noteData = notesObj[key].note;
                break;
              }
            }
          }
        }

        if (!noteData) {
          return null;
        }

        return {
          id: noteData.id,
          objectName: noteData.object_name,
          objectId: noteData.object_id,
          text: noteData.text,
          created: new Date(noteData.created),
          modified: new Date(noteData.modified),
        };
      } catch (error) {
        logger.error('Failed to fetch note', { error, noteId });
        throw error;
      }
    });
  }

  /**
   * Find notes for an object
   */
  async findNotes(objectName: string, objectId: string): Promise<WFirmaNote[]> {
    logger.info('Fetching notes', { objectName, objectId });

    return this.withRetry(async () => {
      try {
        const payload = {
          api: {
            notes: {
              parameters: {
                conditions: {
                  condition: [
                    { field: 'object_name', operator: 'eq', value: objectName },
                    { field: 'object_id', operator: 'eq', value: objectId },
                  ],
                },
                limit: 100,
                page: 1,
              },
            },
          },
        };

        const response = await this.apiClient.request({
          method: 'GET',
          url: '/notes/find',
          params: this.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch notes',
            data.status
          );
        }

        let notesData = data.notes?.note;
        if (!notesData) {
          const notesObj = data.notes;
          if (notesObj) {
            notesData = [];
            for (const key in notesObj) {
              if (!isNaN(Number(key)) && notesObj[key]?.note) {
                notesData.push(notesObj[key].note);
              }
            }
          }
        }

        if (!notesData || notesData.length === 0) {
          return [];
        }

        if (!Array.isArray(notesData)) {
          notesData = [notesData];
        }

        const notes: WFirmaNote[] = notesData.map((n: any) => ({
          id: n.id,
          objectName: n.object_name,
          objectId: n.object_id,
          text: n.text,
          created: new Date(n.created),
          modified: new Date(n.modified),
        }));

        logger.info('Successfully fetched notes', { count: notes.length });

        return notes;
      } catch (error) {
        logger.error('Failed to fetch notes', { error, objectName, objectId });
        throw error;
      }
    });
  }

  /**
   * Edit a note
   */
  async editNote(noteId: string, text: string): Promise<WFirmaNote> {
    logger.info('Editing note', { noteId });

    return this.withRetry(async () => {
      try {
        if (!noteId || !text) {
          throw new WFirmaValidationError('Note ID and text are required');
        }

        const payload = {
          api: {
            notes: {
              note: {
                id: noteId,
                text,
              },
            },
          },
        };

        const response = await this.apiClient.request({
          method: 'POST',
          url: `/notes/edit/${noteId}`,
          params: this.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          if (data.status?.code === 'NOT FOUND' || data.status?.code === 'ACTION NOT FOUND') {
            throw new WFirmaError(
              'WFIRMA_NOT_FOUND',
              `Note with ID ${noteId} not found`,
              data.status,
              404
            );
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            data.status?.message || 'Failed to edit note',
            data.status
          );
        }

        let noteData = data.notes?.note;
        if (!noteData) {
          const notesObj = data.notes;
          if (notesObj) {
            for (const key in notesObj) {
              if (!isNaN(Number(key)) && notesObj[key]?.note) {
                noteData = notesObj[key].note;
                break;
              }
            }
          }
        }

        if (!noteData) {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'No note data in response',
            data
          );
        }

        logger.info('Successfully edited note', { noteId });

        return {
          id: noteData.id,
          objectName: noteData.object_name,
          objectId: noteData.object_id,
          text: noteData.text,
          created: new Date(noteData.created),
          modified: new Date(noteData.modified),
        };
      } catch (error) {
        logger.error('Failed to edit note', { error, noteId });
        throw error;
      }
    });
  }

  /**
   * Delete a note
   */
  async deleteNote(noteId: string): Promise<DeleteResult> {
    logger.info('Deleting note', { noteId });

    return this.withRetry(async () => {
      try {
        if (!noteId) {
          throw new WFirmaValidationError('Note ID is required');
        }

        const response = await this.apiClient.request({
          method: 'DELETE',
          url: `/notes/delete/${noteId}`,
          params: this.buildQueryParams(),
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          if (data.status?.code === 'NOT FOUND' || data.status?.code === 'ACTION NOT FOUND') {
            throw new WFirmaError(
              'WFIRMA_NOT_FOUND',
              `Note with ID ${noteId} not found`,
              data.status,
              404
            );
          }
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            data.status?.message || 'Failed to delete note',
            data.status
          );
        }

        logger.info('Successfully deleted note', { noteId });

        return {
          success: true,
          id: noteId,
          message: `Note ${noteId} deleted successfully`,
        };
      } catch (error) {
        logger.error('Failed to delete note', { error, noteId });
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

  /**
   * Map sort field name to wFirma field
   */
  private mapInvoiceSortField(sortBy: string): string {
    const fieldMap: Record<string, string> = {
      date: 'Invoice.date',
      dueDate: 'Invoice.paymentdate',
      total: 'Invoice.total',
      invoiceNumber: 'Invoice.fullnumber',
    };
    return fieldMap[sortBy] || 'Invoice.id';
  }

  /**
   * Map wFirma invoice data to our WFirmaInvoice type
   */
  private mapInvoiceData(inv: any): WFirmaInvoice {
    // Parse invoice items
    const items: WFirmaInvoiceItem[] = [];
    if (inv.invoicecontents) {
      let contentsData = inv.invoicecontents.invoicecontent;
      if (!contentsData) {
        // Try indexed format
        const contentsObj = inv.invoicecontents;
        contentsData = [];
        for (const key in contentsObj) {
          if (!isNaN(Number(key)) && contentsObj[key]?.invoicecontent) {
            contentsData.push(contentsObj[key].invoicecontent);
          }
        }
      }
      if (contentsData && !Array.isArray(contentsData)) {
        contentsData = [contentsData];
      }
      if (contentsData) {
        for (const item of contentsData) {
          items.push({
            name: item.name || '',
            quantity: parseFloat(item.count || '1'),
            unit: item.unit || 'szt.',
            priceNet: parseFloat(item.price || '0'),
            vatRate: parseFloat(item.vat || '23'),
            totalNet: parseFloat(item.netto || '0'),
            totalVat: parseFloat(item.vat_price || '0'),
            totalGross: parseFloat(item.brutto || '0'),
          });
        }
      }
    }

    // Determine status based on payment and dates
    let status: 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'cancelled' = 'issued';
    const alreadyPaid = parseFloat(inv.alreadypaid || '0');
    const total = parseFloat(inv.total || inv.brutto || '0');
    const paymentDate = inv.paymentdate ? new Date(inv.paymentdate) : null;
    const now = new Date();

    if (inv.disposaldate_empty === '1' || inv.type === 'proforma') {
      status = 'draft';
    } else if (alreadyPaid >= total && total > 0) {
      status = 'paid';
    } else if (paymentDate && paymentDate < now && alreadyPaid < total) {
      status = 'overdue';
    } else if (inv.sended === '1') {
      status = 'sent';
    }

    return {
      id: inv.id || '',
      invoiceNumber: inv.fullnumber || inv.number || '',
      issueDate: new Date(inv.date || Date.now()),
      dueDate: paymentDate || new Date(inv.date || Date.now()),
      sellDate: inv.disposaldate ? new Date(inv.disposaldate) : undefined,
      contractorId: inv.contractor || '',
      contractorName: inv.contractor_name || inv.contractorDetail?.name || '',
      contractorNip: inv.contractor_nip || inv.contractorDetail?.nip,
      items,
      total: parseFloat(inv.total || inv.brutto || '0'),
      totalNet: parseFloat(inv.netto || '0'),
      totalVat: parseFloat(inv.tax || '0'),
      currency: inv.currency || 'PLN',
      status,
      paymentMethod: inv.paymentmethod,
      notes: inv.notes,
      createdAt: new Date(inv.created || Date.now()),
      updatedAt: new Date(inv.modified || Date.now()),
    };
  }
}
