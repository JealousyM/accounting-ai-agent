/**
 * Tax Agent
 * Specialized agent for tax compliance and calculations
 */

import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import { BaseAgent, LLMProvider } from './base.agent';
import { AgentType, AgentContext, Locale } from './types';
import { logger } from '../utils/logger';

const TRANSLATIONS: Record<Locale, {
  taxCalculation: string;
  vatTitle: string;
  pitTitle: string;
  citTitle: string;
  zusTitle: string;
  income: string;
  taxBase: string;
  taxRate: string;
  taxDue: string;
  deductions: string;
  deadlines: string;
  deadline: string;
  type: string;
  dueDate: string;
  daysLeft: string;
  overdue: string;
  warning: string;
  ipBoxTitle: string;
  ipBoxRate: string;
  qualifiedIncome: string;
  regularIncome: string;
  totalTax: string;
  taxSavings: string;
}> = {
  pl: {
    taxCalculation: 'Kalkulacja podatku',
    vatTitle: 'Podatek VAT',
    pitTitle: 'Podatek PIT',
    citTitle: 'Podatek CIT',
    zusTitle: 'Składki ZUS',
    income: 'Dochód',
    taxBase: 'Podstawa opodatkowania',
    taxRate: 'Stawka',
    taxDue: 'Podatek do zapłaty',
    deductions: 'Odliczenia',
    deadlines: 'Terminy podatkowe',
    deadline: 'Termin',
    type: 'Typ',
    dueDate: 'Data',
    daysLeft: 'Dni do terminu',
    overdue: 'Przeterminowane!',
    warning: 'Uwaga: Zbliża się termin!',
    ipBoxTitle: 'IP Box (5% dla IT)',
    ipBoxRate: 'Stawka IP Box',
    qualifiedIncome: 'Dochód kwalifikowany',
    regularIncome: 'Dochód pozostały',
    totalTax: 'Razem podatek',
    taxSavings: 'Oszczędność podatkowa',
  },
  en: {
    taxCalculation: 'Tax Calculation',
    vatTitle: 'VAT Tax',
    pitTitle: 'PIT Tax',
    citTitle: 'CIT Tax',
    zusTitle: 'ZUS Contributions',
    income: 'Income',
    taxBase: 'Tax Base',
    taxRate: 'Rate',
    taxDue: 'Tax Due',
    deductions: 'Deductions',
    deadlines: 'Tax Deadlines',
    deadline: 'Deadline',
    type: 'Type',
    dueDate: 'Date',
    daysLeft: 'Days Left',
    overdue: 'Overdue!',
    warning: 'Warning: Deadline approaching!',
    ipBoxTitle: 'IP Box (5% for IT)',
    ipBoxRate: 'IP Box Rate',
    qualifiedIncome: 'Qualified Income',
    regularIncome: 'Regular Income',
    totalTax: 'Total Tax',
    taxSavings: 'Tax Savings',
  },
  ru: {
    taxCalculation: 'Расчет налога',
    vatTitle: 'НДС',
    pitTitle: 'ПИТ (НДФЛ)',
    citTitle: 'ЦИТ (налог на прибыль)',
    zusTitle: 'Взносы ЗУС',
    income: 'Доход',
    taxBase: 'Налоговая база',
    taxRate: 'Ставка',
    taxDue: 'Налог к уплате',
    deductions: 'Вычеты',
    deadlines: 'Налоговые сроки',
    deadline: 'Срок',
    type: 'Тип',
    dueDate: 'Дата',
    daysLeft: 'Дней до срока',
    overdue: 'Просрочено!',
    warning: 'Внимание: Приближается срок!',
    ipBoxTitle: 'IP Box (5% для IT)',
    ipBoxRate: 'Ставка IP Box',
    qualifiedIncome: 'Квалифицированный доход',
    regularIncome: 'Прочий доход',
    totalTax: 'Итого налог',
    taxSavings: 'Налоговая экономия',
  },
};

