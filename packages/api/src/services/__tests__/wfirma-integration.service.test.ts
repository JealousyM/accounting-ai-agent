import axios from 'axios';
import { 
  WFirmaIntegrationService,
  WFirmaValidationError,
} from '../wfirma-integration.service';
import { WFirmaCompany, WFirmaContractor } from '../../types/wfirma.types';

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
      request: jest.fn(),
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
          status: { code: 'OK' },
          companies: {
            company: {
              id: mockCompanyData.id,
              name: mockCompanyData.name,
              nip: mockCompanyData.nip,
              street: mockCompanyData.address.street,
              city: mockCompanyData.address.city,
              zip: mockCompanyData.address.zip,
              country: mockCompanyData.address.country,
              account: mockCompanyData.bankAccounts[0].accountNumber,
              bank: mockCompanyData.bankAccounts[0].bankName,
            },
          },
        },
      });

      const result = await service.getCompanyData();

      expect(result.id).toBe(mockCompanyData.id);
      expect(result.name).toBe(mockCompanyData.name);
      expect(result.nip).toBe(mockCompanyData.nip);
    });

    it('should throw error when API returns unsuccessful response', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: {
          status: { code: 'ERROR', message: 'Company not found' },
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
            status: { code: 'OK' },
            companies: {
              company: {
                id: 'company-123',
                name: 'Test Company',
                nip: '1234567890',
                street: 'Test St',
                city: 'Warsaw',
                zip: '00-001',
                country: 'Poland',
              },
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

      mockAxiosInstance.request.mockResolvedValue({
        status: 200,
        data: {
          status: { code: 'OK' },
          contractors: {
            '0': {
              contractor: {
                id: mockContractors[0].id,
                name: mockContractors[0].name,
                nip: mockContractors[0].nip,
                email: mockContractors[0].email,
              },
            },
            '1': {
              contractor: {
                id: mockContractors[1].id,
                name: mockContractors[1].name,
                nip: mockContractors[1].nip,
                email: mockContractors[1].email,
              },
            },
          },
        },
      });

      const filters = {
        search: 'Contractor',
        limit: 10,
        offset: 0,
      };

      const result = await service.getContractors(filters);

      expect(result.length).toBe(2);
      expect(result[0].id).toBe(mockContractors[0].id);
      expect(result[1].id).toBe(mockContractors[1].id);
    });

    it('should use default pagination when no filters provided', async () => {
      mockAxiosInstance.request.mockResolvedValue({
        status: 200,
        data: {
          status: { code: 'OK' },
          contractors: {},
        },
      });

      const result = await service.getContractors();

      expect(result).toEqual([]);
      expect(mockAxiosInstance.request).toHaveBeenCalled();
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

      mockAxiosInstance.request.mockResolvedValue({
        status: 200,
        data: {
          status: { code: 'OK' },
          contractor: {
            id: mockCreatedContractor.id,
            name: mockCreatedContractor.name,
            nip: mockCreatedContractor.nip,
            email: mockCreatedContractor.email,
            street: mockCreatedContractor.address?.street,
            city: mockCreatedContractor.address?.city,
            zip: mockCreatedContractor.address?.zip,
            country: mockCreatedContractor.address?.country,
          },
        },
      });

      const result = await service.createContractor(contractorData);

      expect(result.id).toBe(mockCreatedContractor.id);
      expect(result.name).toBe(mockCreatedContractor.name);
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
      mockAxiosInstance.request.mockResolvedValue({
        status: 200,
        data: {
          status: { code: 'OK' },
          invoices: {
            '0': {
              invoice: {
                id: 'inv-1',
                type: 'normal',
                total: '600000',
                brutto: '600000',
              },
            },
            '1': {
              invoice: {
                id: 'inv-2',
                type: 'normal',
                total: '400000',
                brutto: '400000',
              },
            },
            '2': {
              invoice: {
                id: 'inv-3',
                type: 'purchase',
                total: '600000',
                brutto: '600000',
              },
            },
          },
        },
      });

      const result = await service.getFinancialData(2024);

      expect(result.year).toBe(2024);
      expect(result.revenue).toBe(1000000);
      expect(result.expenses).toBe(600000);
      expect(result.profit).toBe(400000);
    });
  });

  describe('syncDataFromWFirma', () => {
    it('should sync all data successfully', async () => {
      // Mock company data
      mockAxiosInstance.get.mockResolvedValueOnce({
        status: 200,
        data: {
          status: { code: 'OK' },
          companies: {
            company: {
              id: 'company-123',
              name: 'Test Company',
              nip: '1234567890',
              street: 'Test',
              city: 'Warsaw',
              zip: '00-001',
              country: 'Poland',
            },
          },
        },
      });

      // Mock contractors
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: {
          status: { code: 'OK' },
          contractors: {
            '0': {
              contractor: {
                id: 'c1',
                name: 'Contractor 1',
              },
            },
          },
        },
      });

      // Mock financial data (invoices)
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: {
          status: { code: 'OK' },
          invoices: {},
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
          status: { code: 'OK' },
          companies: {
            company: {
              id: 'company-123',
              name: 'Test Company',
              nip: '1234567890',
              street: 'Test',
              city: 'Warsaw',
              zip: '00-001',
              country: 'Poland',
            },
          },
        },
      });

      // Mock contractors failure - return unsuccessful response
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: {
          status: { code: 'ERROR', message: 'Contractors API error' },
        },
      });

      // Mock financial data success
      mockAxiosInstance.request.mockResolvedValueOnce({
        status: 200,
        data: {
          status: { code: 'OK' },
          invoices: {},
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
        data: {
          status: { code: 'OK' },
          companies: {
            company: {
              id: 'company-123',
              name: 'Test Company',
              nip: '1234567890',
            },
          },
        },
      });

      const result = await service.checkConnection();

      expect(result).toBe(true);
    });

    it('should return false when connection fails', async () => {
      mockAxiosInstance.get
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'));

      const result = await service.checkConnection();

      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: {
          status: { code: 'AUTH', message: 'Invalid API key' },
        },
      });

      await expect(service.getCompanyData()).rejects.toThrow();
    });

    it('should handle validation errors', async () => {
      await expect(
        service.createContractor({ name: '' })
      ).rejects.toThrow(WFirmaValidationError);
    });

    it('should retry on connection errors', async () => {
      mockAxiosInstance.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          status: 200,
          data: {
            status: { code: 'OK' },
            companies: {
              company: {
                id: 'company-123',
                name: 'Test Company',
                nip: '1234567890',
                street: 'Test',
                city: 'Warsaw',
                zip: '00-001',
                country: 'Poland',
              },
            },
          },
        });

      const result = await service.getCompanyData();

      expect(result.id).toBe('company-123');
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });
  });
});
