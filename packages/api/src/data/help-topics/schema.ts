import { readFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

const LocaleEntrySchema = z.object({
  slug: z.string(),
  title: z.string(),
  content: z.string(),
  searchKeywords: z.array(z.string()),
});

const TopicMetaSchema = z.object({
  slug: z.string(),
  category: z.string(),
  order: z.number(),
  isFeatured: z.boolean(),
});

const HelpTopicSchema = z.object({
  slug: z.string(),
  category: z.string(),
  titlePl: z.string(),
  titleEn: z.string(),
  titleRu: z.string(),
  contentPl: z.string(),
  contentEn: z.string(),
  contentRu: z.string(),
  searchKeywordsPl: z.array(z.string()),
  searchKeywordsEn: z.array(z.string()),
  searchKeywordsRu: z.array(z.string()),
  order: z.number(),
  isFeatured: z.boolean(),
});

export type HelpTopic = z.infer<typeof HelpTopicSchema>;

function readJson<T>(schema: z.ZodType<T>, filename: string): T[] {
  const raw = readFileSync(join(__dirname, filename), 'utf-8');
  return z.array(schema).parse(JSON.parse(raw));
}

function loadHelpTopics(): HelpTopic[] {
  const meta = readJson(TopicMetaSchema, 'meta.json');
  const en = readJson(LocaleEntrySchema, 'en.json');
  const pl = readJson(LocaleEntrySchema, 'pl.json');
  const ru = readJson(LocaleEntrySchema, 'ru.json');

  const bySlug = <T extends { slug: string }>(entries: T[]): Map<string, T> =>
    new Map(entries.map((e) => [e.slug, e]));

  const enMap = bySlug(en);
  const plMap = bySlug(pl);
  const ruMap = bySlug(ru);

  return meta.map((m) => {
    const enEntry = enMap.get(m.slug);
    const plEntry = plMap.get(m.slug);
    const ruEntry = ruMap.get(m.slug);

    if (!enEntry || !plEntry || !ruEntry) {
      throw new Error(
        `help-topics: missing locale entry for slug "${m.slug}" ` +
          `(en=${!!enEntry}, pl=${!!plEntry}, ru=${!!ruEntry})`
      );
    }

    return HelpTopicSchema.parse({
      slug: m.slug,
      category: m.category,
      order: m.order,
      isFeatured: m.isFeatured,
      titleEn: enEntry.title,
      contentEn: enEntry.content,
      searchKeywordsEn: enEntry.searchKeywords,
      titlePl: plEntry.title,
      contentPl: plEntry.content,
      searchKeywordsPl: plEntry.searchKeywords,
      titleRu: ruEntry.title,
      contentRu: ruEntry.content,
      searchKeywordsRu: ruEntry.searchKeywords,
    });
  });
}

export const helpTopics: HelpTopic[] = loadHelpTopics();
