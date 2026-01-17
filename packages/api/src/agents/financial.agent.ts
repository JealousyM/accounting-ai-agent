/**
 * Financial Agent
 * Specialized agent for financial analysis and reporting
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { BaseAgent, LLMProvider } from './base.agent';
import { AgentType, AgentContext, Locale } from './types';
import { WFirmaIntegrationService } from '../services/wfirma-integration.service';
import { WFirmaCacheService } from '../services/wfirma-cache.service';
import { wfirmaIntegrationService } from '../services/wfirma-integration.instance';
import { wfirmaCacheService } from '../services/wfirma-cache.instance';
import { FinancialData, WFirmaCompany } from '../types/wfirma.types';
import { logger } from '../utils/logger';

const TRANSLATIONS: Record<Locale, {
  financialSummary: string;
  year: string;
  revenue: string;
  expenses: string;
  profit: string;
  taxPaid: string;
  vatPaid: string;
  pitPaid: string;
  zusPaid: string;
  companyInfo: string;
  companyName: string;
  nip: string;
  regon: string;
  address: string;
  bankAccounts: string;
  errorFinancial: string;
  errorCompany: string;
  noDataForYear: string;
  profitMargin: string;
  taxRate: string;
  analysis: string;
}> = {
  pl: {
    financialSummary: 'Podsumowanie finansowe',
    year: 'Rok',
    revenue: 'Przychody',
    expenses: 'Koszty',
    profit: 'Zysk',
    taxPaid: 'Podatek zapłacony',
    vatPaid: 'VAT zapłacony',
    pitPaid: 'PIT zapłacony',
    zusPaid: 'ZUS zapłacony',
    companyInfo: 'Dane firmy',
    companyName: 'Nazwa',
    nip: 'NIP',
    regon: 'REGON',
    address: 'Adres',
    bankAccounts: 'Konta bankowe',
    errorFinancial: 'Błąd pobierania danych finansowych',
    errorCompany: 'Błąd pobierania danych firmy',
    noDataForYear: 'Brak danych za rok',
    profitMargin: 'Marża zysku',
    taxRate: 'Efektywna stawka podatkowa',
    analysis: 'Analiza',
  },
  en: {
    financialSummary: 'Financial Summary',
    year: 'Year',
    revenue: 'Revenue',
    expenses: 'Expenses',
    profit: 'Profit',
    taxPaid: 'Tax Paid',
    vatPaid: 'VAT Paid',
    pitPaid: 'PIT Paid',
    zusPaid: 'ZUS Paid',
    companyInfo: 'Company Information',
    companyName: 'Name',
    nip: 'NIP',
    regon: 'REGON',
    address: 'Address',
    bankAccounts: 'Bank Accounts',
    errorFinancial: 'Error fetching financial data',
    errorCompany: 'Error fetching company data',
    noDataForYear: 'No data for year',
    profitMargin: 'Profit Margin',
    taxRate: 'Effective Tax Rate',
    analysis: 'Analysis',
  },
  ru: {
    financialSummary: 'Финансовая сводка',
    year: 'Год',
    revenue: 'Выручка',
    expenses: 'Расходы',
    profit: 'Прибыль',
    taxPaid: 'Налог уплачен',
    vatPaid: 'НДС уплачен',
    pitPaid: 'ПИТ уплачен',
    zusPaid: 'ЗУС уплачен',
    companyInfo: 'Данные компании',
    companyName: 'Название',
    nip: 'NIP',
    regon: 'REGON',
    address: 'Адрес',
    bankAccounts: 'Банковские счета',
    errorFinancial: 'Ошибка получения финансовых данных',
    errorCompany: 'Ошибка получения данных компании',
    noDataForYear: 'Нет данных за год',
    profitMargin: 'Маржа прибыли',
    taxRate: 'Эффективная налоговая ставка',
    analysis: 'Анализ',
  },
};

const SYSTEM_PROMPTS: Record<Locale, string> = {
  pl: `Jesteś analitykiem finansowym specjalizującym się w polskim prawie podatkowym i rachunkowości.

## Twoje zadania:
- Analiza danych finansowych firmy
- Obliczanie wskaźników rentowności
- Porównywanie okresów rozliczeniowych
- Przygotowywanie raportów finansowych

## Zasady:
- Prezentuj dane w tabelach markdown
- Obliczaj wskaźniki: marża zysku, efektywna stawka podatkowa
- Porównuj dane z poprzednimi latami gdy dostępne
- Używaj polskich oznaczeń walutowych (PLN)

## Ważne:
- Wszystkie kwoty w PLN
- Ostrzegaj o nieprawidłowościach
- Sugeruj optymalizacje podatkowe zgodne z prawem`,

  en: `You are a financial analyst specializing in Polish tax law and accounting.

## Your tasks:
- Analyze company financial data
- Calculate profitability ratios
- Compare accounting periods
- Prepare financial reports

## Rules:
- Present data in markdown tables
- Calculate metrics: profit margin, effective tax rate
- Compare with previous years when available
- Use Polish currency notation (PLN)

## Important:
- All amounts in PLN
- Warn about irregularities
- Suggest legal tax optimizations`,

  ru: `Вы финансовый аналитик, специализирующийся на польском налоговом праве и бухгалтерии.

## Ваши задачи:
- Анализ финансовых данных компании
- Расчет показателей рентабельности
- Сравнение отчетных периодов
- Подготовка финансовых отчетов

## Правила:
- Представляйте данные в markdown таблицах
- Рассчитывайте показатели: маржа прибыли, эффективная ставка налога
- Сравнивайте с предыдущими годами при наличии данных
- Используйте польские обозначения валюты (PLN)

## Важно:
- Все суммы в PLN
- Предупреждайте о нарушениях
- Предлагайте законную налоговую оптимизацию`,
};

export class FinancialAgent extends BaseAgent {
  readonly name: AgentType = 'financial';
  readonly description = 'Financial analysis and reporting specialist';

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
    const t = TRANSLATIONS[locale] || TRANSLATIONS.pl;

    // Get financial summary tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getFinancialSummaryTool: StructuredToolInterface = (tool as any)(
      async ({ year }: { year: number }) => {
        try {
          // Try cache first
          const cacheKey = `financial_${year}`;
          const cached = await this.cacheService.getCachedData<FinancialData>(
            userId,
            'financial',
            cacheKey
          );

          let data: FinancialData;
          if (cached) {
            data = cached;
          } else {
            data = await this.wfirmaService.getFinancialData(year);
            await this.cacheService.cacheData(userId, 'financial', cacheKey, data);
          }

          return this.formatFinancialSummary(data, year, locale);
        } catch (error) {
          logger.error('Failed to fetch financial data', { error, year, userId });
          return `Error: ${t.errorFinancial}`;
        }
      },
      {
        name: 'get_financial_summary',
        description: 'Get financial summary for a specific year including revenue, expenses, profit, and taxes.',
        schema: z.object({
          year: z.number().min(2000).max(2100).describe('Year for financial data (e.g., 2024)'),
        }),
      }
    );

    // Get company info tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getCompanyInfoTool: StructuredToolInterface = (tool as any)(
      async () => {
        try {
          const cached = await this.cacheService.getCachedData<WFirmaCompany>(
            userId,
            'company',
            'info'
          );

          let company: WFirmaCompany;
          if (cached) {
            company = cached;
          } else {
            company = await this.wfirmaService.getCompanyData();
            await this.cacheService.cacheData(userId, 'company', 'info', company);
          }

          return this.formatCompanyInfo(company, locale);
        } catch (error) {
          logger.error('Failed to fetch company data', { error, userId });
          return `Error: ${t.errorCompany}`;
        }
      },
      {
        name: 'get_company_info',
        description: 'Get company information including name, NIP, address, and bank accounts.',
        schema: z.object({}),
      }
    );

    // Compare years tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const compareYearsTool: StructuredToolInterface = (tool as any)(
      async ({ year1, year2 }: { year1: number; year2: number }) => {
        try {
          const [data1, data2] = await Promise.all([
            this.wfirmaService.getFinancialData(year1),
            this.wfirmaService.getFinancialData(year2),
          ]);

          return this.formatYearComparison(data1, data2, year1, year2, locale);
        } catch (error) {
          logger.error('Failed to compare years', { error, year1, year2, userId });
          return `Error: ${t.errorFinancial}`;
        }
      },
      {
        name: 'compare_financial_years',
        description: 'Compare financial data between two years to see growth/decline.',
        schema: z.object({
          year1: z.number().min(2000).max(2100).describe('First year to compare'),
          year2: z.number().min(2000).max(2100).describe('Second year to compare'),
        }),
      }
    );

    return [
      getFinancialSummaryTool,
      getCompanyInfoTool,
      compareYearsTool,
    ];
  }

  // Formatting helpers
  private formatNumber(num: number): string {
    return new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }

  private formatFinancialSummary(data: FinancialData, year: number, locale: Locale): string {
    const t = TRANSLATIONS[locale] || TRANSLATIONS.pl;
    const profitMargin = data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(1) : '0';
    const taxRate = data.profit > 0 ? ((data.taxPaid / data.profit) * 100).toFixed(1) : '0';

    let result = `## ${t.financialSummary} ${year}\n\n`;
    result += `| ${t.analysis} | ${t.year} ${year} |\n`;
    result += '|----------|----------|\n';
    result += `| **${t.revenue}** | ${this.formatNumber(data.revenue)} PLN |\n`;
    result += `| **${t.expenses}** | ${this.formatNumber(data.expenses)} PLN |\n`;
    result += `| **${t.profit}** | ${this.formatNumber(data.profit)} PLN |\n`;
    result += `| **${t.profitMargin}** | ${profitMargin}% |\n`;
    result += `| **${t.taxPaid}** | ${this.formatNumber(data.taxPaid)} PLN |\n`;
    result += `| **${t.taxRate}** | ${taxRate}% |\n`;

    if (data.vatPaid !== undefined) {
      result += `| ${t.vatPaid} | ${this.formatNumber(data.vatPaid)} PLN |\n`;
    }
    if (data.pitPaid !== undefined) {
      result += `| ${t.pitPaid} | ${this.formatNumber(data.pitPaid)} PLN |\n`;
    }
    if (data.zusPaid !== undefined) {
      result += `| ${t.zusPaid} | ${this.formatNumber(data.zusPaid)} PLN |\n`;
    }

    return result;
  }

  private formatCompanyInfo(company: WFirmaCompany, locale: Locale): string {
    const t = TRANSLATIONS[locale] || TRANSLATIONS.pl;
    const addr = company.address;
    const addressStr = addr ? `${addr.street}, ${addr.zip} ${addr.city}, ${addr.country}` : '-';

    let result = `## ${t.companyInfo}\n\n`;
    result += `| Field | Value |\n`;
    result += '|-------|-------|\n';
    result += `| **${t.companyName}** | ${company.name} |\n`;
    result += `| **${t.nip}** | ${company.nip} |\n`;
    result += `| **${t.regon}** | ${company.regon || '-'} |\n`;
    result += `| **${t.address}** | ${addressStr} |\n`;

    if (company.bankAccounts && company.bankAccounts.length > 0) {
      result += `\n### ${t.bankAccounts}\n\n`;
      company.bankAccounts.forEach((acc, i) => {
        result += `${i + 1}. **${acc.bankName || 'Bank'}**: \`${acc.accountNumber}\`\n`;
      });
    }

    return result;
  }

  private formatYearComparison(
    data1: FinancialData,
    data2: FinancialData,
    year1: number,
    year2: number,
    locale: Locale
  ): string {
    const t = TRANSLATIONS[locale] || TRANSLATIONS.pl;

    const revenueChange = data1.revenue > 0
      ? (((data2.revenue - data1.revenue) / data1.revenue) * 100).toFixed(1)
      : '0';
    const profitChange = data1.profit > 0
      ? (((data2.profit - data1.profit) / data1.profit) * 100).toFixed(1)
      : '0';

    let result = `## ${t.financialSummary}: ${year1} vs ${year2}\n\n`;
    result += `| Metric | ${year1} | ${year2} | Change |\n`;
    result += '|--------|----------|----------|--------|\n';
    result += `| **${t.revenue}** | ${this.formatNumber(data1.revenue)} PLN | ${this.formatNumber(data2.revenue)} PLN | ${revenueChange}% |\n`;
    result += `| **${t.expenses}** | ${this.formatNumber(data1.expenses)} PLN | ${this.formatNumber(data2.expenses)} PLN | - |\n`;
    result += `| **${t.profit}** | ${this.formatNumber(data1.profit)} PLN | ${this.formatNumber(data2.profit)} PLN | ${profitChange}% |\n`;
    result += `| **${t.taxPaid}** | ${this.formatNumber(data1.taxPaid)} PLN | ${this.formatNumber(data2.taxPaid)} PLN | - |\n`;

    return result;
  }
}
