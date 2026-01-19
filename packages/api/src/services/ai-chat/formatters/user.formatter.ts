/**
 * User Data Formatter
 * Formats user and user-company information for AI responses (localized)
 */

import { WFirmaUser, WFirmaUserCompany } from '../../../types/wfirma.types';
import { getUserTranslations, Locale } from '../../../i18n';

export function formatUsers(users: WFirmaUser[], locale: Locale = 'pl'): string {
  const t = getUserTranslations(locale);

  if (users.length === 0) {
    return t.noUsers;
  }

  let result = `## ${t.usersTitle} (${users.length})\n\n`;
  result += `| ${t.name} | ${t.email} | ${t.login} | ${t.role} | ${t.status} |\n`;
  result += '|---|---|---|---|---|\n';

  users.forEach((u) => {
    const status = u.isActive ? `✅ ${t.active}` : `❌ ${t.inactive}`;
    result += `| ${u.name} | ${u.email || '-'} | ${u.login || '-'} | ${u.role || '-'} | ${status} |\n`;
  });

  return result;
}

export function formatUserCompanies(userCompanies: WFirmaUserCompany[], locale: Locale = 'pl'): string {
  const t = getUserTranslations(locale);

  if (userCompanies.length === 0) {
    return t.noUserCompanies;
  }

  let result = `## ${t.userCompaniesTitle} (${userCompanies.length})\n\n`;
  result += `| ${t.id} | ${t.userId} | ${t.companyId} | ${t.role} | ${t.permissions} |\n`;
  result += '|---|---|---|---|---|\n';

  userCompanies.forEach((uc) => {
    result += `| ${uc.id} | ${uc.userId} | ${uc.companyId} | ${uc.role || '-'} | ${uc.permissions || '-'} |\n`;
  });

  return result;
}

export function formatUserCompany(uc: WFirmaUserCompany, locale: Locale = 'pl'): string {
  const t = getUserTranslations(locale);

  return `## ${t.detailsTitle}

| ${t.field} | ${t.value} |
|---|---|
| **${t.id}** | \`${uc.id}\` |
| **${t.userId}** | ${uc.userId} |
| **${t.companyId}** | ${uc.companyId} |
| **${t.role}** | ${uc.role || '-'} |
| **${t.permissions}** | ${uc.permissions || '-'} |`;
}
