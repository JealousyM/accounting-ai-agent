import { CompanyEnrichmentService, validateNip } from '../company-enrichment.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock cache service
const mockCacheService = {
  getCachedData: jest.fn(),
  getCachedDataAllowStale: jest.fn(),
  cacheData: jest.fn(),
};

describe('validateNip', () => {
  it('should validate correct NIP', () => {
    // 5833510147 is a real NIP (Micode Sp. z o. o.)
    expect(validateNip('5833510147')).toBe(true);
  });

  it('should reject NIP with wrong checksum', () => {
    expect(validateNip('5833510148')).toBe(false);
  });

  it('should reject non-10-digit strings', () => {
    expect(validateNip('123')).toBe(false);
    expect(validateNip('abcdefghij')).toBe(false);
    expect(validateNip('')).toBe(false);
  });

  it('should reject NIP where modulo 11 equals 10', () => {
    // A NIP where the weighted sum mod 11 = 10 should be invalid
    // We need to find/construct such a NIP programmatically
    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    // Try to find a 9-digit prefix where weighted sum mod 11 = 10
    for (let i = 100000000; i < 100001000; i++) {
      const digits = i.toString();
      const sum = weights.reduce((acc, w, idx) => acc + w * parseInt(digits[idx], 10), 0);
      if (sum % 11 === 10) {
        // This NIP is invalid regardless of the 10th digit
        expect(validateNip(digits + '0')).toBe(false);
        expect(validateNip(digits + '5')).toBe(false);
        break;
      }
    }
  });
});

describe('CompanyEnrichmentService', () => {
  let service: CompanyEnrichmentService;

  beforeEach(() => {
    service = new CompanyEnrichmentService(mockCacheService as any);
    jest.clearAllMocks();
  });

  describe('enrichByNip', () => {
    it('should return cached data if available', async () => {
      const cachedData = { nip: '5833510147', regon: '523456789' };
      mockCacheService.getCachedData.mockResolvedValue(cachedData);

      const result = await service.enrichByNip('5833510147', 'user-123');

      expect(result).toEqual(cachedData);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should fetch from MF and KRS when cache is empty', async () => {
      mockCacheService.getCachedData.mockResolvedValue(null);
      mockCacheService.cacheData.mockResolvedValue(undefined);

      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('wl-api.mf.gov.pl')) {
          return Promise.resolve({
            data: {
              result: {
                subject: {
                  regon: '523456789',
                  krs: '0001234567',
                  statusVat: 'Czynny',
                  accountNumbers: ['PL12345678901234567890123456'],
                },
              },
            },
          });
        }
        if (url.includes('OdpisSzukaj')) {
          return Promise.resolve({
            data: { items: [{ krsNumber: '0001234567' }] },
          });
        }
        if (url.includes('OdpisAktualny')) {
          return Promise.resolve({
            data: {
              odpis: {
                dane: {
                  formaPrawna: 'SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ',
                  kapitalZakladowy: { wartosc: '5000.00', waluta: 'PLN' },
                },
              },
            },
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      const result = await service.enrichByNip('5833510147', 'user-123');

      expect(result).toBeDefined();
      expect(result!.regon).toBe('523456789');
      expect(result!.krs).toBe('0001234567');
      expect(result!.vatStatus).toBe('czynny');
      expect(result!.verifiedBankAccounts).toEqual(['PL12345678901234567890123456']);
      expect(result!.krsData?.legalForm).toBe('SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ');
      expect(result!.krsData?.shareCapital).toBe('5000.00 PLN');
      expect(mockCacheService.cacheData).toHaveBeenCalled();
    });

    it('should return partial data when KRS fails', async () => {
      mockCacheService.getCachedData.mockResolvedValue(null);
      mockCacheService.cacheData.mockResolvedValue(undefined);

      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('wl-api.mf.gov.pl')) {
          return Promise.resolve({
            data: { result: { subject: { regon: '523456789', statusVat: 'Czynny' } } },
          });
        }
        return Promise.reject(new Error('KRS unavailable'));
      });

      const result = await service.enrichByNip('5833510147', 'user-123');

      expect(result).toBeDefined();
      expect(result!.regon).toBe('523456789');
      expect(result!.krsData).toBeUndefined();
    });

    it('should fall back to stale cache when all APIs fail', async () => {
      mockCacheService.getCachedData.mockResolvedValue(null);
      const staleData = { nip: '5833510147', regon: '523456789' };
      mockCacheService.getCachedDataAllowStale.mockResolvedValue(staleData);

      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await service.enrichByNip('5833510147', 'user-123');

      expect(result).toEqual(staleData);
      expect(mockCacheService.getCachedDataAllowStale).toHaveBeenCalled();
    });

    it('should return null when all APIs fail and no stale cache', async () => {
      mockCacheService.getCachedData.mockResolvedValue(null);
      mockCacheService.getCachedDataAllowStale.mockResolvedValue(null);

      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await service.enrichByNip('5833510147', 'user-123');

      expect(result).toBeNull();
    });
  });
});
