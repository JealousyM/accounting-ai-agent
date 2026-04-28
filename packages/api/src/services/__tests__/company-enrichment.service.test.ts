import {
  CompanyEnrichmentService,
  validateNip,
  parsePolishAddress,
  normalizeBankAccount,
} from '../company-enrichment.service';
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
                  name: 'MICODE SP. Z O.O.',
                  regon: '523456789',
                  krs: '0001234567',
                  statusVat: 'Czynny',
                  accountNumbers: ['PL12345678901234567890123456'],
                  workingAddress: 'UL. PIĘKNA 47B/8, 00-672 WARSZAWA',
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
      expect(result!.name).toBe('MICODE SP. Z O.O.');
      expect(result!.regon).toBe('523456789');
      expect(result!.krs).toBe('0001234567');
      expect(result!.vatStatus).toBe('czynny');
      expect(result!.verifiedBankAccounts).toEqual(['PL12345678901234567890123456']);
      expect(result!.workingAddress).toBe('UL. PIĘKNA 47B/8, 00-672 WARSZAWA');
      expect(result!.krsData?.legalForm).toBe('SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ');
      expect(result!.krsData?.shareCapital).toBe('5000.00 PLN');
      expect(mockCacheService.cacheData).toHaveBeenCalled();
    });

    it('extracts residenceAddress for sole proprietors (no working address)', async () => {
      mockCacheService.getCachedData.mockResolvedValue(null);
      mockCacheService.cacheData.mockResolvedValue(undefined);
      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('wl-api.mf.gov.pl')) {
          return Promise.resolve({
            data: {
              result: {
                subject: {
                  name: 'JAN KOWALSKI - INDYWIDUALNA DZIAŁALNOŚĆ',
                  statusVat: 'Czynny',
                  residenceAddress: 'UL. KWIATOWA 5, 30-010 KRAKÓW',
                },
              },
            },
          });
        }
        return Promise.reject(new Error('KRS unavailable'));
      });

      const result = await service.enrichByNip('5833510147', 'user-123');
      expect(result!.name).toBe('JAN KOWALSKI - INDYWIDUALNA DZIAŁALNOŚĆ');
      expect(result!.residenceAddress).toBe('UL. KWIATOWA 5, 30-010 KRAKÓW');
      expect(result!.workingAddress).toBeUndefined();
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

  describe('verifyBankAccount', () => {
    const NIP = '5833510147';
    const ACCOUNT = '12345678901234567890123456';
    const USER = 'user-123';

    it('returns accountAssigned=true when MF says TAK', async () => {
      mockCacheService.getCachedData.mockResolvedValue(null);
      mockCacheService.cacheData.mockResolvedValue(undefined);
      mockedAxios.get.mockResolvedValue({
        data: { result: { accountAssigned: 'TAK', requestId: 'aa-bb-cc' } },
      });

      const result = await service.verifyBankAccount(NIP, ACCOUNT, USER, '2026-04-28');

      expect(result).toEqual({
        nip: NIP,
        accountNumber: ACCOUNT,
        date: '2026-04-28',
        accountAssigned: true,
        requestId: 'aa-bb-cc',
      });
      const calledUrl = mockedAxios.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain(`/api/check/nip/${NIP}/bank-account/${ACCOUNT}`);
      expect(calledUrl).toContain('date=2026-04-28');
      expect(mockCacheService.cacheData).toHaveBeenCalledWith(
        USER,
        'public_registry',
        `nip_${NIP}_acct_${ACCOUNT}_2026-04-28`,
        expect.objectContaining({ accountAssigned: true }),
      );
    });

    it('returns accountAssigned=false when MF says NIE', async () => {
      mockCacheService.getCachedData.mockResolvedValue(null);
      mockCacheService.cacheData.mockResolvedValue(undefined);
      mockedAxios.get.mockResolvedValue({
        data: { result: { accountAssigned: 'NIE', requestId: 'xx' } },
      });

      const result = await service.verifyBankAccount(NIP, ACCOUNT, USER, '2026-04-28');

      expect(result).not.toBeNull();
      expect(result!.accountAssigned).toBe(false);
    });

    it('returns cached result without calling MF if cache hit', async () => {
      const cached = {
        nip: NIP,
        accountNumber: ACCOUNT,
        date: '2026-04-28',
        accountAssigned: true,
        requestId: 'cached',
      };
      mockCacheService.getCachedData.mockResolvedValue(cached);

      const result = await service.verifyBankAccount(NIP, ACCOUNT, USER, '2026-04-28');

      expect(result).toEqual(cached);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('falls back to stale cache when MF API fails', async () => {
      const stale = {
        nip: NIP,
        accountNumber: ACCOUNT,
        date: '2026-04-27',
        accountAssigned: true,
      };
      mockCacheService.getCachedData.mockResolvedValue(null);
      mockCacheService.getCachedDataAllowStale.mockResolvedValue(stale);
      mockedAxios.get.mockRejectedValue(new Error('502 Bad Gateway'));

      const result = await service.verifyBankAccount(NIP, ACCOUNT, USER, '2026-04-28');

      expect(result).toEqual(stale);
    });

    it('returns null when MF response shape is unexpected', async () => {
      mockCacheService.getCachedData.mockResolvedValue(null);
      mockedAxios.get.mockResolvedValue({ data: { result: { unrelated: true } } });

      const result = await service.verifyBankAccount(NIP, ACCOUNT, USER, '2026-04-28');

      expect(result).toBeNull();
    });
  });
});