const SYSTEM_PROMPTS: Record<Locale, string> = {
  pl: `Jesteś ekspertem od polskiego prawa podatkowego dla branży IT specjalizującym się w optymalizacji podatkowej i compliance.

## Twoje specjalizacje:
- **VAT**: stawki (23%, 8%, 5%, 0%), JPK_V7, odwrotne obciążenie, OSS, transakcje wewnątrzwspólnotowe
- **PIT**: skala progresywna (12%/32%), liniowy 19%, ryczałt, IP Box 5% dla IT, optymalizacja podatkowa
- **CIT**: estoński CIT (0% na zysk zatrzymany), stawki 9%/19%, mali podatnicy
- **ZUS**: pełne składki, mały ZUS Plus, ulga na start (6 miesięcy), wakacje składkowe

## Kluczowe terminy płatności (2026):
- **VAT-7, JPK_V7:** do 25. dnia miesiąca następnego
- **PIT zaliczka:** do 20. dnia miesiąca następnego
- **ZUS składki:** do 15. dnia miesiąca następnego (za poprzedni miesiąc)
- **PIT roczny:** do 30 kwietnia

## Zasady pracy:
1. **Dane rzeczywiste first:** Zawsze preferuj dane z wFirma nad teoretycznymi kalkulacjami
2. **Podstawy prawne:** Podawaj artykuły ustaw (np. "Art. 86 ustawy o VAT")
3. **Proaktywne ostrzeżenia:** Ostrzegaj o zbliżających się terminach (5 dni wcześniej)
4. **Optymalizacja:** Sugeruj legalne metody optymalizacji (IP Box dla IT, mały ZUS Plus, estoński CIT)
5. **Tabele markdown:** Zawsze używaj tabel do prezentacji kalkulacji
6. **Scenariusze porównawcze:** Przy optymalizacji pokazuj porównanie różnych opcji
7. **Ostrzeżenia compliance:** Informuj o ryzykach podatkowych i karach

## Strategie optymalizacji dla IT:
- IP Box (5% dla dochodów z własności intelektualnej)
- Estoński CIT (brak podatku od zysku zatrzymanego)
- Mały ZUS Plus (składki oparte na dochodzie)
- Ryczałt ewidencjonowany (uproszczona księgowość)`,

  en: `You are a Polish tax law expert for the IT industry specializing in tax optimization and compliance.

## Your specializations:
- **VAT**: rates (23%, 8%, 5%, 0%), JPK_V7, reverse charge, OSS, intra-community transactions
- **PIT**: progressive scale (12%/32%), flat 19%, lump sum, IP Box 5% for IT, tax optimization
- **CIT**: Estonian CIT (0% on retained earnings), rates 9%/19%, small taxpayers
- **ZUS**: full contributions, small ZUS Plus, startup relief (6 months), contribution holidays

## Key payment deadlines (2026):
- **VAT-7, JPK_V7:** by 25th of following month
- **PIT advance:** by 20th of following month
- **ZUS contributions:** by 15th of following month (for previous month)
- **Annual PIT:** by April 30th

## Working principles:
1. **Real data first:** Always prefer wFirma data over theoretical calculations
2. **Legal bases:** Cite law articles (e.g., "Art. 86 of VAT Act")
3. **Proactive warnings:** Warn about approaching deadlines (5 days in advance)
4. **Optimization:** Suggest legal optimization methods (IP Box for IT, small ZUS Plus, Estonian CIT)
5. **Markdown tables:** Always use tables to present calculations
6. **Comparative scenarios:** When optimizing, show comparison of different options
7. **Compliance warnings:** Inform about tax risks and penalties

## Optimization strategies for IT:
- IP Box (5% for intellectual property income)
- Estonian CIT (no tax on retained earnings)
- Small ZUS Plus (income-based contributions)
- Lump sum taxation (simplified bookkeeping)`,

  ru: `Вы эксперт по польскому налоговому праву для IT-отрасли, специализирующийся на налоговой оптимизации и комплаенсе.

## Ваши специализации:
- **НДС**: ставки (23%, 8%, 5%, 0%), JPK_V7, обратное начисление, OSS, внутриобщинные операции
- **ПИТ**: прогрессивная шкала (12%/32%), линейный 19%, рычалт, IP Box 5% для IT, налоговая оптимизация
- **ЦИТ**: эстонский ЦИТ (0% на нераспределенную прибыль), ставки 9%/19%, малые налогоплательщики
- **ЗУС**: полные взносы, малый ЗУС Плюс, льгота на старт (6 месяцев), каникулы взносов

## Ключевые сроки платежей (2026):
- **VAT-7, JPK_V7:** до 25-го числа следующего месяца
- **ПИТ аванс:** до 20-го числа следующего месяца
- **ЗУС взносы:** до 15-го числа следующего месяца (за предыдущий месяц)
- **Годовой ПИТ:** до 30 апреля

## Принципы работы:
1. **Реальные данные first:** Всегда предпочитайте данные из wFirma теоретическим расчетам
2. **Правовые основания:** Указывайте статьи законов (напр., "Ст. 86 закона о НДС")
3. **Проактивные предупреждения:** Предупреждайте о приближающихся сроках (за 5 дней)
4. **Оптимизация:** Предлагайте законные методы оптимизации (IP Box для IT, малый ЗУС Плюс, эстонский ЦИТ)
5. **Markdown таблицы:** Всегда используйте таблицы для представления расчетов
6. **Сравнительные сценарии:** При оптимизации показывайте сравнение разных вариантов
7. **Предупреждения о комплаенсе:** Информируйте о налоговых рисках и штрафах

## Стратегии оптимизации для IT:
- IP Box (5% для доходов от интеллектуальной собственности)
- Эстонский ЦИТ (без налога на нераспределенную прибыль)
- Малый ЗУС Плюс (взносы на основе дохода)
- Рычалт (упрощенный учет)`,
};

