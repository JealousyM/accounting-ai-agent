import plTranslations from '../locales/pl.json';
import enTranslations from '../locales/en.json';
import ruTranslations from '../locales/ru.json';

function collectKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    collectKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe('i18n locale key parity', () => {
  const plKeys = new Set(collectKeys(plTranslations));

  test.each([
    ['en', enTranslations],
    ['ru', ruTranslations],
  ])('%s.json has all keys from pl.json', (_locale, translations) => {
    const localeKeys = new Set(collectKeys(translations));
    const missing = [...plKeys].filter(k => !localeKeys.has(k));
    expect(missing).toEqual([]);
  });
});
