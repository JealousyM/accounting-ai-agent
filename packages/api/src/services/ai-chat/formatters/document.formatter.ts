/**
 * Document Data Formatter
 * Formats document information for AI responses (localized)
 */

import { WFirmaDocument } from '../../../types/wfirma.types';
import { getDocumentTranslations, Locale } from '../../../i18n';

/**
 * Format document type for display
 */
export function formatDocumentType(type: string, locale: Locale = 'pl'): string {
  const t = getDocumentTranslations(locale);
  switch (type) {
    case 'file':
      return t.typeFile;
    case 'document_template':
      return t.typeTemplate;
    case 'url':
      return t.typeUrl;
    default:
      return type;
  }
}

/**
 * Format document set for display
 */
export function formatDocumentSet(set: string, locale: Locale = 'pl'): string {
  const t = getDocumentTranslations(locale);
  switch (set) {
    case 'book':
      return t.setBook;
    case 'crm':
      return t.setCrm;
    case 'declaration':
      return t.setDeclaration;
    case 'staff':
      return t.setStaff;
    case 'warehouse':
      return t.setWarehouse;
    default:
      return set;
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Format date for display
 */
export function formatDate(date: Date | undefined): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Check if document is downloadable (type='file')
 */
export function isDownloadable(document: WFirmaDocument): boolean {
  return document.type === 'file';
}

/**
 * Format list of documents
 */
export function formatDocumentsList(
  documents: WFirmaDocument[],
  locale: Locale = 'pl'
): string {
  const t = getDocumentTranslations(locale);

  if (documents.length === 0) {
    return t.notFound;
  }

  let result = `## ${t.documentsTitle} (${documents.length})\n\n`;
  result += `| # | ${t.name} | ${t.type} | ${t.set} | ${t.size} | ID |\n`;
  result += '|---|------|------|--------|--------|----|\n';

  documents.forEach((d, i) => {
    const downloadMark = isDownloadable(d) ? ' 📥' : '';
    result += `| ${i + 1} | **${d.name}**${downloadMark} | ${formatDocumentType(d.type, locale)} | ${formatDocumentSet(d.set, locale)} | ${formatFileSize(d.size)} | \`${d.id}\` |\n`;
  });

  result += `\n> ${t.downloadHint}`;

  return result;
}

/**
 * Format document details with optional download link
 */
export function formatDocumentDetails(
  document: WFirmaDocument,
  locale: Locale = 'pl',
  fileId?: string
): string {
  const t = getDocumentTranslations(locale);
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

  let result = `## ${t.documentDetails}: ${document.name}\n\n`;

  // Basic info table
  result += `| ${t.field} | ${t.value} |\n`;
  result += '|------|----------|\n';
  result += `| **${t.id}** | \`${document.id}\` |\n`;
  result += `| **${t.name}** | ${document.name} |\n`;
  result += `| **${t.type}** | ${formatDocumentType(document.type, locale)} |\n`;
  result += `| **${t.set}** | ${formatDocumentSet(document.set, locale)} |\n`;

  if (document.filename) {
    result += `| **${t.filename}** | ${document.filename} |\n`;
  }
  if (document.mime) {
    result += `| **${t.mimeType}** | ${document.mime} |\n`;
  }
  if (document.size) {
    result += `| **${t.size}** | ${formatFileSize(document.size)} |\n`;
  }
  if (document.objectName) {
    result += `| **${t.relatedObject}** | ${document.objectName} (ID: ${document.objectId || '-'}) |\n`;
  }
  if (document.text) {
    result += `| **${t.description}** | ${document.text} |\n`;
  }
  if (document.url) {
    result += `| **${t.url}** | [${t.openLink}](${document.url}) |\n`;
  }
  if (document.tags && document.tags.length > 0) {
    result += `| **${t.tags}** | ${document.tags.join(', ')} |\n`;
  }

  result += `| **${t.created}** | ${formatDate(document.created)} |\n`;
  result += `| **${t.modified}** | ${formatDate(document.modified)} |\n`;

  // Download section (only for files)
  if (isDownloadable(document) && fileId) {
    result += `\n### ${t.downloadFile}\n\n`;
    result += `📥 [${t.clickToDownload}](${backendUrl}/api/files/download/${fileId})\n\n`;
    result += `> 💡 ${t.fileExpiresIn15Minutes}\n`;
  }

  return result;
}

/**
 * Format document with download link (for AI responses)
 */
export function formatDocumentWithDownload(
  document: WFirmaDocument,
  fileId: string,
  locale: Locale = 'pl'
): string {
  return formatDocumentDetails(document, locale, fileId);
}

/**
 * Format document deletion confirmation
 */
export function formatDocumentDeleted(
  document: WFirmaDocument,
  locale: Locale = 'pl'
): string {
  const t = getDocumentTranslations(locale);
  return `## ${t.deleted}

- **${t.id}:** \`${document.id}\`
- **${t.name}:** ${document.name}
- **${t.type}:** ${formatDocumentType(document.type, locale)}

> ${t.deletedWarning}`;
}
