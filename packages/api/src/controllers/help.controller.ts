/**
 * Help Controller
 * Handles API requests for multilingual help topics
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import type { Locale } from '../i18n';

const getTopicsSchema = z.object({
  locale: z.enum(['pl', 'en', 'ru']).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
});

export class HelpController {
  /**
   * GET /api/help/topics
   * Get all published help topics with optional filtering
   */
  async getTopics(req: Request, res: Response) {
    try {
      const { locale = 'en', category, search } = getTopicsSchema.parse(req.query);

      const where: any = { isPublished: true };
      if (category) where.category = category;

      let topics = await prisma.helpTopic.findMany({
        where,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      });

      // Apply search filter if provided
      interface SearchMatch {
        inTitle: boolean;
        inContent: boolean;
        inKeywords: boolean;
        matchedKeywords: string[];
        contentSnippet?: string;
      }

      const searchMatches = new Map<string, SearchMatch>();

      if (search) {
        const searchLower = search.toLowerCase();
        topics = topics.filter((topic) => {
          const titleKey = `title${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof typeof topic;
          const contentKey = `content${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof typeof topic;
          const keywordsKey = `searchKeywords${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof typeof topic;

          const title = topic[titleKey] as string;
          const content = topic[contentKey] as string;
          const keywords = topic[keywordsKey] as string[];

          const inTitle = title.toLowerCase().includes(searchLower);
          const inContent = content.toLowerCase().includes(searchLower);
          const matchedKeywords = keywords.filter((kw) => kw.toLowerCase().includes(searchLower));
          const inKeywords = matchedKeywords.length > 0;

          if (inTitle || inContent || inKeywords) {
            // Extract content snippet around the match
            let contentSnippet: string | undefined;
            if (inContent) {
              const index = content.toLowerCase().indexOf(searchLower);
              const start = Math.max(0, index - 50);
              const end = Math.min(content.length, index + searchLower.length + 50);
              contentSnippet = (start > 0 ? '...' : '') +
                content.slice(start, end).replace(/\n/g, ' ') +
                (end < content.length ? '...' : '');
            }

            searchMatches.set(topic.id, {
              inTitle,
              inContent,
              inKeywords,
              matchedKeywords,
              contentSnippet,
            });
            return true;
          }
          return false;
        });
      }

      // Transform to locale-specific format
      const localized = topics.map((topic) => {
        const titleKey = `title${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof typeof topic;
        const contentKey = `content${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof typeof topic;

        const result: any = {
          id: topic.id,
          slug: topic.slug,
          category: topic.category,
          title: topic[titleKey] as string,
          content: topic[contentKey] as string,
          isFeatured: topic.isFeatured,
          order: topic.order,
        };

        // Add search match info if searching
        const match = searchMatches.get(topic.id);
        if (match) {
          result.searchMatch = match;
        }

        return result;
      });

      res.json(localized);
    } catch (error) {
      console.error('Error fetching help topics:', error);
      res.status(500).json({ error: 'Failed to fetch help topics' });
    }
  }

  /**
   * GET /api/help/topics/:slug
   * Get a specific help topic by slug
   */
  async getTopicBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const locale = (req.query.locale as Locale) || 'en';

      const topic = await prisma.helpTopic.findFirst({
        where: { slug, isPublished: true },
      });

      if (!topic) {
        return res.status(404).json({ error: 'Help topic not found' });
      }

      const titleKey = `title${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof typeof topic;
      const contentKey = `content${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof typeof topic;

      const localized = {
        id: topic.id,
        slug: topic.slug,
        category: topic.category,
        title: topic[titleKey] as string,
        content: topic[contentKey] as string,
        isFeatured: topic.isFeatured,
        order: topic.order,
      };

      return res.json(localized);
    } catch (error) {
      console.error('Error fetching help topic:', error);
      return res.status(500).json({ error: 'Failed to fetch help topic' });
    }
  }

  /**
   * GET /api/help/categories
   * Get list of all categories with topic counts
   */
  async getCategories(_req: Request, res: Response) {
    try {
      const topics = await prisma.helpTopic.findMany({
        where: { isPublished: true },
        select: { category: true },
      });

      const categoryCounts = topics.reduce((acc, topic) => {
        acc[topic.category] = (acc[topic.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.json(categoryCounts);
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  }
}

export const helpController = new HelpController();
