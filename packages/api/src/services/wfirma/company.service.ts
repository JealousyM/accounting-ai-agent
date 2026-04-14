/**
 * wFirma Company Service
 * Handles company data operations
 */

import { logger } from '../../utils/logger';
import {
  WFirmaCompany,
  WFirmaCompanyAccount,
  WFirmaCompanyAddress,
  WFirmaCompanyPack,
  WFirmaCompanyDetails,
  CompanyAddressType,
  CompanyPackType,
} from '../../types/wfirma.types';
import { WFirmaClient } from './client';
import { WFirmaError } from './errors';

export class WFirmaCompanyService {
  constructor(private readonly client: WFirmaClient) {}

  /**
   * Get company data from wFirma
   */
  async getCompanyData(): Promise<WFirmaCompany> {
    logger.info('Fetching company data from wFirma');

    return this.client.withRetry(async () => {
      try {
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

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: '/companies/find',
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        // Debug logging - raw API response
        logger.info('wFirma companies raw response', {
          status: data.status,
          companiesKeys: data.companies ? Object.keys(data.companies) : null,
          rawCompanies: JSON.stringify(data.companies).substring(0, 1000),
        });

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch company data',
            data.status
          );
        }

        // Extract company data from response
        let companyData = data.companies?.company;

        if (!companyData && data.companies?.['0']?.company) {
          companyData = data.companies['0'].company;
        }

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

        const company: WFirmaCompany = {
          id: companyData.id || companyData.company_id || this.client.config.companyId || '',
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
          altname: companyData.altname || undefined,
          vatPayer: companyData.vat_payer === '1',
          taxType: companyData.tax || undefined,
          bookStartDate: companyData.book_start_date || undefined,
          packRights: (() => {
            // pack_rights come as numbered sub-objects: {"0": {"pack_rights": "trade"}, "1": {"pack_rights": "book"}, ...}
            const rights: string[] = [];
            if (companyData && typeof companyData === 'object') {
              for (const key of Object.keys(companyData)) {
                const val = companyData[key];
                if (typeof val === 'object' && val !== null && 'pack_rights' in val) {
                  rights.push(val.pack_rights);
                }
              }
            }
            return rights.length > 0 ? rights : undefined;
          })(),
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
   * Get company bank accounts from wFirma
   */
  async getCompanyAccounts(): Promise<WFirmaCompanyAccount[]> {
    logger.info('Fetching company accounts from wFirma');

    return this.client.withRetry(async () => {
      try {
        const payload = {
          api: {
            company_accounts: {
              parameters: {
                limit: 100,
                page: 1,
              },
            },
          },
        };

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: '/company_accounts/find',
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        // Debug logging - raw API response for company_accounts
        logger.info('wFirma company_accounts raw response', {
          status: data.status,
          parametersTotal: data.company_accounts?.parameters?.total,
          accountsKeys: data.company_accounts ? Object.keys(data.company_accounts) : null,
          rawAccounts: JSON.stringify(data.company_accounts).substring(0, 2000),
        });

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch company accounts',
            data.status
          );
        }

        const accounts: WFirmaCompanyAccount[] = [];
        const accountsData = data.company_accounts;

        if (accountsData) {
          // Handle different response formats
          const accountsList = Array.isArray(accountsData.company_account)
            ? accountsData.company_account
            : accountsData.company_account
            ? [accountsData.company_account]
            : Object.values(accountsData).filter(
                (item: unknown) => typeof item === 'object' && item !== null && 'company_account' in (item as Record<string, unknown>)
              ).map((item: unknown) => (item as Record<string, unknown>).company_account);

          for (const acc of accountsList) {
            if (acc) {
              // Log each account's raw data to see available fields
              logger.info('Processing company account', {
                rawAccount: JSON.stringify(acc),
                availableKeys: Object.keys(acc),
              });

              accounts.push({
                id: acc.id || '',
                accountNumber: acc.number || acc.account || acc.account_number || '',
                bankName: acc.bank || acc.bank_name || undefined,
                swift: acc.swift || undefined,
                isDefault: acc.is_default === '1' || acc.default === true || false,
                currency: acc.currency || 'PLN',
              });
            }
          }
        }

        logger.info('Successfully fetched company accounts from wFirma', {
          count: accounts.length,
        });

        return accounts;
      } catch (error) {
        logger.error('Failed to fetch company accounts from wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Get company addresses from wFirma
   */
  async getCompanyAddresses(): Promise<WFirmaCompanyAddress[]> {
    logger.info('Fetching company addresses from wFirma');

    return this.client.withRetry(async () => {
      try {
        const payload = {
          api: {
            company_addresses: {
              parameters: {
                limit: 100,
                page: 1,
              },
            },
          },
        };

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: '/company_addresses/find',
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch company addresses',
            data.status
          );
        }

        const addresses: WFirmaCompanyAddress[] = [];
        const addressesData = data.company_addresses;

        if (addressesData) {
          // Handle different response formats
          const addressList = Array.isArray(addressesData.company_address)
            ? addressesData.company_address
            : addressesData.company_address
            ? [addressesData.company_address]
            : Object.values(addressesData).filter(
                (item: unknown) => typeof item === 'object' && item !== null && 'company_address' in (item as Record<string, unknown>)
              ).map((item: unknown) => (item as Record<string, unknown>).company_address);

          for (const addr of addressList) {
            if (addr) {
              const addressType = this.mapAddressType(addr.type || addr.address_type);
              addresses.push({
                id: addr.id || '',
                type: addressType,
                street: addr.street || undefined,
                city: addr.city || addr.post || undefined,
                zip: addr.zip || undefined,
                country: addr.country || 'PL',
                isMain: addr.is_main === '1' || addr.main === true || addressType === 'main',
                buildingNumber: addr.building_number || undefined,
                flatNumber: addr.flat_number || undefined,
                commune: addr.commune || undefined,
                district: addr.district || undefined,
                voivodeship: addr.voivodeship || undefined,
              });
            }
          }
        }

        logger.info('Successfully fetched company addresses from wFirma', {
          count: addresses.length,
        });

        return addresses;
      } catch (error) {
        logger.error('Failed to fetch company addresses from wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Get company subscription/pack info from wFirma
   */
  async getCompanyPack(): Promise<WFirmaCompanyPack | null> {
    logger.info('Fetching company pack/subscription from wFirma');

    return this.client.withRetry(async () => {
      try {
        const payload = {
          api: {
            company_packs: {
              parameters: {
                limit: 1,
                page: 1,
                order: { expiration_date: 'desc' },
              },
            },
          },
        };

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: '/company_packs/find',
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        // Debug logging - raw API response for company_packs
        logger.info('wFirma company_packs raw response', {
          status: data.status,
          parametersTotal: data.company_packs?.parameters?.total,
          packsKeys: data.company_packs ? Object.keys(data.company_packs) : null,
          rawPacks: JSON.stringify(data.company_packs).substring(0, 2000),
          fullResponseKeys: Object.keys(data),
        });

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch company pack',
            data.status
          );
        }

        const packsData = data.company_packs;
        let packData = null;

        if (packsData) {
          // Handle different response formats (matching the robust handling in other methods)
          if (packsData.company_pack) {
            packData = Array.isArray(packsData.company_pack)
              ? packsData.company_pack[0]
              : packsData.company_pack;
          } else if (packsData['0']?.company_pack) {
            packData = packsData['0'].company_pack;
          } else {
            // Try to find company_pack in any nested object (like {0: {company_pack: {...}}})
            const foundPacks = Object.values(packsData).filter(
              (item: unknown) => typeof item === 'object' && item !== null && 'company_pack' in (item as Record<string, unknown>)
            ).map((item: unknown) => (item as Record<string, unknown>).company_pack);

            if (foundPacks.length > 0) {
              packData = foundPacks[0];
              logger.info('Found company_pack using Object.values fallback', { packData });
            }
          }
        }

        // Additional debug logging
        logger.info('Company pack parsing result', {
          hasPacksData: !!packsData,
          packsDataType: typeof packsData,
          foundPackData: !!packData,
          packDataKeys: packData ? Object.keys(packData) : null,
        });

        if (!packData) {
          logger.info('No company pack found in wFirma response');
          return null;
        }

        const pack: WFirmaCompanyPack = {
          id: packData.id || '',
          pack: this.mapPackType(packData.pack || packData.pack_type),
          months: parseInt(packData.months || '0', 10),
          expirationDate: new Date(packData.expiration_date || packData.expirationDate),
          status: packData.status || 'active',
          created: new Date(packData.created || Date.now()),
          modified: new Date(packData.modified || Date.now()),
        };

        logger.info('Successfully fetched company pack from wFirma', {
          packId: pack.id,
          packType: pack.pack,
          expirationDate: pack.expirationDate,
        });

        return pack;
      } catch (error) {
        logger.error('Failed to fetch company pack from wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * Get complete company details including accounts, addresses, and pack
   */
  async getCompanyDetails(): Promise<WFirmaCompanyDetails> {
    logger.info('Fetching complete company details from wFirma');

    const [company, accounts, addresses, pack] = await Promise.all([
      this.getCompanyData(),
      this.getCompanyAccounts(),
      this.getCompanyAddresses(),
      this.getCompanyPack(),
    ]);

    const details: WFirmaCompanyDetails = {
      ...company,
      accounts,
      addresses,
      pack: pack || undefined,
    };

    logger.info('Successfully fetched complete company details', {
      companyId: details.id,
      accountsCount: accounts.length,
      addressesCount: addresses.length,
      hasPack: !!pack,
    });

    return details;
  }

  // Helper methods for type mapping
  private mapAddressType(type: string): CompanyAddressType {
    const typeMap: Record<string, CompanyAddressType> = {
      'main': 'main',
      'registration': 'main',
      'correspondence': 'correspondence',
      'mailing': 'correspondence',
    };
    return typeMap[type?.toLowerCase()] || 'other';
  }

  private mapPackType(pack: string): CompanyPackType {
    const packMap: Record<string, CompanyPackType> = {
      'pack_trade': 'pack_trade',
      'pack_tradew': 'pack_tradew',
      'pack_book': 'pack_book',
      'pack_bookw': 'pack_bookw',
      'trade': 'pack_trade',
      'tradew': 'pack_tradew',
      'book': 'pack_book',
      'bookw': 'pack_bookw',
    };
    return packMap[pack?.toLowerCase()] || 'pack_book';
  }
}
