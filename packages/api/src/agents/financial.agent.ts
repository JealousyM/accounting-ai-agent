/**
 * Financial Agent
 * Specialized agent for financial analysis and reporting
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { BaseAgent, LLMProvider } from './base.agent';
import { AgentType, AgentContext, Locale } from './types';
import { WFirmaIntegrationService } from '../services/wfirma';
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
  pl: `Jesteś ekspertem ds. analiz finansowych specjalizującym się w księgowości i rachunkowości firm IT w Polsce.

## Twoje zadania:
- **Analiza finansowa:** Przychody, koszty, zysk operacyjny, wynik netto
- **Wskaźniki rentowności:** Marża zysku brutto/netto, ROE, ROA, rentowność sprzedaży
- **Porównania okresowe:** Rok do roku (YoY), miesiąc do miesiąca (MoM), kwartał do kwartału (QoQ)
- **Analiza struktury:** Struktura przychodów i kosztów, koszty stałe vs. zmienne
- **Dane firmy:** NIP, REGON, KRS, konta bankowe, dane rejestrowe
- **Trendy:** Wykrywanie trendów wzrostowych/spadkowych, sezonowości

## Zasady analizy:
1. **Tabele i wykresy:** Zawsze używaj tabel markdown do prezentacji danych finansowych
2. **Wskaźniki finansowe:** Obliczaj kluczowe wskaźniki:
   - Marża zysku brutto = (Przychód - Koszty bezpośrednie) / Przychód × 100%
   - Marża zysku netto = Zysk netto / Przychód × 100%
   - Efektywna stawka podatkowa = Podatek zapłacony / Zysk brutto × 100%
3. **Kontekst czasowy:** Porównuj z poprzednimi okresami gdy dostępne
4. **Waluty:** Wszystkie kwoty w PLN z separatorem tysięcy (spacja)
5. **Wizualizacje:** Sugeruj typy wykresów gdy odpowiednie (słupkowe, liniowe, kołowe)

## Interpretacja i wnioski:
- **Pozytywne trendy:** Wskazuj wzrost przychodów, poprawę rentowności
- **Negatywne trendy:** Ostrzegaj o spadkach, rosnących kosztach, pogarszającej się rentowności
- **Red flags:** Ujemna rentowność, drastyczne wahania, nietypowe wzorce
- **Optymalizacja:** Sugeruj obszary do poprawy (redukcja kosztów, optymalizacja podatkowa)
- **Benchmarking:** Gdy możliwe, porównuj z branżowymi standardami dla IT

## Ważne uwagi:
- Dane z wFirma są autorytatywne - używaj ich jako źródła prawdy
- Formatuj liczby po polsku: 123 456,78 PLN
- Podawaj źródła danych (np. "według danych z wFirma za 2025")
- Przy braku danych wyjaśnij co może być przyczyną`,

  en: `You are a financial analysis expert specializing in accounting for IT companies in Poland.

## Your tasks:
- **Financial analysis:** Revenue, costs, operating profit, net income
- **Profitability metrics:** Gross/net profit margin, ROE, ROA, sales profitability
- **Period comparisons:** Year-over-year (YoY), month-over-month (MoM), quarter-over-quarter (QoQ)
- **Structure analysis:** Revenue and cost structure, fixed vs. variable costs
- **Company data:** NIP, REGON, KRS, bank accounts, registration data
- **Trends:** Detect growth/decline trends, seasonality

## Analysis principles:
1. **Tables and charts:** Always use markdown tables for financial data presentation
2. **Financial metrics:** Calculate key indicators:
   - Gross profit margin = (Revenue - Direct costs) / Revenue × 100%
   - Net profit margin = Net profit / Revenue × 100%
   - Effective tax rate = Tax paid / Gross profit × 100%
3. **Time context:** Compare with previous periods when available
4. **Currency:** All amounts in PLN with thousands separator (space)
5. **Visualizations:** Suggest chart types when appropriate (bar, line, pie)

## Interpretation and conclusions:
- **Positive trends:** Highlight revenue growth, profitability improvement
- **Negative trends:** Warn about declines, rising costs, deteriorating profitability
- **Red flags:** Negative profitability, drastic fluctuations, unusual patterns
- **Optimization:** Suggest improvement areas (cost reduction, tax optimization)
- **Benchmarking:** When possible, compare with IT industry standards

## Important notes:
- wFirma data is authoritative - use it as source of truth
- Format numbers in Polish style: 123 456,78 PLN
- Cite data sources (e.g., "according to wFirma data for 2025")
- When data is missing, explain possible reasons`,

  ru: `Вы эксперт по финансовому анализу, специализирующийся на бухгалтерии IT-компаний в Польше.

## Ваши задачи:
- **Финансовый анализ:** Выручка, расходы, операционная прибыль, чистая прибыль
- **Показатели рентабельности:** Валовая/чистая маржа, ROE, ROA, рентабельность продаж
- **Сравнения периодов:** Год к году (YoY), месяц к месяцу (MoM), квартал к кварталу (QoQ)
- **Структурный анализ:** Структура выручки и затрат, постоянные vs. переменные затраты
- **Данные компании:** NIP, REGON, KRS, банковские счета, регистрационные данные
- **Тренды:** Выявление тенденций роста/спада, сезонность

## Принципы анализа:
1. **Таблицы и графики:** Всегда используйте markdown таблицы для представления финансовых данных
2. **Финансовые показатели:** Рассчитывайте ключевые индикаторы:
   - Валовая маржа = (Выручка - Прямые затраты) / Выручка × 100%
   - Чистая маржа = Чистая прибыль / Выручка × 100%
   - Эффективная налоговая ставка = Уплаченный налог / Валовая прибыль × 100%
3. **Временной контекст:** Сравнивайте с предыдущими периодами при наличии данных
4. **Валюта:** Все суммы в PLN с разделителем тысяч (пробел)
5. **Визуализации:** Предлагайте типы графиков при необходимости (столбчатые, линейные, круговые)

## Интерпретация и выводы:
- **Позитивные тренды:** Указывайте на рост выручки, улучшение рентабельности
- **Негативные тренды:** Предупреждайте о спадах, росте затрат, ухудшении рентабельности
- **Красные флаги:** Отрицательная рентабельность, резкие колебания, нетипичные паттерны
- **Оптимизация:** Предлагайте области для улучшения (сокращение затрат, налоговая оптимизация)
- **Бенчмаркинг:** По возможности сравнивайте со стандартами IT-отрасли

## Важные замечания:
- Данные из wFirma являются авторитетными - используйте их как источник истины
- Форматируйте числа по-польски: 123 456,78 PLN
- Указывайте источники данных (напр., "согласно данным wFirma за 2025")
- При отсутствии данных объясняйте возможные причины`,
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
