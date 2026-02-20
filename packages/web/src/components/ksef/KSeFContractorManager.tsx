'use client';

import React, { useState } from 'react';
import { Trash2, Lock, RefreshCw, Pencil, Check, X, Plus } from 'lucide-react';
import { useKSeFContractors } from '../../hooks/useKSeF';
import { KSeFContractor, CreateKSeFContractorPayload } from '../../lib/api/ksef';
import { useLocale } from '@/contexts/LocaleContext';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = { en: enTranslations, pl: plTranslations, ru: ruTranslations };

type ContractorsTranslations = (typeof enTranslations)['ksef']['contractors'];

type EditForm = {
  name: string;
  nip: string;
  street: string;
  city: string;
  zip: string;
  country: string;
};

const emptyForm = (): EditForm => ({
  name: '',
  nip: '',
  street: '',
  city: '',
  zip: '',
  country: 'PL',
});

const fieldCls =
  'w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500';

function ContractorForm({
  form,
  onChange,
  onSave,
  onCancel,
  isSaving,
  saveLabel,
  tc,
}: {
  form: EditForm;
  onChange: (f: EditForm) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
  saveLabel?: string;
  tc: ContractorsTranslations;
}) {
  return (
    <div className="border border-blue-300 dark:border-blue-600 rounded-md bg-blue-50 dark:bg-gray-750 p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">{tc.fieldName}</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            placeholder={tc.fieldNamePlaceholder}
            className={fieldCls}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">{tc.fieldNip}</label>
          <input
            type="text"
            value={form.nip}
            onChange={(e) => onChange({ ...form, nip: e.target.value })}
            placeholder="1234567890"
            className={fieldCls}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">{tc.fieldCountry}</label>
          <input
            type="text"
            value={form.country}
            onChange={(e) => onChange({ ...form, country: e.target.value })}
            placeholder="PL"
            maxLength={2}
            className={fieldCls}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">{tc.fieldStreet}</label>
          <input
            type="text"
            value={form.street}
            onChange={(e) => onChange({ ...form, street: e.target.value })}
            placeholder="ul. Przykładowa 1"
            className={fieldCls}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">{tc.fieldZip}</label>
          <input
            type="text"
            value={form.zip}
            onChange={(e) => onChange({ ...form, zip: e.target.value })}
            placeholder="00-000"
            className={fieldCls}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-0.5">{tc.fieldCity}</label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => onChange({ ...form, city: e.target.value })}
            placeholder="Warszawa"
            className={fieldCls}
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving || !form.name.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded font-medium"
        >
          <Check className="w-3.5 h-3.5" />
          {isSaving ? tc.saving : (saveLabel || tc.save)}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-sm rounded"
        >
          <X className="w-3.5 h-3.5" />
          {tc.deleteCancel}
        </button>
      </div>
    </div>
  );
}

export function KSeFContractorManager() {
  const {
    contractors,
    isLoading,
    createContractor,
    isCreating,
    updateContractor,
    isUpdating,
    deleteContractor,
    isDeleting,
    syncContractors,
    isSyncing,
  } = useKSeFContractors();

  const { locale } = useLocale();
  const t = translations[locale].ksef;
  const tc = t.contractors;

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyForm());
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<EditForm>(emptyForm());

  const startEdit = (c: KSeFContractor) => {
    setEditingId(c.id);
    setEditForm({
      name: c.name,
      nip: c.nip ?? '',
      street: c.street ?? '',
      city: c.city ?? '',
      zip: c.zip ?? '',
      country: c.country ?? 'PL',
    });
    setConfirmDeleteId(null);
    setShowAddForm(false);
  };

  const handleSaveEdit = async (id: string) => {
    await updateContractor({
      id,
      data: toPayload(editForm),
    });
    setEditingId(null);
  };

  const handleSaveAdd = async () => {
    await createContractor(toPayload(addForm));
    setAddForm(emptyForm());
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirmDeleteId === id) {
      deleteContractor(id);
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

  const localCount = contractors.filter((c) => c.source === 'local').length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{tc.title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowAddForm(true); setEditingId(null); setConfirmDeleteId(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded"
          >
            <Plus className="w-4 h-4" />
            {tc.addLocal}
          </button>
          <button
            onClick={() => syncContractors()}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm rounded"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? tc.syncing : tc.syncButton}
          </button>
        </div>
      </div>

      {/* Legend */}
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
        {tc.legendLine1}{' '}
        {tc.legendLine2.replace('{count}', String(localCount))}
      </p>

      {/* Add form */}
      {showAddForm && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">{tc.newLocalTitle}</div>
          <ContractorForm
            form={addForm}
            onChange={setAddForm}
            onSave={handleSaveAdd}
            onCancel={() => { setShowAddForm(false); setAddForm(emptyForm()); }}
            isSaving={isCreating}
            saveLabel={tc.add}
            tc={tc}
          />
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm">{tc.loading}</div>
      ) : contractors.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400 text-sm">
          {tc.empty}
        </div>
      ) : (
        <div className="space-y-1">
          {contractors.map((c) => (
            <div key={c.id}>
              {/* Row */}
              <div
                className={`flex items-center justify-between py-2 px-3 rounded ${
                  editingId === c.id
                    ? 'bg-blue-50 dark:bg-gray-700 rounded-b-none'
                    : 'bg-gray-50 dark:bg-gray-700'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-900 dark:text-white text-sm font-medium truncate">
                      {c.name}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                        c.source === 'company'
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
                          : c.source === 'wfirma'
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300'
                            : 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300'
                      }`}
                    >
                      {c.source === 'company' ? tc.myCompany : c.source === 'wfirma' ? tc.wfirma : tc.local}
                    </span>
                  </div>
                  {c.nip && (
                    <div className="text-gray-500 dark:text-gray-400 text-xs font-mono mt-0.5">
                      NIP: {c.nip}
                    </div>
                  )}
                  {(c.street || c.city) && (
                    <div className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                      {[c.street, c.zip, c.city].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 ml-2 shrink-0">
                  {c.source === 'local' ? (
                    <>
                      {editingId !== c.id && (
                        <button
                          onClick={() => startEdit(c)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded"
                          title={tc.edit}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {confirmDeleteId === c.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(c.id)}
                            disabled={isDeleting}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                          >
                            {tc.deleteConfirm}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 text-gray-800 dark:text-white text-xs rounded"
                          >
                            {tc.deleteCancel}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded"
                          title={tc.delete}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  ) : (
                    <span title={tc.editInWfirma}>
                      <Lock className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                    </span>
                  )}
                </div>
              </div>

              {/* Inline edit form */}
              {editingId === c.id && (
                <div className="mb-1">
                  <ContractorForm
                    form={editForm}
                    onChange={setEditForm}
                    onSave={() => handleSaveEdit(c.id)}
                    onCancel={() => setEditingId(null)}
                    isSaving={isUpdating}
                    tc={tc}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
