/**
 * Company Data Formatter
 * Formats company information for AI responses
 */

import { WFirmaCompany } from '../../../types/wfirma.types';

export function formatCompanyInfo(company: WFirmaCompany): string {
  return `Company Information:
- Name: ${company.name}
- NIP: ${company.nip}
${company.regon ? `- REGON: ${company.regon}` : ''}
${company.krs ? `- KRS: ${company.krs}` : ''}
- Address: ${company.address.street}, ${company.address.zip} ${company.address.city}, ${company.address.country}
${company.bankAccounts.length > 0 ? `- Bank Account: ${company.bankAccounts[0].accountNumber} (${company.bankAccounts[0].bankName})` : ''}
${company.email ? `- Email: ${company.email}` : ''}
${company.phone ? `- Phone: ${company.phone}` : ''}`;
}