// Polish tax constants for 2026
// Source: Polish Ministry of Finance, ZUS, official government announcements
const TAX_CONSTANTS_2026 = {
  YEAR: 2026,

  // PIT (Personal Income Tax)
  PIT_THRESHOLD: 120000,        // PLN - first bracket limit (unchanged)
  PIT_RATE_1: 0.12,            // 12% for income up to 120,000 PLN
  PIT_RATE_2: 0.32,            // 32% for income over 120,000 PLN
  PIT_TAX_FREE_AMOUNT: 30000,  // Tax-free amount
  PIT_TAX_DEDUCTION: 3600,     // Tax-reducing amount (12% of 30,000)
  PIT_FLAT_RATE: 0.19,         // 19% flat tax
  SOLIDARITY_LEVY: 0.04,       // 4% on income over 1,000,000 PLN
  IP_BOX_RATE: 0.05,           // 5% IP Box rate (unchanged)

  // CIT (Corporate Income Tax)
  CIT_RATE_SMALL: 0.09,        // 9% for small taxpayers (revenue up to 8,431,000 PLN)
  CIT_RATE_STANDARD: 0.19,     // 19% standard rate
  CIT_SMALL_TAXPAYER_LIMIT: 8431000, // PLN limit for 9% rate

  // VAT
  VAT_STANDARD: 0.23,          // 23% standard rate
  VAT_REDUCED_1: 0.08,         // 8% reduced rate
  VAT_REDUCED_2: 0.05,         // 5% reduced rate
  VAT_EXEMPT_THRESHOLD: 240000, // 240,000 PLN exemption threshold (increased from 200,000)

  // ZUS (Social Insurance) - updated for 2026
  ZUS_BASE_2026: 5652,         // Minimum contribution base (60% of average salary 9,420 PLN)
  ZUS_FULL_MONTHLY: 1926.77,   // Full ZUS contributions per month (approx)
  ZUS_PREFERENTIAL_BASE: 1441.80, // 30% of minimum wage (4,806 PLN)
  ZUS_PREFERENTIAL_MONTHLY: 456.19, // Preferential ZUS monthly (mały ZUS Plus)
  ZUS_HEALTH_MIN_BASE: 4806,   // Minimum base for health contributions (100% of min wage)
  ZUS_HEALTH_MIN_MONTHLY: 432.54, // Minimum health contribution monthly

  // Minimum Wage
  MINIMUM_WAGE_GROSS: 4806,    // Monthly minimum wage gross (effective Jan 1, 2026)
  MINIMUM_WAGE_HOURLY: 31.40,  // Hourly minimum wage gross
  MINIMUM_WAGE_NET: 3531,      // Approximate net amount

  // Miscellaneous
  AVERAGE_SALARY_FORECAST: 9420, // Forecasted average salary for 2026
  EUR_EXCHANGE_RATE: 4.2586,   // EUR rate for 2026 tax calculations (Oct 1, 2025)
};

