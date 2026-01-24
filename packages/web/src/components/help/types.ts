/**
 * Help System Types
 * TypeScript interfaces for help topics and categories
 */

export interface SearchMatch {
  inTitle: boolean;
  inContent: boolean;
  inKeywords: boolean;
  matchedKeywords: string[];
  contentSnippet?: string;
}

export interface HelpTopic {
  id: string;
  slug: string;
  category: string;
  title: string;
  content: string;
  isFeatured: boolean;
  order: number;
  searchMatch?: SearchMatch;
}

export interface HelpCategory {
  id: string;
  label: string;
  count: number;
}
