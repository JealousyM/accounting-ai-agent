/**
 * Contractor Agent
 * Specialized agent for contractor/customer management
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { BaseAgent, LLMProvider } from './base.agent';
import { AgentType, AgentContext, Locale } from './types';
import { WFirmaIntegrationService } from '../services/wfirma';
import { WFirmaCacheService } from '../services/wfirma-cache.service';
import { wfirmaIntegrationService } from '../services/wfirma-integration.instance';
import { wfirmaCacheService } from '../services/wfirma-cache.instance';
import { getContractorTranslations } from '../i18n';
import { WFirmaContractor } from '../types/wfirma.types';
import { logger } from '../utils/logger';

const SYSTEM_PROMPTS: Record<Locale, string> = {
  pl: `Jesteś specjalistą ds. zarządzania kontrahentami w systemie wFirma.

## Twoje zadania:
- Wyszukiwanie kontrahentów po nazwie lub NIP
- Tworzenie nowych kontrahentów
- Aktualizacja danych kontrahentów
- Usuwanie kontrahentów

## Zasady:
- Przy tworzeniu kontrahenta ZAWSZE wymagaj nazwy
- Przy aktualizacji/usuwaniu szukaj po DOKŁADNEJ nazwie
- Weryfikuj NIP przed zapisem (10 cyfr)
- Formatuj odpowiedzi jako tabele markdown
- Ostrzegaj przed usunięciem kontrahenta

## Ważne:
- Zachowuj formatowanie markdown z narzędzi
- Podawaj ID kontrahenta po operacjach
- Informuj o pomyślnym/nieudanym wykonaniu`,

  en: `You are a contractor management specialist for the wFirma system.

## Your tasks:
- Search contractors by name or NIP
- Create new contractors
- Update contractor data
- Delete contractors

## Rules:
- When creating a contractor, ALWAYS require a name
- When updating/deleting, search by EXACT name
- Verify NIP before saving (10 digits)
- Format responses as markdown tables
- Warn before deleting a contractor

## Important:
- Preserve markdown formatting from tools
- Provide contractor ID after operations
- Report success/failure of operations`,

  ru: `Вы специалист по управлению контрагентами в системе wFirma.

## Ваши задачи:
- Поиск контрагентов по названию или NIP
- Создание новых контрагентов
- Обновление данных контрагентов
- Удаление контрагентов

## Правила:
- При создании контрагента ВСЕГДА требуйте название
- При обновлении/удалении ищите по ТОЧНОМУ названию
- Проверяйте NIP перед сохранением (10 цифр)
- Форматируйте ответы как markdown таблицы
- Предупреждайте перед удалением контрагента

## Важно:
- Сохраняйте markdown форматирование от инструментов
- Указывайте ID контрагента после операций
- Сообщайте об успехе/неудаче операций`,
};

export class ContractorAgent extends BaseAgent {
  readonly name: AgentType = 'contractor';
  readonly description = 'Manages contractors/customers in wFirma';

  private wfirmaService: WFirmaIntegrationService;
  private cacheService: WFirmaCacheService;

  constructor(
    provider: LLMProvider = 'openai',
    wfirma?: WFirmaIntegrationService,
    cache?: WFirmaCacheService
  ) {
    super(provider, 10);
    this.wfirmaService = wfirma || wfirmaIntegrationService;
    this.cacheService = cache || wfirmaCacheService;
  }

  getSystemPrompt(locale: Locale): string {
    return SYSTEM_PROMPTS[locale] || SYSTEM_PROMPTS.pl;
  }

  getTools(context: AgentContext): StructuredToolInterface[] {
    const { userId, locale } = context;
    const t = getContractorTranslations(locale);

    // Get contractors tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getContractorsTool: StructuredToolInterface = (tool as any)(
      async ({ search, nip }: { search?: string; nip?: string }) => {
        try {
          const contractors = await this.wfirmaService.getContractors({
            search,
            nip,
            limit: 100,
          });
          return this.formatContractorsList(contractors, locale);
        } catch (error) {
          logger.error('Failed to fetch contractors', { error, userId });
          return `Error: ${t.errorFetch}`;
        }
      },
      {
        name: 'get_contractors',
        description: 'Get list of contractors/customers from wFirma. Can filter by name or NIP.',
        schema: z.object({
          search: z.string().optional().describe('Search by contractor name'),
          nip: z.string().optional().describe('Filter by NIP number'),
        }),
      }
    );

    // Create contractor tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createContractorTool: StructuredToolInterface = (tool as any)(
      async (data: {
        name: string;
        nip?: string;
        regon?: string;
        email?: string;
        phone?: string;
        street?: string;
        city?: string;
        zip?: string;
        country?: string;
        bankAccount?: string;
        notes?: string;
      }) => {
        try {
          const contractor = await this.wfirmaService.createContractor({
            name: data.name,
            nip: data.nip,
            regon: data.regon,
            email: data.email,
            phone: data.phone,
            address: data.street || data.city || data.zip ? {
              street: data.street || '',
              city: data.city || '',
              zip: data.zip || '',
              country: data.country || 'PL',
            } : undefined,
            bankAccount: data.bankAccount,
            notes: data.notes,
          });

          await this.cacheService.invalidateCache(userId, 'contractor');
          return this.formatContractorCreated(contractor, locale);
        } catch (error) {
          logger.error('Failed to create contractor', { error, data });
          const errorMsg = error instanceof Error ? error.message : t.errorCreate;
          return this.formatCreateError(errorMsg, locale);
        }
      },
      {
        name: 'create_contractor',
        description: 'Create a new contractor in wFirma. Required: name. Recommended: nip, email, city.',
        schema: z.object({
          name: z.string().describe('Contractor name (required)'),
          nip: z.string().optional().describe('NIP tax number (10 digits)'),
          regon: z.string().optional().describe('REGON number'),
          email: z.string().optional().describe('Email address'),
          phone: z.string().optional().describe('Phone number'),
          street: z.string().optional().describe('Street address'),
          city: z.string().optional().describe('City'),
          zip: z.string().optional().describe('Postal code'),
          country: z.string().optional().describe('Country code (default: PL)'),
          bankAccount: z.string().optional().describe('Bank account number'),
          notes: z.string().optional().describe('Additional notes'),
        }),
      }
    );

    // Update contractor tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateContractorTool: StructuredToolInterface = (tool as any)(
      async (data: {
        contractorName: string;
        name?: string;
        nip?: string;
        regon?: string;
        email?: string;
        phone?: string;
        street?: string;
        city?: string;
        zip?: string;
        country?: string;
        bankAccount?: string;
        notes?: string;
      }) => {
        try {
          // Search by name first
          const contractors = await this.wfirmaService.getContractors({
            search: data.contractorName,
            limit: 10,
          });

          const exactMatch = contractors.find(
            c => c.name.toLowerCase() === data.contractorName.toLowerCase()
          );

          if (!exactMatch) {
            if (contractors.length > 0) {
              const suggestions = contractors.map(c => `- ${c.name}`).join('\n');
              return `${t.exactNotFound} "${data.contractorName}".\n\n${t.similarContractors}:\n${suggestions}\n\n${t.specifyNameUpdate}`;
            }
            return `${t.notFoundByName} "${data.contractorName}".`;
          }

          const updateData: Record<string, unknown> = {};
          if (data.name) updateData.name = data.name;
          if (data.nip) updateData.nip = data.nip;
          if (data.regon) updateData.regon = data.regon;
          if (data.email) updateData.email = data.email;
          if (data.phone) updateData.phone = data.phone;
          if (data.bankAccount) updateData.bankAccount = data.bankAccount;
          if (data.notes) updateData.notes = data.notes;
          if (data.street || data.city || data.zip) {
            updateData.address = {
              street: data.street || exactMatch.address?.street || '',
              city: data.city || exactMatch.address?.city || '',
              zip: data.zip || exactMatch.address?.zip || '',
              country: data.country || exactMatch.address?.country || 'PL',
            };
          }

          const updated = await this.wfirmaService.updateContractor(exactMatch.id, updateData);
          await this.cacheService.invalidateCache(userId, 'contractor');
          return this.formatContractorUpdated(updated, locale);
        } catch (error) {
          logger.error('Failed to update contractor', { error, data });
          return `Error: ${t.errorUpdate}`;
        }
      },
      {
        name: 'update_contractor',
        description: 'Update an existing contractor in wFirma by name. Searches by exact name match.',
        schema: z.object({
          contractorName: z.string().describe('Current contractor name to find (exact match)'),
          name: z.string().optional().describe('New name'),
          nip: z.string().optional().describe('New NIP'),
          regon: z.string().optional().describe('New REGON'),
          email: z.string().optional().describe('New email'),
          phone: z.string().optional().describe('New phone'),
          street: z.string().optional().describe('New street'),
          city: z.string().optional().describe('New city'),
          zip: z.string().optional().describe('New postal code'),
          country: z.string().optional().describe('New country'),
          bankAccount: z.string().optional().describe('New bank account'),
          notes: z.string().optional().describe('New notes'),
        }),
      }
    );

    // Delete contractor tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deleteContractorTool: StructuredToolInterface = (tool as any)(
      async ({ name }: { name: string }) => {
        try {
          const contractors = await this.wfirmaService.getContractors({
            search: name,
            limit: 10,
          });

          const exactMatch = contractors.find(
            c => c.name.toLowerCase() === name.toLowerCase()
          );

          if (!exactMatch) {
            if (contractors.length > 0) {
              const suggestions = contractors.map(c => `- ${c.name}`).join('\n');
              return `${t.exactNotFound} "${name}".\n\n${t.similarContractors}:\n${suggestions}\n\n${t.specifyNameDelete}`;
            }
            return `${t.notFoundByName} "${name}".`;
          }

          await this.wfirmaService.deleteContractor(exactMatch.id);
          await this.cacheService.invalidateCache(userId, 'contractor');
          return this.formatContractorDeleted(exactMatch, locale);
        } catch (error) {
          logger.error('Failed to delete contractor', { error, name });
          return `Error: ${t.errorDelete}`;
        }
      },
      {
        name: 'delete_contractor',
        description: 'Delete a contractor from wFirma by exact name. WARNING: Cannot be undone.',
        schema: z.object({
          name: z.string().describe('Contractor name to delete (exact match required)'),
        }),
      }
    );

    return [
      getContractorsTool,
      createContractorTool,
      updateContractorTool,
      deleteContractorTool,
    ];
  }

  // Formatting helpers
  private formatContractorsList(contractors: WFirmaContractor[], locale: Locale): string {
    const t = getContractorTranslations(locale);

    if (contractors.length === 0) {
      return t.notFound;
    }

    let result = `## ${t.contractorsTitle} (${contractors.length})\n\n`;
    result += t.tableHeaders + '\n';
    result += '|---|----------|-----|-------|--------|\n';

    contractors.forEach((c, i) => {
      result += `| ${i + 1} | **${c.name}** | ${c.nip || '-'} | ${c.email || '-'} | ${c.phone || '-'} |\n`;
    });

    result += `\n> ${t.updateDeleteHint}`;
    return result;
  }

  private formatContractorDetails(contractor: WFirmaContractor, locale: Locale): string {
    const t = getContractorTranslations(locale);
    const addr = contractor.address;
    const addressStr = addr ? `${addr.street}, ${addr.zip} ${addr.city}` : '-';

    return `## ${t.contractorTitle}: ${contractor.name}

| ${t.field} | ${t.value} |
|------|----------|
| **${t.id}** | \`${contractor.id}\` |
| **${t.name}** | ${contractor.name} |
| **${t.nip}** | ${contractor.nip || '-'} |
| **${t.regon}** | ${contractor.regon || '-'} |
| **${t.email}** | ${contractor.email || '-'} |
| **${t.phone}** | ${contractor.phone || '-'} |
| **${t.address}** | ${addressStr} |
| **${t.bankAccount}** | ${contractor.bankAccount || '-'} |
| **${t.notes}** | ${contractor.notes || '-'} |`;
  }

  private formatContractorCreated(contractor: WFirmaContractor, locale: Locale): string {
    const t = getContractorTranslations(locale);
    return `## ✅ ${t.created}

${this.formatContractorDetails(contractor, locale)}

> ${t.createdHint}`;
  }

  private formatContractorUpdated(contractor: WFirmaContractor, locale: Locale): string {
    const t = getContractorTranslations(locale);
    return `## ✅ ${t.updated}

${this.formatContractorDetails(contractor, locale)}

> ${t.updatedHint}`;
  }

  private formatContractorDeleted(contractor: WFirmaContractor, locale: Locale): string {
    const t = getContractorTranslations(locale);
    return `## ❌ ${t.deleted}

- **${t.id}:** \`${contractor.id}\`
- **${t.name}:** ${contractor.name}
- **${t.nip}:** ${contractor.nip || '-'}

> ⚠️ ${t.deletedWarning}`;
  }

  private formatCreateError(errorMsg: string, locale: Locale): string {
    const t = getContractorTranslations(locale);
    return `## ❌ ${t.errorCreateTitle}

**${t.errorReason}:** ${errorMsg}

**${t.requiredFields}:**
- name

**${t.recommendedFields}:**
- nip (10 digits)
- email
- city

${t.tryAgain}`;
  }
}