export class TaxAgent extends BaseAgent {
  readonly name: AgentType = 'tax';
  readonly description = 'Tax compliance and calculation expert for Polish IT businesses';

  constructor(provider: LLMProvider = 'openai') {
    super(provider, 10);
  }

  getSystemPrompt(locale: Locale): string {
    return SYSTEM_PROMPTS[locale] || SYSTEM_PROMPTS.pl;
  }

  getTools(context: AgentContext): StructuredToolInterface[] {
    const { locale } = context;

    // Calculate PIT tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calculatePitTool: StructuredToolInterface = (tool as any)(
      async ({ income, taxType, deductions }: { income: number; taxType: string; deductions?: number }) => {
        try {
          return this.calculatePIT(income, taxType, deductions || 0, locale);
        } catch (error) {
          logger.error('Failed to calculate PIT', { error, income, taxType });
          return 'Error calculating PIT';
        }
      },
      {
        name: 'calculate_pit',
        description: 'Calculate PIT (Personal Income Tax) for given income. Supports scale (12%/32%), flat (19%), and IP Box (5%) rates.',
        schema: z.object({
          income: z.number().min(0).describe('Annual income in PLN'),
          taxType: z.enum(['scale', 'flat', 'ip_box']).describe('Tax type: scale (12%/32%), flat (19%), or ip_box (5%)'),
          deductions: z.number().optional().describe('Tax deductions in PLN'),
        }),
      }
    );

