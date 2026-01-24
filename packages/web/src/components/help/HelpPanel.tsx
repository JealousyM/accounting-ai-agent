/**
 * Help Panel Component
 * Main help interface with search, categories, and topics
 */

'use client';

import { useState, useEffect } from 'react';
import { useLocale } from '@/contexts/LocaleContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api/api-client';
import type { HelpTopic } from './types';

export interface HelpPanelTranslations {
  title: string;
  searchPlaceholder: string;
  loading: string;
  noResults: string;
  noTopics: string;
  tryDifferent: string;
  categories: {
    gettingStarted: string;
    aiChat: string;
    invoices: string;
    contractors: string;
    taxes: string;
    wfirma: string;
    settings: string;
    faq: string;
  };
  searchMatch: {
    inTitle: string;
    inContent: string;
    keywords: string;
  };
}

interface HelpPanelProps {
  open: boolean;
  onClose: () => void;
  initialCategory?: string;
  translations: HelpPanelTranslations;
}

export function HelpPanel({ open, onClose, initialCategory, translations }: HelpPanelProps) {
  const { locale } = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategory || 'gettingStarted'
  );
  const [topics, setTopics] = useState<HelpTopic[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch topics when category or search changes
  useEffect(() => {
    if (!open) return;

    const fetchTopics = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          locale,
          category: selectedCategory,
          ...(searchQuery && { search: searchQuery }),
        });

        const response = await apiClient.get<HelpTopic[]>(`/api/help/topics?${params}`);
        setTopics(Array.isArray(response) ? response : []);
      } catch (error) {
        console.error('Failed to fetch help topics:', error);
        setTopics([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, [open, selectedCategory, searchQuery, locale]);

  const categories = [
    { id: 'gettingStarted', label: translations.categories.gettingStarted },
    { id: 'aiChat', label: translations.categories.aiChat },
    { id: 'invoices', label: translations.categories.invoices },
    { id: 'contractors', label: translations.categories.contractors },
    { id: 'taxes', label: translations.categories.taxes },
    { id: 'wfirma', label: translations.categories.wfirma },
    { id: 'settings', label: translations.categories.settings },
    { id: 'faq', label: translations.categories.faq },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl">{translations.title}</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder={translations.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className="text-sm px-4 py-2"
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Topics Content */}
        <div className="flex-1 overflow-y-auto pr-4 -mr-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                <p>{translations.loading}</p>
              </div>
            </div>
          ) : topics.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center text-muted-foreground">
                <p className="text-lg">{searchQuery ? translations.noResults : translations.noTopics}</p>
                <p className="text-sm mt-2">{translations.tryDifferent}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className="border rounded-xl p-6 bg-card shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Search Match Indicators */}
                  {topic.searchMatch && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {topic.searchMatch.inTitle && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          {translations.searchMatch.inTitle}
                        </span>
                      )}
                      {topic.searchMatch.inContent && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {translations.searchMatch.inContent}
                        </span>
                      )}
                      {topic.searchMatch.inKeywords && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          {translations.searchMatch.keywords}: {topic.searchMatch.matchedKeywords.join(', ')}
                        </span>
                      )}
                    </div>
                  )}

                  <h3 className="font-semibold mb-4 text-xl text-foreground">
                    {topic.title}
                  </h3>

                  {/* Content Snippet for search results */}
                  {topic.searchMatch?.contentSnippet && (
                    <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 italic">
                        &quot;{topic.searchMatch.contentSnippet}&quot;
                      </p>
                    </div>
                  )}

                  <div
                    className="prose prose-sm max-w-none dark:prose-invert text-muted-foreground leading-relaxed"
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {topic.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
