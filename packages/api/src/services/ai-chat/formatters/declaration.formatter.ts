/**
 * Declaration Data Formatter
 * Formats declaration information for AI responses (localized)
 */

import { DeclarationResult } from '../../../types/wfirma.types';
import { getDeclarationTranslations, Locale } from '../../../i18n';

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format file size in KB
 */
function formatFileSize(bytes: number): string {
  return (bytes / 1024).toFixed(2) + ' KB';
}

/**
 * Format declaration result with download link
 * @param declaration - Declaration result from wFirma
 * @param fileId - Stored file ID for download
 * @param locale - User locale
 * @param type - Declaration type
 * @returns Formatted markdown string
 */
export function formatDeclarationResult(
  declaration: DeclarationResult,
  fileId: string,
  locale: Locale,
  type: 'jpk_vat' | 'pit'
): string {
  const t = getDeclarationTranslations(locale);
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

  let result = `## ${type === 'jpk_vat' ? t.jpkVatTitle : t.pitTitle}\n\n`;

  // Table with file information
  result += `| ${t.field} | ${t.value} |\n`;
  result += '|----------|--------|\n';
  result += `| ${t.filename} | ${declaration.filename} |\n`;
  result += `| ${t.generatedAt} | ${formatDate(declaration.generatedAt)} |\n`;
  result += `| ${t.fileSize} | ${formatFileSize(declaration.xml.length)} |\n`;

  // Download link section
  result += `\n### ${t.downloadFile}\n\n`;
  result += `📥 [${t.clickToDownload}](${backendUrl}/api/files/download/${fileId})\n\n`;

  // Expiration notice
  result += `> 💡 ${t.fileExpiresIn15Minutes}\n`;

  return result;
}
