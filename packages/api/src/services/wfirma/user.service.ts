/**
 * wFirma User Service
 * Handles user and user-company operations
 */

import { logger } from '../../utils/logger';
import { WFirmaUser, WFirmaUserCompany, UserCompanyFilters } from '../../types/wfirma.types';
import { WFirmaClient } from './client';
import { WFirmaError } from './errors';

export class WFirmaUserService {
  constructor(private readonly client: WFirmaClient) {}

  /**
   * GET /users/get - Fetch all users for the company
   */
  async getUsers(): Promise<WFirmaUser[]> {
    logger.info('Fetching users from wFirma');

    return this.client.withRetry(async () => {
      try {
        const response = await this.client.apiClient.request({
          method: 'GET',
          url: '/users/get',
          params: this.client.buildQueryParams(),
        });

        const data = response.data;

        // Debug logging
        logger.info('wFirma users raw response', {
          status: data.status,
          usersKeys: data.users ? Object.keys(data.users) : null,
          rawUsers: JSON.stringify(data.users).substring(0, 1000),
        });

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to fetch users',
            data.status
          );
        }

        return this.parseUsersResponse(data.users);
      } catch (error) {
        logger.error('Failed to fetch users from wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * GET /user_companies/find - Find user-company relationships
   */
  async findUserCompanies(filters?: UserCompanyFilters): Promise<WFirmaUserCompany[]> {
    logger.info('Finding user companies from wFirma', { filters });

    return this.client.withRetry(async () => {
      try {
        const payload = {
          api: {
            user_companies: {
              parameters: {
                limit: filters?.limit || 100,
                page: filters?.page || 1,
                ...(filters?.conditions && { conditions: filters.conditions }),
              },
            },
          },
        };

        const response = await this.client.apiClient.request({
          method: 'GET',
          url: '/user_companies/find',
          params: this.client.buildQueryParams(),
          data: payload,
        });

        const data = response.data;

        // Debug logging
        logger.info('wFirma user_companies/find raw response', {
          status: data.status,
          parametersTotal: data.user_companies?.parameters?.total,
          userCompaniesKeys: data.user_companies ? Object.keys(data.user_companies) : null,
          rawUserCompanies: JSON.stringify(data.user_companies).substring(0, 1000),
        });

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to find user companies',
            data.status
          );
        }

        return this.parseUserCompaniesResponse(data.user_companies);
      } catch (error) {
        logger.error('Failed to find user companies from wFirma', { error });
        throw error;
      }
    });
  }

  /**
   * GET /user_companies/get/{id} - Get specific user-company by ID
   */
  async getUserCompanyById(id: string): Promise<WFirmaUserCompany | null> {
    logger.info('Fetching user company from wFirma', { id });

    return this.client.withRetry(async () => {
      try {
        const response = await this.client.apiClient.request({
          method: 'GET',
          url: `/user_companies/get/${id}`,
          params: this.client.buildQueryParams(),
        });

        const data = response.data;

        // Debug logging
        logger.info('wFirma user_companies/get raw response', {
          status: data.status,
          userCompaniesKeys: data.user_companies ? Object.keys(data.user_companies) : null,
          rawUserCompanies: JSON.stringify(data.user_companies).substring(0, 1000),
        });

        if (data.status?.code !== 'OK') {
          throw new WFirmaError(
            'WFIRMA_API_ERROR',
            'Failed to get user company',
            data.status
          );
        }

        const userCompanies = this.parseUserCompaniesResponse(data.user_companies);
        return userCompanies[0] || null;
      } catch (error) {
        logger.error('Failed to get user company from wFirma', { error, id });
        throw error;
      }
    });
  }

  /**
   * Parse users response with flexible format handling
   */
  private parseUsersResponse(usersData: any): WFirmaUser[] {
    const users: WFirmaUser[] = [];
    if (!usersData) return users;

    // Handle different response formats
    const usersList = Array.isArray(usersData.user)
      ? usersData.user
      : usersData.user
      ? [usersData.user]
      : Object.values(usersData).filter(
          (item: unknown) =>
            typeof item === 'object' &&
            item !== null &&
            'user' in (item as Record<string, unknown>)
        ).map((item: unknown) => (item as Record<string, unknown>).user);

    for (const u of usersList) {
      if (u) {
        // Log each user's raw data to see available fields
        logger.info('Processing user', {
          rawUser: JSON.stringify(u),
          availableKeys: Object.keys(u),
        });

        users.push({
          id: u.id || '',
          name: u.name || '',
          email: u.email || undefined,
          login: u.login || undefined,
          role: u.role || undefined,
          isActive: u.is_active === '1' || u.active === true || false,
        });
      }
    }

    logger.info('Successfully parsed users from wFirma', { count: users.length });
    return users;
  }

  /**
   * Parse user_companies response with flexible format handling
   */
  private parseUserCompaniesResponse(userCompaniesData: any): WFirmaUserCompany[] {
    const userCompanies: WFirmaUserCompany[] = [];
    if (!userCompaniesData) return userCompanies;

    // Handle different response formats
    const list = Array.isArray(userCompaniesData.user_company)
      ? userCompaniesData.user_company
      : userCompaniesData.user_company
      ? [userCompaniesData.user_company]
      : Object.values(userCompaniesData).filter(
          (item: unknown) =>
            typeof item === 'object' &&
            item !== null &&
            'user_company' in (item as Record<string, unknown>)
        ).map((item: unknown) => (item as Record<string, unknown>).user_company);

    for (const uc of list) {
      if (uc) {
        // Log each user_company's raw data to see available fields
        logger.info('Processing user company', {
          rawUserCompany: JSON.stringify(uc),
          availableKeys: Object.keys(uc),
        });

        userCompanies.push({
          id: uc.id || '',
          userId: uc.user_id || uc.userId || '',
          companyId: uc.company_id || uc.companyId || '',
          role: uc.role || undefined,
          permissions: uc.permissions || undefined,
          created: uc.created ? new Date(uc.created) : undefined,
          modified: uc.modified ? new Date(uc.modified) : undefined,
        });
      }
    }

    logger.info('Successfully parsed user companies from wFirma', { count: userCompanies.length });
    return userCompanies;
  }
}
