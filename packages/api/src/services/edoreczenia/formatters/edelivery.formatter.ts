import { Locale, getEDeliveryTranslations } from '../../../i18n';

interface LetterRow {
  id: string;
  senderName: string | null;
  subject: string | null;
  receivedAt: Date;
  status: string;
  analysis: { severity?: string } | null;
  deadlines?: Array<{ dueDate: Date; type: string }>;
}

function severityLabel(sev: string | undefined, t: ReturnType<typeof getEDeliveryTranslations>): string {
  if (sev === 'high') return t.severityHigh;
  if (sev === 'medium') return t.severityMedium;
  return t.severityLow;
}

export function formatLettersList(letters: LetterRow[], locale: Locale): string {
  const t = getEDeliveryTranslations(locale);
  if (letters.length === 0) return t.noLetters;
  const lines = [`## ${t.lettersListTitle}`, ''];
  for (const l of letters) {
    lines.push(`- **${l.senderName ?? '—'}** — ${l.subject ?? ''}`);
    lines.push(`  ${severityLabel(l.analysis?.severity, t)} · ${l.receivedAt.toISOString().slice(0, 10)}`);
  }
  return lines.join('\n');
}

export function formatMarkedDone(locale: Locale): string {
  return `✅ ${getEDeliveryTranslations(locale).markedDone}`;
}
