'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2, BookmarkCheck, Pencil, Check, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePromptShortcuts } from '@/hooks/usePromptShortcuts';

export interface PromptShortcutsPanelTranslations {
  title: string;
  description: string;
  empty: string;
  emptyHint: string;
  addButton: string;
  labelPlaceholder: string;
  promptPlaceholder: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  limitReached: string;
  limitHint: string;
  clickToUse: string;
  orgSection: string;
  personalSection: string;
  orgReadOnly: string;
}

interface PromptShortcutsPanelProps {
  open: boolean;
  onClose: () => void;
  onSelect: (prompt: string) => void;
  translations: PromptShortcutsPanelTranslations;
}

interface EditState {
  id: string;
  label: string;
  prompt: string;
  source: 'personal' | 'org';
}

export function PromptShortcutsPanel({ open, onClose, onSelect, translations: t }: PromptShortcutsPanelProps) {
  const {
    shortcuts,
    isLoading,
    isAtLimit,
    isOrgAdmin,
    addShortcut,
    editShortcut,
    removeShortcut,
    editOrgShortcut,
    removeOrgShortcut,
    isAdding,
  } = usePromptShortcuts();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [editState, setEditState] = useState<EditState | null>(null);

  if (!open) return null;

  const orgShortcuts = shortcuts.filter((s) => s.source === 'org');
  const personalShortcuts = shortcuts.filter((s) => s.source === 'personal');

  const handleAdd = async () => {
    if (!newLabel.trim() || !newPrompt.trim()) return;
    await addShortcut(newLabel.trim(), newPrompt.trim());
    setNewLabel('');
    setNewPrompt('');
    setShowAddForm(false);
  };

  const handleSaveEdit = () => {
    if (!editState || !editState.label.trim() || !editState.prompt.trim()) return;
    if (editState.source === 'org') {
      editOrgShortcut(editState.id, editState.label.trim(), editState.prompt.trim());
    } else {
      editShortcut(editState.id, editState.label.trim(), editState.prompt.trim());
    }
    setEditState(null);
  };

  const handleSelect = (prompt: string) => {
    onSelect(prompt);
    onClose();
  };

  const renderEditForm = (id: string) =>
    editState?.id === id ? (
      <div className="p-3 rounded-lg border border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/20">
        <input
          className="w-full text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 mb-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={editState.label}
          onChange={(e) => setEditState({ ...editState, label: e.target.value })}
          maxLength={100}
        />
        <textarea
          className="w-full text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 mb-2 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={editState.prompt}
          onChange={(e) => setEditState({ ...editState, prompt: e.target.value })}
          rows={3}
          maxLength={2000}
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setEditState(null)}>
            {t.cancel}
          </Button>
          <Button size="sm" onClick={handleSaveEdit} disabled={!editState.label.trim() || !editState.prompt.trim()}>
            <Check className="w-3.5 h-3.5 mr-1" />
            {t.save}
          </Button>
        </div>
      </div>
    ) : null;

  const renderShortcutRow = (
    shortcut: { id: string; label: string; prompt: string },
    source: 'personal' | 'org',
    canEdit: boolean
  ) => {
    if (editState?.id === shortcut.id) {
      return renderEditForm(shortcut.id);
    }
    return (
      <div
        key={shortcut.id}
        className="group p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750/50 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors cursor-pointer"
        onClick={() => handleSelect(shortcut.prompt)}
        title={t.clickToUse}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {source === 'org' && <Building2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {shortcut.label}
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 break-words">
              {shortcut.prompt}
            </p>
          </div>
          {canEdit && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditState({ id: shortcut.id, label: shortcut.label, prompt: shortcut.prompt, source });
                }}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500"
                title={t.edit}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  source === 'org' ? removeOrgShortcut(shortcut.id) : removeShortcut(shortcut.id);
                }}
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600"
                title={t.delete}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {!canEdit && source === 'org' && (
            <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 opacity-0 group-hover:opacity-100">
              {t.orgReadOnly}
            </span>
          )}
        </div>
      </div>
    );
  };

  const isEmpty = orgShortcuts.length === 0 && personalShortcuts.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg h-[70vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <BookmarkCheck className="w-5 h-5 text-blue-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t.title}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t.description}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Shortcut list */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
            </div>
          ) : isEmpty && !showAddForm ? (
            <div className="text-center py-12">
              <BookmarkCheck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">{t.empty}</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">{t.emptyHint}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Org shortcuts section */}
              {orgShortcuts.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    {t.orgSection}
                  </p>
                  <div className="space-y-2">
                    {orgShortcuts.map((s) => (
                      <React.Fragment key={s.id}>
                        {renderShortcutRow(s, 'org', isOrgAdmin)}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Personal shortcuts section */}
              {(personalShortcuts.length > 0 || showAddForm) && (
                <div>
                  {orgShortcuts.length > 0 && (
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      {t.personalSection}
                    </p>
                  )}
                  <div className="space-y-2">
                    {personalShortcuts.map((s) => (
                      <React.Fragment key={s.id}>
                        {renderShortcutRow(s, 'personal', true)}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Add form */}
              {showAddForm && (
                <div className="mt-2 p-3 rounded-lg border border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/20">
                  <input
                    className="w-full text-sm font-medium bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 mb-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={t.labelPlaceholder}
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    maxLength={100}
                    autoFocus
                  />
                  <textarea
                    className="w-full text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 mb-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={t.promptPlaceholder}
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                    rows={3}
                    maxLength={2000}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowAddForm(false); setNewLabel(''); setNewPrompt(''); }}
                    >
                      {t.cancel}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAdd}
                      disabled={!newLabel.trim() || !newPrompt.trim() || isAdding}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      {t.save}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
          {isAtLimit ? (
            <div className="text-center">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">{t.limitReached}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.limitHint}</p>
            </div>
          ) : (
            !showAddForm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddForm(true)}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 w-full"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t.addButton}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
