'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { KSeFContractor, CreateKSeFContractorPayload } from '../../lib/api/ksef';
import { useLocale } from '@/contexts/LocaleContext';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = { en: enTranslations, pl: plTranslations, ru: ruTranslations };

interface PartyFields {
  name: string;
  nip: string;
  street: string;
  city: string;
  zip: string;
  country: string;
}

interface PartyComboSelectProps {
  value: PartyFields;
  onChange: (party: PartyFields) => void;
  contractors: KSeFContractor[];
  isLoading: boolean;
  onCreateNew: (data: CreateKSeFContractorPayload) => Promise<KSeFContractor>;
  onUpdateContractor?: (id: string, data: CreateKSeFContractorPayload) => Promise<KSeFContractor>;
  onDeleteContractor?: (id: string) => void;
  isCreating: boolean;
  isUpdating?: boolean;
  label: string;
  nameError?: boolean;
  nipError?: boolean;
}

type EditForm = {
  name: string;
  nip: string;
  street: string;
  city: string;
  zip: string;
  country: string;
};

type NewForm = EditForm;

export function PartyComboSelect({
  value,
  onChange,
  contractors,
  isLoading,
  onCreateNew,
  onUpdateContractor,
  onDeleteContractor,
  isCreating,
  isUpdating,
  label,
  nameError,
}: PartyComboSelectProps) {
  const { locale } = useLocale();
  const t = translations[locale].ksef;
  const tc = t.contractors;

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value.name);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newForm, setNewForm] = useState<NewForm>({ name: '', nip: '', street: '', city: '', zip: '', country: 'PL' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: '', nip: '', street: '', city: '', zip: '', country: 'PL' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setInputValue(value.name); }, [value.name]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowCreateForm(false);
        setEditingId(null);
        setConfirmDeleteId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = contractors.filter(
    (c) =>
      !inputValue ||
      c.name.toLowerCase().includes(inputValue.toLowerCase()) ||
      (c.nip && c.nip.includes(inputValue))
  );

  const company = filtered.filter((c) => c.source === 'company');
  const wfirma  = filtered.filter((c) => c.source === 'wfirma');
  const local   = filtered.filter((c) => c.source === 'local');

  const hasExactMatch = filtered.some(
    (c) => c.name.toLowerCase() === inputValue.toLowerCase()
  );

  const selectContractor = (c: KSeFContractor) => {
    onChange({ name: c.name, nip: c.nip ?? '', street: c.street ?? '', city: c.city ?? '', zip: c.zip ?? '', country: c.country ?? 'PL' });
    setInputValue(c.name);
    setIsOpen(false);
    setShowCreateForm(false);
    setEditingId(null);
    setConfirmDeleteId(null);
  };

  const openCreateForm = () => {
    setNewForm({ name: inputValue.trim(), nip: '', street: '', city: '', zip: '', country: 'PL' });
    setShowCreateForm(true);
    setIsOpen(false);
    setEditingId(null);
  };

  const handleSaveNew = async () => {
    if (!newForm.name.trim()) return;
    const created = await onCreateNew(toPayload(newForm));
    selectContractor(created);
  };

  const startEdit = (e: React.MouseEvent, c: KSeFContractor) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditForm({ name: c.name, nip: c.nip ?? '', street: c.street ?? '', city: c.city ?? '', zip: c.zip ?? '', country: c.country ?? 'PL' });
    setConfirmDeleteId(null);
  };

  const handleSaveEdit = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!onUpdateContractor || !editForm.name.trim()) return;
    const updated = await onUpdateContractor(id, toPayload(editForm));
    selectContractor(updated);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirmDeleteId === id) {
      onDeleteContractor?.(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setEditingId(null);
    }
  };

  const toPayload = (f: EditForm): CreateKSeFContractorPayload => ({
    name: f.name.trim(),
    nip: f.nip.trim() || undefined,
    street: f.street.trim() || undefined,
    city: f.city.trim() || undefined,
    zip: f.zip.trim() || undefined,
    country: f.country || 'PL',
  });

  const mainInputCls = `w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    nameError ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
  }`;

  const smallInputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500';

  const GroupLabel = ({ label: l }: { label: string }) => (
    <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-900 font-semibold uppercase tracking-wide">
      {l}
    </div>
  );

  return (
    <div ref={wrapperRef} className="relative">
      {/* Main search input */}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => { setInputValue(e.target.value); setIsOpen(true); setShowCreateForm(false); }}
        onFocus={() => { if (!showCreateForm && !editingId) setIsOpen(true); }}
        onKeyDown={(e) => { if (e.key === 'Escape') { setIsOpen(false); setShowCreateForm(false); setEditingId(null); } }}
        placeholder={label}
        className={mainInputCls}
      />

      {/* Dropdown list */}
      {isOpen && !showCreateForm && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-64 overflow-y-auto">
          <div>
            {isLoading && <div className="px-3 py-2 text-gray-400 text-sm">{tc.loading}</div>}

            {company.length > 0 && (
              <>
                <GroupLabel label={tc.myCompany} />
                {company.map((c) => (
                  <ContractorRow key={c.id} contractor={c} onSelect={selectContractor} />
                ))}
              </>
            )}

            {wfirma.length > 0 && (
              <>
                <GroupLabel label={tc.wfirma} />
                {wfirma.map((c) => (
                  <ContractorRow key={c.id} contractor={c} onSelect={selectContractor} />
                ))}
              </>
            )}

            {local.length > 0 && (
              <>
                <GroupLabel label={tc.savedLocal} />
                {local.map((c) => (
                  <div key={c.id}>
                    {editingId === c.id ? (
                      /* Inline edit form for this contractor */
                      <div className="px-3 py-2 bg-blue-50 dark:bg-gray-750 border-b border-gray-100 dark:border-gray-700">
                        <div className="space-y-1.5">
                          <EditField label={tc.fieldName} value={editForm.name} onChange={(v) => setEditForm(f => ({ ...f, name: v }))} placeholder={tc.fieldNamePlaceholder} autoFocus smallInputCls={smallInputCls} />
                          <EditField label={tc.fieldNip} value={editForm.nip} onChange={(v) => setEditForm(f => ({ ...f, nip: v }))} placeholder="1234567890" smallInputCls={smallInputCls} />
                          <EditField label={tc.fieldStreet} value={editForm.street} onChange={(v) => setEditForm(f => ({ ...f, street: v }))} placeholder="ul. Przykładowa 1" smallInputCls={smallInputCls} />
                          <div className="flex gap-1.5">
                            <div className="w-24 shrink-0">
                              <EditField label={tc.fieldZip} value={editForm.zip} onChange={(v) => setEditForm(f => ({ ...f, zip: v }))} placeholder="00-000" smallInputCls={smallInputCls} />
                            </div>
                            <div className="flex-1">
                              <EditField label={tc.fieldCity} value={editForm.city} onChange={(v) => setEditForm(f => ({ ...f, city: v }))} placeholder="Warszawa" smallInputCls={smallInputCls} />
                            </div>
                          </div>
                          <div className="flex gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={(e) => handleSaveEdit(e, c.id)}
                              disabled={isUpdating || !editForm.name.trim()}
                              className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs rounded"
                            >
                              <Check className="w-3 h-3" /> {isUpdating ? tc.saving : tc.save}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                              className="flex items-center gap-1 px-2.5 py-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 text-gray-700 dark:text-gray-200 text-xs rounded"
                            >
                              <X className="w-3 h-3" /> {tc.deleteCancel}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : confirmDeleteId === c.id ? (
                      /* Delete confirm */
                      <div className="flex items-center justify-between px-3 py-2 bg-red-50 dark:bg-red-900/20 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-xs text-red-700 dark:text-red-400">{tc.deleteConfirmName.replace('{name}', c.name)}</span>
                        <div className="flex gap-1 ml-2">
                          <button type="button" onClick={(e) => handleDeleteClick(e, c.id)} className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded">{tc.yes}</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }} className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded">{tc.no}</button>
                        </div>
                      </div>
                    ) : (
                      /* Normal local row with edit/delete buttons */
                      <div className="flex items-center border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <button
                          type="button"
                          onClick={() => selectContractor(c)}
                          className="flex-1 text-left px-3 py-2 flex flex-col gap-0.5 min-w-0"
                        >
                          <span className="text-gray-900 dark:text-white text-sm truncate">{c.name}</span>
                          {c.nip && <span className="text-gray-500 dark:text-gray-400 text-xs font-mono">{c.nip}</span>}
                        </button>
                        <div className="flex items-center gap-0.5 pr-2 shrink-0">
                          {onUpdateContractor && (
                            <button
                              type="button"
                              onClick={(e) => startEdit(e, c)}
                              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                              title={tc.edit}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onDeleteContractor && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteClick(e, c.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                              title={tc.delete}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {inputValue.trim() && !hasExactMatch && (
              <button
                type="button"
                onClick={openCreateForm}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700"
              >
                {tc.addNew.replace('{name}', inputValue.trim())}
              </button>
            )}

            {!isLoading && filtered.length === 0 && !inputValue.trim() && (
              <div className="px-3 py-2 text-gray-400 text-sm">{tc.noContractorsHint}</div>
            )}
          </div>
        </div>
      )}

      {/* Create form — below input, not in dropdown */}
      {showCreateForm && (
        <div className="mt-2 border border-blue-300 dark:border-blue-600 rounded-md bg-blue-50 dark:bg-gray-800 p-3 space-y-2">
          <div className="text-xs font-semibold text-blue-700 dark:text-blue-400">{tc.newContractor}</div>
          <EditField label={tc.fieldName} value={newForm.name} onChange={(v) => setNewForm(f => ({ ...f, name: v }))} placeholder={tc.fieldNamePlaceholder} autoFocus smallInputCls={smallInputCls} />
          <EditField label={tc.fieldNip} value={newForm.nip} onChange={(v) => setNewForm(f => ({ ...f, nip: v }))} placeholder="np. 1234567890" smallInputCls={smallInputCls} />
          <EditField label={tc.fieldStreet} value={newForm.street} onChange={(v) => setNewForm(f => ({ ...f, street: v }))} placeholder="ul. Przykładowa 1" smallInputCls={smallInputCls} />
          <div className="flex gap-2">
            <div className="w-28 shrink-0">
              <EditField label={tc.fieldZip} value={newForm.zip} onChange={(v) => setNewForm(f => ({ ...f, zip: v }))} placeholder="00-000" smallInputCls={smallInputCls} />
            </div>
            <div className="flex-1">
              <EditField label={tc.fieldCity} value={newForm.city} onChange={(v) => setNewForm(f => ({ ...f, city: v }))} placeholder="Warszawa" smallInputCls={smallInputCls} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleSaveNew}
              disabled={isCreating || !newForm.name.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded font-medium"
            >
              <Check className="w-3.5 h-3.5" />
              {isCreating ? tc.saving : tc.save}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreateForm(false); setIsOpen(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-sm rounded"
            >
              <X className="w-3.5 h-3.5" />
              {tc.deleteCancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ContractorRow({ contractor: c, onSelect }: { contractor: KSeFContractor; onSelect: (c: KSeFContractor) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(c)}
      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex flex-col gap-0.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0"
    >
      <span className="text-gray-900 dark:text-white text-sm">{c.name}</span>
      {c.nip && <span className="text-gray-500 dark:text-gray-400 text-xs font-mono">{c.nip}</span>}
    </button>
  );
}

function EditField({ label, value, onChange, placeholder, autoFocus, smallInputCls }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean; smallInputCls: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={smallInputCls} autoFocus={autoFocus} />
    </div>
  );
}