describe('normalizeBankAccount', () => {
  it('accepts a 26-digit NRB without separators', () => {
    expect(normalizeBankAccount('12345678901234567890123456')).toBe(
      '12345678901234567890123456',
    );
  });

  it('strips spaces from NRB-with-spaces', () => {
    expect(normalizeBankAccount('12 3456 7890 1234 5678 9012 3456')).toBe(
      '12345678901234567890123456',
    );
  });

  it('strips PL prefix from IBAN', () => {
    expect(normalizeBankAccount('PL12345678901234567890123456')).toBe(
      '12345678901234567890123456',
    );
  });

  it('strips PL prefix and spaces together', () => {
    expect(normalizeBankAccount('PL 12 3456 7890 1234 5678 9012 3456')).toBe(
      '12345678901234567890123456',
    );
  });

  it('rejects too-short input', () => {
    expect(normalizeBankAccount('123')).toBeNull();
  });

  it('rejects non-digit characters in body', () => {
    expect(normalizeBankAccount('PL12345abcdef234567890123456')).toBeNull();
  });

  it('rejects empty input', () => {
    expect(normalizeBankAccount('')).toBeNull();
  });
});

describe('parsePolishAddress', () => {
  it('parses "STREET NN, ZIP CITY" format', () => {
    expect(parsePolishAddress('UL. PIĘKNA 47B/8, 00-672 WARSZAWA')).toEqual({
      street: 'UL. PIĘKNA 47B/8',
      city: 'WARSZAWA',
      zip: '00-672',
    });
  });

  it('parses without leading "UL." prefix', () => {
    expect(parsePolishAddress('PIĘKNA 47B/8, 00-672 WARSZAWA')).toEqual({
      street: 'PIĘKNA 47B/8',
      city: 'WARSZAWA',
      zip: '00-672',
    });
  });

  it('parses without comma separator', () => {
    expect(parsePolishAddress('PIĘKNA 47B/8 00-672 WARSZAWA')).toEqual({
      street: 'PIĘKNA 47B/8',
      city: 'WARSZAWA',
      zip: '00-672',
    });
  });

  it('parses reversed order ("ZIP CITY, STREET")', () => {
    expect(parsePolishAddress('00-672 WARSZAWA, UL. PIĘKNA 47B/8')).toEqual({
      street: 'UL. PIĘKNA 47B/8',
      city: 'WARSZAWA',
      zip: '00-672',
    });
  });

  it('returns street-only for input without postcode', () => {
    expect(parsePolishAddress('SOMEWHERE')).toEqual({ street: 'SOMEWHERE' });
  });

  it('returns empty object for empty input', () => {
    expect(parsePolishAddress('')).toEqual({});
  });
});
