'use client';

import React, { useState, useEffect } from 'react';
import { Pin, PinOff, Eye, EyeOff, Trash2, X, Brain, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAIMemory } from '@/hooks/useAIMemory';
import { AIMemoryCategory } from '@/lib/api/ai-memory';

interface AIMemoryPanelTranslations {
  title: string;
  description: string;
  empty: string;
  emptyHint: string;
  categories: {
    all: string;
    user_preference: string;
    business_fact: string;
    frequent_entity: string;
    workflow_pattern: string;
  };
  actions: {
    pin: string;
    unpin: string;
    hide: string;
    show: string;
    delete: string;
    clearAll: string;
    clearCategory: string;
    confirmClear: string;
    cancel: string;
  };
  confidence: string;
  source: {
    explicit: string;
    implicit: string;
    tool_usage: string;
  };
  stats: {
    total: string;
    pinned: string;
    hidden: string;
  };
}

interface AIMemoryPanelProps {
  open: boolean;
  onClose: () => void;
  translations: AIMemoryPanelTranslations;
}

const CATEGORY_TABS: Array<{ key: AIMemoryCategory | 'all'; icon: string }> = [
  { key: 'all', icon: '📋' },
  { key: 'business_fact', icon: '🏢' },
  { key: 'frequent_entity', icon: '👥' },
  { key: 'user_preference', icon: '⚙️' },
  { key: 'workflow_pattern', icon: '🔄' },
];

export function AIMemoryPanel({ open, onClose, translations: t }: AIMemoryPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<AIMemoryCategory | 'all'>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const category = selectedCategory === 'all' ? undefined : selectedCategory;
  const { memories, summary, isLoading, pinMemory, hideMemory, removeMemory, clearAll, refetch } = useAIMemory(category);

  // Refetch when panel opens or category changes
  useEffect(() => {
    if (open) refetch();
  }, [open, selectedCategory, refetch]);

  if (!open) return null;

  const handleClear = () => {
    clearAll(category);
    setShowClearConfirm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl h-[70vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-purple-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t.title}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t.description}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="px-6 py-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
          <span>{t.stats.total}: {summary?.total ?? 0}</span>
          <span>{t.stats.pinned}: {summary?.pinned ?? 0}</span>
          <span>{t.stats.hidden}: {summary?.hidden ?? 0}</span>
        </div>

        {/* Category Tabs */}
        <div className="px-6 py-3 flex gap-2 overflow-x-auto border-b border-gray-100 dark:border-gray-700">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedCategory(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === tab.key
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              {tab.icon} {t.categories[tab.key === 'all' ? 'all' : tab.key]}
            </button>
          ))}
        </div>

        {/* Memory List */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500" />
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center py-12">
              <Brain className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">{t.empty}</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t.emptyHint}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {memories.map(memory => (
                <div
                  key={memory.id}
                  className={`group p-3 rounded-lg border transition-colors ${
                    memory.isPinned
                      ? 'border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-900/20'
                      : 'border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-750/50'
                  } ${memory.isHidden ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-gray-100 break-words">
                        {memory.value}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                          {t.source[memory.source]}
                        </span>
                        <span className="text-xs text-gray-400">
                          {t.confidence}: {Math.round(memory.confidence * 100)}%
                        </span>
                        {memory.isPinned && (
                          <Pin className="w-3 h-3 text-purple-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => pinMemory(memory.id, !memory.isPinned)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500"
                        title={memory.isPinned ? t.actions.unpin : t.actions.pin}
                      >
                        {memory.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => hideMemory(memory.id)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500"
                        title={memory.isHidden ? t.actions.show : t.actions.hide}
                      >
                        {memory.isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => removeMemory(memory.id)}
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600"
                        title={t.actions.delete}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {memories.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            {showClearConfirm ? (
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{t.actions.confirmClear}</span>
                <div className="flex gap-2 ml-auto">
                  <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(false)}>
                    {t.actions.cancel}
                  </Button>
                  <Button variant="default" size="sm" onClick={handleClear} className="bg-red-600 hover:bg-red-700 text-white">
                    {selectedCategory === 'all' ? t.actions.clearAll : t.actions.clearCategory}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {selectedCategory === 'all' ? t.actions.clearAll : t.actions.clearCategory}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