    // Calculate VAT tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calculateVatTool: StructuredToolInterface = (tool as any)(
      async ({ netAmount, vatRate }: { netAmount: number; vatRate: number }) => {
        try {
          return this.calculateVAT(netAmount, vatRate, locale);
        } catch (error) {
          logger.error('Failed to calculate VAT', { error, netAmount, vatRate });
          return 'Error calculating VAT';
        }
      },
      {
        name: 'calculate_vat',
        description: 'Calculate VAT for a given net amount and rate.',
        schema: z.object({
          netAmount: z.number().min(0).describe('Net amount in PLN'),
          vatRate: z.enum(['23', '8', '5', '0']).describe('VAT rate (23%, 8%, 5%, or 0%)'),
        }),
      }
    );

    // IP Box calculation tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calculateIpBoxTool: StructuredToolInterface = (tool as any)(
      async ({ totalIncome, qualifiedIpIncome }: { totalIncome: number; qualifiedIpIncome: number }) => {
        try {
          return this.calculateIPBox(totalIncome, qualifiedIpIncome, locale);
        } catch (error) {
          logger.error('Failed to calculate IP Box', { error, totalIncome, qualifiedIpIncome });
          return 'Error calculating IP Box';
        }
      },
      {
        name: 'calculate_ip_box',
        description: 'Calculate tax savings with IP Box (5% rate for qualified IP income). Compares with standard 19% flat tax.',
        schema: z.object({
          totalIncome: z.number().min(0).describe('Total annual income in PLN'),
          qualifiedIpIncome: z.number().min(0).describe('Income from qualified intellectual property (software, patents) in PLN'),
        }),
      }
    );

    // Tax deadlines tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getTaxDeadlinesTool: StructuredToolInterface = (tool as any)(
      async ({ month, year }: { month?: number; year?: number }) => {
        try {
          const now = new Date();
          const targetMonth = month || now.getMonth() + 1;
          const targetYear = year || now.getFullYear();
          return this.getDeadlines(targetMonth, targetYear, locale);
        } catch (error) {
          logger.error('Failed to get tax deadlines', { error });
          return 'Error fetching deadlines';
        }
      },
      {
        name: 'get_tax_deadlines',
        description: 'Get upcoming tax deadlines for a specific month. Shows VAT, PIT, ZUS, and other filing dates.',
        schema: z.object({
          month: z.number().min(1).max(12).optional().describe('Month (1-12), defaults to current'),
          year: z.number().optional().describe('Year, defaults to current'),
        }),
      }
    );

    // ZUS calculation tool
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calculateZusTool: StructuredToolInterface = (tool as any)(
      async ({ type }: { type: string }) => {
        try {
          return this.calculateZUS(type, locale);
        } catch (error) {
          logger.error('Failed to calculate ZUS', { error, type });
          return 'Error calculating ZUS';
        }
      },
      {
        name: 'calculate_zus',
        description: 'Calculate ZUS (social insurance) contributions for entrepreneurs.',
        schema: z.object({
          type: z.enum(['full', 'preferential', 'small_zus', 'ulga_na_start']).describe('ZUS type: full, preferential (first 24 months), small_zus (income-based), ulga_na_start (first 6 months)'),
        }),
      }
    );

    return [
      calculatePitTool,
      calculateVatTool,
      calculateIpBoxTool,
      getTaxDeadlinesTool,
      calculateZusTool,
    ];
  }

  // Calculation helpers
  private formatNumber(num: number): string {
    return new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }

  private calculatePIT(income: number, taxType: string, deductions: number, locale: Locale): string {
    const t = TRANSLATIONS[locale] || TRANSLATIONS.pl;
    const taxBase = Math.max(0, income - deductions);
    let tax = 0;
    let rateDescription = '';

    switch (taxType) {
      case 'scale':
        if (taxBase <= TAX_CONSTANTS_2026.PIT_THRESHOLD) {
          tax = Math.max(0, taxBase * TAX_CONSTANTS_2026.PIT_RATE_1 - TAX_CONSTANTS_2026.PIT_TAX_DEDUCTION);
          rateDescription = '12% (minus 3,600 PLN)';
        } else {
          tax = TAX_CONSTANTS_2026.PIT_THRESHOLD * TAX_CONSTANTS_2026.PIT_RATE_1 - TAX_CONSTANTS_2026.PIT_TAX_DEDUCTION +
                (taxBase - TAX_CONSTANTS_2026.PIT_THRESHOLD) * TAX_CONSTANTS_2026.PIT_RATE_2;
          rateDescription = '12% / 32%';
        }
        break;
      case 'flat':
        tax = taxBase * TAX_CONSTANTS_2026.PIT_FLAT_RATE;
        rateDescription = '19%';
        break;
      case 'ip_box':
        tax = taxBase * TAX_CONSTANTS_2026.IP_BOX_RATE;
        rateDescription = '5% (IP Box)';
        break;
    }

    let result = `## ${t.pitTitle} - ${t.taxCalculation}\n\n`;
    result += `| ${t.type} | Value |\n`;
    result += '|------|-------|\n';
    result += `| ${t.income} | ${this.formatNumber(income)} PLN |\n`;
    if (deductions > 0) {
      result += `| ${t.deductions} | ${this.formatNumber(deductions)} PLN |\n`;
    }
    result += `| ${t.taxBase} | ${this.formatNumber(taxBase)} PLN |\n`;
    result += `| ${t.taxRate} | ${rateDescription} |\n`;
    result += `| **${t.taxDue}** | **${this.formatNumber(tax)} PLN** |\n`;

    return result;
  }

  private calculateVAT(netAmount: number, vatRate: number, locale: Locale): string {
    const t = TRANSLATIONS[locale] || TRANSLATIONS.pl;
    const rate = parseInt(vatRate.toString()) / 100;
    const vatAmount = netAmount * rate;
    const grossAmount = netAmount + vatAmount;

    let result = `## ${t.vatTitle} - ${t.taxCalculation}\n\n`;
    result += `| ${t.type} | Value |\n`;
    result += '|------|-------|\n';
    result += `| Netto | ${this.formatNumber(netAmount)} PLN |\n`;
    result += `| ${t.taxRate} | ${vatRate}% |\n`;
    result += `| VAT | ${this.formatNumber(vatAmount)} PLN |\n`;
    result += `| **Brutto** | **${this.formatNumber(grossAmount)} PLN** |\n`;

    return result;
  }

  private calculateIPBox(totalIncome: number, qualifiedIpIncome: number, locale: Locale): string {
    const t = TRANSLATIONS[locale] || TRANSLATIONS.pl;
    const regularIncome = totalIncome - qualifiedIpIncome;

    // Tax with IP Box
    const ipBoxTax = qualifiedIpIncome * TAX_CONSTANTS_2026.IP_BOX_RATE;
    const regularTax = regularIncome * TAX_CONSTANTS_2026.PIT_FLAT_RATE;
    const totalWithIpBox = ipBoxTax + regularTax;

    // Tax without IP Box (all at 19%)
    const taxWithout = totalIncome * TAX_CONSTANTS_2026.PIT_FLAT_RATE;

    // Savings
    const savings = taxWithout - totalWithIpBox;

    let result = `## ${t.ipBoxTitle}\n\n`;
    result += `| ${t.type} | Value |\n`;
    result += '|------|-------|\n';
    result += `| ${t.income} | ${this.formatNumber(totalIncome)} PLN |\n`;
    result += `| ${t.qualifiedIncome} | ${this.formatNumber(qualifiedIpIncome)} PLN |\n`;
    result += `| ${t.regularIncome} | ${this.formatNumber(regularIncome)} PLN |\n`;
    result += `| ${t.ipBoxRate} (5%) | ${this.formatNumber(ipBoxTax)} PLN |\n`;
    result += `| ${t.taxRate} (19%) | ${this.formatNumber(regularTax)} PLN |\n`;
    result += `| **${t.totalTax}** | **${this.formatNumber(totalWithIpBox)} PLN** |\n`;
    result += `| ${t.taxDue} (bez IP Box) | ${this.formatNumber(taxWithout)} PLN |\n`;
    result += `| **${t.taxSavings}** | **${this.formatNumber(savings)} PLN** |\n`;

    if (savings > 0) {
      const savingsPercent = ((savings / taxWithout) * 100).toFixed(1);
      result += `\n> 💡 IP Box pozwala zaoszczędzić **${savingsPercent}%** podatku rocznie!`;
    }

    return result;
  }

  private getDeadlines(month: number, year: number, locale: Locale): string {
    const t = TRANSLATIONS[locale] || TRANSLATIONS.pl;
    const now = new Date();

    // Generate deadline dates for the month
    const deadlines = [
      { type: 'ZUS', day: 15, desc: 'Social contributions' },
      { type: 'PIT-4R', day: 20, desc: 'PIT advance payment' },
      { type: 'VAT-7 / JPK_V7', day: 25, desc: 'VAT return & JPK file' },
    ];

    let result = `## ${t.deadlines} - ${month.toString().padStart(2, '0')}/${year}\n\n`;
    result += `| ${t.type} | ${t.dueDate} | ${t.daysLeft} |\n`;
    result += '|------|------|------|\n';

    deadlines.forEach(d => {
      const dueDate = new Date(year, month - 1, d.day);
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let status = '';
      if (diffDays < 0) {
        status = `⚠️ ${t.overdue}`;
      } else if (diffDays <= 5) {
        status = `⚠️ ${diffDays}`;
      } else {
        status = `${diffDays}`;
      }

      const dateStr = `${d.day.toString().padStart(2, '0')}.${month.toString().padStart(2, '0')}.${year}`;
      result += `| **${d.type}** | ${dateStr} | ${status} |\n`;
    });

    const upcomingUrgent = deadlines.some(d => {
      const dueDate = new Date(year, month - 1, d.day);
      const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 5;
    });

    if (upcomingUrgent) {
      result += `\n> ⚠️ ${t.warning}`;
    }

    return result;
  }

  private calculateZUS(type: string, locale: Locale): string {
    const t = TRANSLATIONS[locale] || TRANSLATIONS.pl;

    // ZUS rates for 2026 (updated with official data)
    const contributions: Record<string, { monthly: number; healthMin: number; desc: string }> = {
      full: {
        monthly: TAX_CONSTANTS_2026.ZUS_FULL_MONTHLY,
        healthMin: TAX_CONSTANTS_2026.ZUS_HEALTH_MIN_MONTHLY,
        desc: locale === 'pl' ? 'Pełne składki (duży ZUS)' :
              locale === 'ru' ? 'Полные взносы (большой ЗУС)' :
              'Full contributions (regular ZUS)',
      },
      preferential: {
        monthly: TAX_CONSTANTS_2026.ZUS_PREFERENTIAL_MONTHLY,
        healthMin: TAX_CONSTANTS_2026.ZUS_HEALTH_MIN_MONTHLY,
        desc: locale === 'pl' ? 'Preferencyjne (pierwsze 24 miesiące)' :
              locale === 'ru' ? 'Льготные (первые 24 месяца)' :
              'Preferential (first 24 months)',
      },
      small_zus: {
        monthly: TAX_CONSTANTS_2026.ZUS_PREFERENTIAL_MONTHLY,
        healthMin: TAX_CONSTANTS_2026.ZUS_HEALTH_MIN_MONTHLY,
        desc: locale === 'pl' ? 'Mały ZUS Plus (na podstawie dochodu)' :
              locale === 'ru' ? 'Малый ЗУС Плюс (на основе дохода)' :
              'Small ZUS Plus (income-based)',
      },
      ulga_na_start: {
        monthly: 0,
        healthMin: 0,
        desc: locale === 'pl' ? 'Ulga na start (pierwsze 6 miesięcy)' :
              locale === 'ru' ? 'Льгота на старт (первые 6 месяцев)' :
              'Startup relief (first 6 months)',
      },
    };

    const c = contributions[type] || contributions.full;
    const totalMonthly = c.monthly + c.healthMin;
    const annual = totalMonthly * 12;

    let result = `## ${t.zusTitle} (2026)\n\n`;
    result += `**${c.desc}**\n\n`;
    result += `| ${t.type} | ${locale === 'pl' ? 'Kwota' : locale === 'ru' ? 'Сумма' : 'Amount'} |\n`;
    result += '|--------|--------|\n';
    result += `| ${locale === 'pl' ? 'Składki społeczne' : locale === 'ru' ? 'Соц. взносы' : 'Social contributions'} | ${this.formatNumber(c.monthly)} PLN |\n`;
    result += `| ${locale === 'pl' ? 'Składka zdrowotna (min)' : locale === 'ru' ? 'Мед. взнос (мин)' : 'Health contribution (min)'} | ${this.formatNumber(c.healthMin)} PLN |\n`;
    result += `| **${locale === 'pl' ? 'Razem miesięcznie' : locale === 'ru' ? 'Итого в месяц' : 'Total monthly'}** | **${this.formatNumber(totalMonthly)} PLN** |\n`;
    result += `| ${locale === 'pl' ? 'Rocznie' : locale === 'ru' ? 'В год' : 'Annually'} | ${this.formatNumber(annual)} PLN |\n`;

    if (type === 'ulga_na_start') {
      const afterStartupMonthly = contributions.preferential.monthly + contributions.preferential.healthMin;
      result += `\n> 💡 ${locale === 'pl' ? 'Po 6 miesiącach przechodzisz na stawkę preferencyjną' :
                        locale === 'ru' ? 'После 6 месяцев переход на льготную ставку' :
                        'After 6 months, you switch to preferential rate'} (${this.formatNumber(afterStartupMonthly)} PLN/${locale === 'pl' ? 'mies.' : locale === 'ru' ? 'мес.' : 'mo'})`;
    }

    if (type === 'full') {
      result += `\n\n> ℹ️ ${locale === 'pl' ? 'Podstawa: 5 652 PLN (60% prognozowanego przeciętnego wynagrodzenia)' :
                        locale === 'ru' ? 'База: 5 652 PLN (60% прогнозируемой средней зарплаты)' :
                        'Base: 5,652 PLN (60% of forecasted average salary)'}`;
    }

    return result;
  }
}
