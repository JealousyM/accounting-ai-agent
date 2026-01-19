/**
 * Company Data Formatter
 * Formats company information for AI responses
 */

import {
  WFirmaCompany,
  WFirmaCompanyAccount,
  WFirmaCompanyAddress,
  WFirmaCompanyPack,
  WFirmaCompanyDetails,
  CompanyPackType,
} from '../../../types/wfirma.types';
import { Locale, getCompanyTranslations } from '../../../i18n';

/**
 * Format company basic info
 */
export function formatCompanyInfo(company: WFirmaCompany, locale: Locale = 'pl'): string {
  const t = getCompanyTranslations(locale);
  const addr = company.address;
  const addressStr = addr ? `${addr.street}, ${addr.zip} ${addr.city}, ${addr.country}` : '-';

  let result = `## ${t.companyInfo}\n\n`;
  result += `| ${t.companyTitle} | |\n`;
  result += '|-------|-------|\n';
  result += `| **${t.name}** | ${company.name} |\n`;
  result += `| **${t.nip}** | ${company.nip} |\n`;
  if (company.regon) {
    result += `| **${t.regon}** | ${company.regon} |\n`;
  }
  if (company.krs) {
    result += `| **${t.krs}** | ${company.krs} |\n`;
  }
  result += `| **${t.address}** | ${addressStr} |\n`;
  if (company.email) {
    result += `| **${t.email}** | ${company.email} |\n`;
  }
  if (company.phone) {
    result += `| **${t.phone}** | ${company.phone} |\n`;
  }
  if (company.website) {
    result += `| **${t.website}** | ${company.website} |\n`;
  }

  return result;
}

/**
 * Format company bank accounts
 */
export function formatCompanyAccounts(accounts: WFirmaCompanyAccount[], locale: Locale = 'pl'): string {
  const t = getCompanyTranslations(locale);

  if (!accounts || accounts.length === 0) {
    return `## ${t.accountsTitle}\n\n${t.noAccounts}`;
  }

  let result = `## ${t.accountsTitle}\n\n`;
  result += `| # | ${t.accountNumber} | ${t.bankName} | ${t.swift} | ${t.isDefault} |\n`;
  result += '|---|----------------|-----------|-------|----------|\n';

  accounts.forEach((acc, index) => {
    const defaultStr = acc.isDefault ? t.yes : t.no;
    result += `| ${index + 1} | \`${acc.accountNumber}\` | ${acc.bankName || '-'} | ${acc.swift || '-'} | ${defaultStr} |\n`;
  });

  return result;
}

/**
 * Format company addresses
 */
export function formatCompanyAddresses(addresses: WFirmaCompanyAddress[], locale: Locale = 'pl'): string {
  const t = getCompanyTranslations(locale);

  if (!addresses || addresses.length === 0) {
    return `## ${t.addressesTitle}\n\n${t.noAddresses}`;
  }

  let result = `## ${t.addressesTitle}\n\n`;

  addresses.forEach((addr) => {
    const typeLabel = addr.type === 'main'
      ? t.mainAddress
      : addr.type === 'correspondence'
        ? t.correspondenceAddress
        : t.address;

    result += `### ${typeLabel}${addr.isMain ? ' ✓' : ''}\n\n`;
    result += `| ${t.companyTitle} | |\n`;
    result += '|-------|-------|\n';
    if (addr.street) {
      result += `| **${t.street}** | ${addr.street} |\n`;
    }
    if (addr.city) {
      result += `| **${t.city}** | ${addr.city} |\n`;
    }
    if (addr.zip) {
      result += `| **${t.zip}** | ${addr.zip} |\n`;
    }
    if (addr.country) {
      result += `| **${t.country}** | ${addr.country} |\n`;
    }
    result += '\n';
  });

  return result;
}

/**
 * Format pack type to human-readable string
 */
function formatPackTypeName(packType: CompanyPackType, locale: Locale): string {
  const t = getCompanyTranslations(locale);
  const packNames: Record<CompanyPackType, string> = {
    'pack_trade': t.packTrade,
    'pack_tradew': t.packTradeW,
    'pack_book': t.packBook,
    'pack_bookw': t.packBookW,
  };
  return packNames[packType] || packType;
}

/**
 * Format company subscription/pack info
 */
export function formatCompanyPack(pack: WFirmaCompanyPack | null, locale: Locale = 'pl'): string {
  const t = getCompanyTranslations(locale);

  if (!pack) {
    return `## ${t.subscriptionTitle}\n\n${t.noPack}`;
  }

  const packName = formatPackTypeName(pack.pack, locale);
  const expirationDate = pack.expirationDate instanceof Date
    ? pack.expirationDate.toLocaleDateString(locale === 'pl' ? 'pl-PL' : locale === 'ru' ? 'ru-RU' : 'en-US')
    : new Date(pack.expirationDate).toLocaleDateString(locale === 'pl' ? 'pl-PL' : locale === 'ru' ? 'ru-RU' : 'en-US');

  const isActive = new Date(pack.expirationDate) > new Date();
  const statusStr = isActive ? t.active : t.inactive;

  let result = `## ${t.subscriptionTitle}\n\n`;
  result += `| ${t.companyTitle} | |\n`;
  result += '|-------|-------|\n';
  result += `| **${t.packType}** | ${packName} |\n`;
  result += `| **${t.months}** | ${pack.months} |\n`;
  result += `| **${t.expirationDate}** | ${expirationDate} |\n`;
  result += `| **${t.status}** | ${statusStr} ${isActive ? '✅' : '⚠️'} |\n`;

  return result;
}

/**
 * Format complete company details
 */
export function formatCompanyDetails(details: WFirmaCompanyDetails, locale: Locale = 'pl'): string {
  let result = formatCompanyInfo(details, locale);
  result += '\n\n';
  result += formatCompanyAccounts(details.accounts, locale);
  result += '\n\n';
  result += formatCompanyAddresses(details.addresses, locale);
  result += '\n\n';
  result += formatCompanyPack(details.pack || null, locale);

  return result;
}
