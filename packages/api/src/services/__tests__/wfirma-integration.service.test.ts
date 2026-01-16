import axios from 'axios';
import { 
  WFirmaIntegrationService,
  WFirmaAuthenticationError,
  WFirmaValidationError,
} from '../wfirma-integration.service';
import { WFirmaCompany, WFirmaContractor, FinancialData } from '../../types/wfirma.types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('WFirmaIntegrationService', () => {
  let service: WFirmaIntegrationService;
  let mockAxiosInstance: any;

  beforeAll(() => {
    // Setup mock axios instance that will be used for all tests
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create service instance with test config
    service = new WFirmaIntegrationService({
      accessKey: 'test-access-key',
      secretKey: 'test-secret-key',
      appKey: 'test-app-key',
      apiUrl: 'https://test.wfirma.pl',
      companyId: 'test-company-id',
      timeout: 5000,
      retryAttempts: 2,
    });
  });

  describe('getCompanyData', () => {
    it('should fetch company data successfully', async () => {
      const mockCompanyData: WFirmaCompany = {
        id: 'company-123',
        name: 'Test Company Sp. z o.o.',
        nip: '1234567890',
        address: {
          street: 'ul. Testowa 1',
          city: 'Warszawa',
          zip: '00-001',
          country: 'Polska',
        },
        bankAccounts: [
          {
            accountNumber: 'PL12345678901234567890123456',
            bankName: 'Test Bank',
          },
        ],
      };

      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: {
          success: true,
          data: mockCompanyData,
        },
      });

      const result = await service.getCompanyData();

      expect(result).toEqual(mockCompanyData);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/companies/current');
    });

    it('should throw error when API returns unsuccessful response', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: {
          success: false,
          error: 'Company not found',
        },
      });

      await expect(service.getCompanyData()).rejects.toThrow();
    });

    it('should retry on connection error', async () => {
      mockAxiosInstance.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          status: 200,
          data: {
            success: true,
            data: {
              id: 'company-123',
              name: 'Test Company',
              nip: '1234567890',
              address: {
                street: 'Test St',
                city: 'Warsaw',
                zip: '00-001',
                country: 'Poland',
              },
              bankAccounts: [],
            },
          },
        });

      const result = await service.getCompanyData();

      expect(result.id).toBe('company-123');
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('getContractors', () => {
    it('should fetch contractors with filters', async () => {
      const mockContractors: WFirmaContractor[] = [
        {
          id: 'contractor-1',
          name: 'Contractor One',
          nip: '1111111111',
          email: 'contractor1@example.com',
        },
        {
          id: 'contractor-2',
          name: 'Contractor Two',
          nip: '2222222222',
          email: 'contractor2@example.com',
        },
      ];

      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: {
          success: true,
          data: mockContractors,
        },
      });

      const filters = {
        search: 'Contractor',
        limit: 10,
        offset: 0,
      };

      const result = await service.getContractors(filters);

      expect(result).toEqual(mockContractors);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/contractors', {
        params: {
          search: 'Contractor',
          nip: undefined,
          limit: 10,
          offset: 0,
        },
      });
    });

    it('should use default pagination when no filters provided', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: {
          success: true,
          data: [],
        },
      });

      await service.getContractors();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/contractors', {
        params: {
          search: undefined,
          nip: undefined,
          limit: 100,
          offset: 0,
        },
      });
    });
  });

  describe('createContractor', () => {
    it('should create contractor successfully', async () => {
      const contractorData = {
        name: 'New Contractor',
        nip: '3333333333',
        email: 'new@example.com',
        address: {
          street: 'ul. Nowa 1',
          city: 'Kraków',
          zip: '30-001',
          country: 'Polska',
        },
      };

      const mockCreatedContractor: WFirmaContractor = {
        id: 'contractor-new',
        ...contractorData,
      };

      mockAxiosInstance.post.mockResolvedValue({
        status: 201,
        data: {
          success: true,
          data: mockCreatedContractor,
        },
      });

      const result = await service.createContractor(contractorData);

      expect(result).toEqual(mockCreatedContractor);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/contractors', contractorData);
    });

    it('should throw validation error when name is missing', async () => {
      const invalidData = {
        name: '',
        email: 'test@example.com',
      };

      await expect(service.createContractor(invalidData)).rejects.toThrow(
        WFirmaValidationError
      );
    });
  });

  describe('getFinancialData', () => {
    it('should fetch financial data for a year', async () => {
      const mockFinancialData: FinancialData = {
        year: 2024,
        revenue: 1000000,
        expenses: 600000,
        profit: 400000,
        taxPaid: 76000,
      };

      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: {
          success: true,
          data: mockFinancialData,
        },
      });

      const result = await service.getFinancialData(2024);

      expect(result).toEqual(mockFinancialData);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/financial/summary/2024');
    });
  });

  describe('syncDataFromWFirma', () => {
    it('should sync all data successfully', async () => {
      // Mock company data
      mockAxiosInstance.get.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          data: {
            id: 'company-123',
            name: 'Test Company',
            nip: '1234567890',
            address: { street: 'Test', city: 'Warsaw', zip: '00-001', country: 'Poland' },
            bankAccounts: [],
          },
        },
      });

      // Mock contractors
      mockAxiosInstance.get.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          data: [{ id: 'c1', name: 'Contractor 1' }],
        },
      });

      // Mock financial data
      mockAxiosInstance.get.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          data: {
            year: 2024,
            revenue: 1000000,
            expenses: 600000,
            profit: 400000,
            taxPaid: 76000,
          },
        },
      });

      const result = await service.syncDataFromWFirma();

      expect(result.success).toBe(true);
      expect(result.itemsSynced).toBe(3);
      expect(result.errors).toBeUndefined();
    });

    it('should handle partial sync failures', async () => {
      // Mock company data success
      mockAxiosInstance.get.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          data: {
            id: 'company-123',
            name: 'Test Company',
            nip: '1234567890',
            address: { street: 'Test', city: 'Warsaw', zip: '00-001', country: 'Poland' },
            bankAccounts: [],
          },
        },
      });

      // Mock contractors failure - return unsuccessful response
      mockAxiosInstance.get.mockResolvedValueOnce({
        status: 200,
        data: {
          success: false,
          error: 'Contractors API error',
        },
      });

      // Mock financial data success
      mockAxiosInstance.get.mockResolvedValueOnce({
        status: 200,
        data: {
          success: true,
          data: {
            year: 2024,
            revenue: 1000000,
            expenses: 600000,
            profit: 400000,
            taxPaid: 76000,
          },
        },
      });

      const result = await service.syncDataFromWFirma();

      expect(result.success).toBe(false);
      expect(result.itemsSynced).toBe(2);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('checkConnection', () => {
    it('should return true when connection is successful', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: { status: 'ok' },
      });

      const result = await service.checkConnection();

      expect(result).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health');
    });

    it('should return false when connection fails', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Connection failed'));

      const result = await service.checkConnection();

      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      const authError = new WFirmaAuthenticationError('Invalid API key');
      mockAxiosInstance.get.mockRejectedValue(authError);

      await expect(service.getCompanyData()).rejects.toThrow(WFirmaAuthenticationError);
      // Should not retry on auth errors
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    it('should handle validation errors', async () => {
      const validationError = new WFirmaValidationError('Invalid data');
      mockAxiosInstance.post.mockRejectedValue(validationError);

      await expect(
        service.createContractor({ name: 'Test' })
      ).rejects.toThrow(WFirmaValidationError);
      // Should not retry on validation errors
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

    it('should retry on connection errors', async () => {
      mockAxiosInstance.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          status: 200,
          data: {
            success: true,
            data: {
              id: 'company-123',
              name: 'Test Company',
              nip: '1234567890',
              address: { street: 'Test', city: 'Warsaw', zip: '00-001', country: 'Poland' },
              bankAccounts: [],
            },
          },
        });

      const result = await service.getCompanyData();

      expect(result.id).toBe('company-123');
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });
});
