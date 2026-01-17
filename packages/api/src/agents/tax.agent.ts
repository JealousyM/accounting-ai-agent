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
  pl: `Jesteś ekspertem od polskiego prawa podatkowego dla branży IT.

## Twoje specjalizacje:
- **VAT**: stawki (23%, 8%, 5%, 0%), JPK_V7, odwrotne obciążenie, OSS
- **PIT**: skala (12%/32%), liniowy 19%, ryczałt, IP Box 5%
- **CIT**: estoński CIT, stawki 9%/19%
- **ZUS**: składki przedsiębiorcy, mały ZUS, ulga na start

## Kluczowe terminy:
- VAT-7, JPK_V7: do 25. dnia miesiąca
- PIT zaliczka: do 20. dnia miesiąca
- ZUS: do 15. dnia miesiąca (za poprzedni)
- PIT roczny: do 30 kwietnia

## Zasady:
- Podawaj podstawy prawne (ustawa, artykuł)
- Ostrzegaj o zbliżających się terminach
- Sugeruj legalne optymalizacje (IP Box dla IT)
- Używaj tabel markdown do kalkulacji`,

  en: `You are a Polish tax law expert for the IT industry.

## Your specializations:
- **VAT**: rates (23%, 8%, 5%, 0%), JPK_V7, reverse charge, OSS
- **PIT**: scale (12%/32%), flat 19%, lump sum, IP Box 5%
- **CIT**: Estonian CIT, rates 9%/19%
- **ZUS**: entrepreneur contributions, small ZUS, startup relief

## Key deadlines:
- VAT-7, JPK_V7: by 25th of the month
- PIT advance: by 20th of the month
- ZUS: by 15th of the month (for previous)
- Annual PIT: by April 30th

## Rules:
- Cite legal bases (law, article)
- Warn about approaching deadlines
- Suggest legal optimizations (IP Box for IT)
- Use markdown tables for calculations`,

  ru: `Вы эксперт по польскому налоговому праву для IT-отрасли.

## Ваши специализации:
- **НДС**: ставки (23%, 8%, 5%, 0%), JPK_V7, обратное начисление, OSS
- **ПИТ**: шкала (12%/32%), линейный 19%, рычалт, IP Box 5%
- **ЦИТ**: эстонский ЦИТ, ставки 9%/19%
- **ЗУС**: взносы предпринимателя, малый ЗУС, льгота на старт

## Ключевые сроки:
- VAT-7, JPK_V7: до 25-го числа месяца
- ПИТ аванс: до 20-го числа месяца
- ЗУС: до 15-го числа месяца (за предыдущий)
- Годовой ПИТ: до 30 апреля

## Правила:
- Указывайте правовые основания (закон, статья)
- Предупреждайте о приближающихся сроках
- Предлагайте законные оптимизации (IP Box для IT)
- Используйте markdown таблицы для расчетов`,
};

// Polish tax constants for 2024
const TAX_CONSTANTS = {
  PIT_THRESHOLD: 120000, // PLN - first bracket limit
  PIT_RATE_1: 0.12,      // 12% for income up to 120k
  PIT_RATE_2: 0.32,      // 32% for income over 120k
  PIT_FLAT_RATE: 0.19,   // 19% flat tax
  IP_BOX_RATE: 0.05,     // 5% IP Box rate
  CIT_RATE_SMALL: 0.09,  // 9% for small taxpayers
  CIT_RATE_STANDARD: 0.19, // 19% standard
  VAT_STANDARD: 0.23,    // 23% VAT
  VAT_REDUCED_1: 0.08,   // 8% VAT
  VAT_REDUCED_2: 0.05,   // 5% VAT
  ZUS_BASE_2024: 4694.40, // Base for ZUS in 2024
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
        if (taxBase <= TAX_CONSTANTS.PIT_THRESHOLD) {
          tax = taxBase * TAX_CONSTANTS.PIT_RATE_1;
          rateDescription = '12%';
        } else {
          tax = TAX_CONSTANTS.PIT_THRESHOLD * TAX_CONSTANTS.PIT_RATE_1 +
                (taxBase - TAX_CONSTANTS.PIT_THRESHOLD) * TAX_CONSTANTS.PIT_RATE_2;
          rateDescription = '12% / 32%';
        }
        break;
      case 'flat':
        tax = taxBase * TAX_CONSTANTS.PIT_FLAT_RATE;
        rateDescription = '19%';
        break;
      case 'ip_box':
        tax = taxBase * TAX_CONSTANTS.IP_BOX_RATE;
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
    const ipBoxTax = qualifiedIpIncome * TAX_CONSTANTS.IP_BOX_RATE;
    const regularTax = regularIncome * TAX_CONSTANTS.PIT_FLAT_RATE;
    const totalWithIpBox = ipBoxTax + regularTax;

    // Tax without IP Box (all at 19%)
    const taxWithout = totalIncome * TAX_CONSTANTS.PIT_FLAT_RATE;

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

    // ZUS rates for 2024 (simplified)
    const contributions: Record<string, { monthly: number; desc: string }> = {
      full: { monthly: 1600.27, desc: 'Full contributions (standard)' },
      preferential: { monthly: 402.65, desc: 'Preferential (first 24 months)' },
      small_zus: { monthly: 800.00, desc: 'Small ZUS (income-based, avg)' },
      ulga_na_start: { monthly: 0, desc: 'Startup relief (first 6 months)' },
    };

    const c = contributions[type] || contributions.full;
    const annual = c.monthly * 12;

    let result = `## ${t.zusTitle}\n\n`;
    result += `**${c.desc}**\n\n`;
    result += `| Period | Amount |\n`;
    result += '|--------|--------|\n';
    result += `| Monthly | ${this.formatNumber(c.monthly)} PLN |\n`;
    result += `| Annual | ${this.formatNumber(annual)} PLN |\n`;

    if (type === 'ulga_na_start') {
      result += `\n> 💡 After 6 months, you switch to preferential rate (${this.formatNumber(contributions.preferential.monthly)} PLN/month)`;
    }

    return result;
  }
}
