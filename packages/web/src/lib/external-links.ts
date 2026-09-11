/**
 * Outbound links to the other MICODE properties.
 *
 * Single source of truth for the cross-product backlinks rendered in the
 * footers and on /products, and for the Organization JSON-LD `sameAs` list.
 * These are our own properties, so they are deliberately followed (no
 * `nofollow`) — link equity should flow between them.
 */

export type MicodeLinkKey = 'micode' | 'aiBudget' | 'aiBudgetApp' | 'aiBudgetPlay';

export interface MicodeLink {
  /** Stable id; doubles as the i18n key for the link's label suffix. */
  key: MicodeLinkKey;
  /** Brand name shown in the label — never translated. */
  name: string;
  url: string;
}

export const MICODE_LINKS: readonly MicodeLink[] = [
  { key: 'micode', name: 'MICODE', url: 'https://mi-code.pl' },
  { key: 'aiBudget', name: 'AI Budget', url: 'https://ai-budget.pl' },
  { key: 'aiBudgetApp', name: 'AI Budget', url: 'https://app.ai-budget.pl' },
  {
    key: 'aiBudgetPlay',
    name: 'AI Budget',
    url: 'https://play.google.com/store/apps/details?id=com.budget.assistant',
  },
];

/**
 * URLs that identify MICODE elsewhere on the web, for Organization `sameAs`.
 * The app subdomain is excluded: it is a product surface, not an identity page.
 */
export const MICODE_SAME_AS: readonly string[] = MICODE_LINKS.filter(
  (l) => l.key !== 'aiBudgetApp',
).map((l) => l.url);

/** Look one link up by key. Throws on an unknown key so a typo fails loudly. */
export function micodeLink(key: MicodeLinkKey): MicodeLink {
  const found = MICODE_LINKS.find((l) => l.key === key);
  if (!found) throw new Error(`Unknown MICODE link key: ${key}`);
  return found;
}
