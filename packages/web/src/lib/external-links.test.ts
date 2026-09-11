import { MICODE_LINKS, MICODE_SAME_AS } from './external-links';

const MAIN_SITE = 'https://mi-code.pl';
const AI_BUDGET = 'https://ai-budget.pl';
const AI_BUDGET_APP = 'https://app.ai-budget.pl';
const AI_BUDGET_PLAY = 'https://play.google.com/store/apps/details?id=com.budget.assistant';

describe('MICODE_LINKS', () => {
  it('lists the main site, the AI Budget landing, its web app and the Play listing', () => {
    expect(MICODE_LINKS.map((l) => l.url)).toEqual([
      MAIN_SITE,
      AI_BUDGET,
      AI_BUDGET_APP,
      AI_BUDGET_PLAY,
    ]);
  });

  it('carries a brand name and a stable key for every link', () => {
    expect(MICODE_LINKS.map((l) => l.key)).toEqual([
      'micode',
      'aiBudget',
      'aiBudgetApp',
      'aiBudgetPlay',
    ]);
    for (const link of MICODE_LINKS) {
      expect(link.name).not.toHaveLength(0);
    }
  });

  it('only points at https origins, with no duplicate url', () => {
    const urls = MICODE_LINKS.map((l) => l.url);
    for (const url of urls) {
      expect(url.startsWith('https://')).toBe(true);
    }
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe('MICODE_SAME_AS', () => {
  it('advertises the identity pages, leaving out the app subdomain', () => {
    expect(MICODE_SAME_AS).toEqual([MAIN_SITE, AI_BUDGET, AI_BUDGET_PLAY]);
  });
});
