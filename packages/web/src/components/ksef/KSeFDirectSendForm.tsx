'use client';

import React, { useRef, useEffect } from 'react';
import { Plus, Trash2, X, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useKSeF } from '@/hooks/useKSeF';
import { useKSeFContractors } from '../../hooks/useKSeF';
import { KSeFSendResult } from '@/lib/api/ksef';
import { PartyComboSelect } from './PartyComboSelect';
import { useLocale } from '@/contexts/LocaleContext';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';
import { VAT_RATES, CURRENCIES, MAX_ZNAKOWY, MAX_ZNAKOWY_512, computeItem } from '@/lib/ksef-calculation';
import { useInvoiceLineItems } from '@/hooks/useInvoiceLineItems';
import { useKSeFSendForm } from '@/hooks/useKSeFSendForm';

export type { KSeFDirectSendFormInitialData } from '@/lib/ksef-calculation';

const translations = { en: enTranslations, pl: plTranslations, ru: ruTranslations };

// Base input classes
const inp   = 'w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500';
const inpSm = 'w-full border rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500';
const borderNormal = 'border-gray-300 dark:border-gray-600';
const borderError  = 'border-red-500 dark:border-red-400 focus:ring-red-400';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: (result: KSeFSendResult) => void;
  initialData?: import('@/lib/ksef-calculation').KSeFDirectSendFormInitialData;
}

export function KSeFDirectSendForm({ open, onClose, onSuccess, initialData }: Props) {
  const { config } = useKSeF();
  const { contractors, isLoading: contractorsLoading, createContractor, isCreating, updateContractor, isUpdating, deleteContractor } = useKSeFContractors();
  const { locale } = useLocale();
  const t = translations[locale].ksef;
  const td = t.directSend;

  const modalRef         = useRef<HTMLDivElement>(null);
  const invoiceNumberRef = useRef<HTMLInputElement>(null);
  const sellerNameRef    = useRef<HTMLInputElement>(null);
  const sellerNipRef     = useRef<HTMLInputElement>(null);
  const buyerNameRef     = useRef<HTMLInputElement>(null);
  const buyerNipRef      = useRef<HTMLInputElement>(null);
  const itemNameRefs     = useRef<(HTMLInputElement | null)[]>([]);

  const lineItems = useInvoiceLineItems();
  const form      = useKSeFSendForm({ config, open, initialData, onSuccess });

  // Sync initialData items into line items state when the modal opens
  useEffect(() => {
    if (open && initialData?.items?.length) {
      lineItems.setItems(initialData.items);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData]);

  if (!open) return null;

  const border = (key: string) => form.errorFields[key] ? borderError : borderNormal;

  // Map validation error codes to translated messages
  const translateError = (code: string, itemIndex?: number): string => {
    switch (code) {
      case 'errInvoiceNumberRequired': return td.errInvoiceNumberRequired;
      case 'errInvoiceNumberTooLong':  return td.errInvoiceNumberTooLong.replace('{n}', String(MAX_ZNAKOWY));
      case 'errSellerNameRequired':    return td.errSellerNameRequired;
      case 'errSellerNameTooLong':     return td.errSellerNameTooLong.replace('{n}', String(MAX_ZNAKOWY));
      case 'errSellerNipInvalid':      return td.errSellerNipInvalid;
      case 'errBuyerNameRequired':     return td.errBuyerNameRequired;
      case 'errBuyerNameTooLong':      return td.errBuyerNameTooLong.replace('{n}', String(MAX_ZNAKOWY));
      case 'errBuyerNipRequired':      return td.errBuyerNipRequired;
      case 'errNoItems':               return td.errNoItems;
      case 'errItemNameRequired':      return td.errItemNameRequired.replace('{n}', String((itemIndex ?? 0) + 1));
      case 'errItemNameTooLong':       return td.errItemNameTooLong.replace('{n}', String((itemIndex ?? 0) + 1)).replace('{max}', String(MAX_ZNAKOWY));
      case 'errItemQtyInvalid':        return td.errItemQtyInvalid.replace('{n}', String((itemIndex ?? 0) + 1));
      case 'errSendFailed':            return td.errSendFailed;
      default:                         return code;
    }
  };

  const scrollFocusField = (
    ref?: React.RefObject<HTMLInputElement | null> | HTMLInputElement | null,
  ) => {
    setTimeout(() => {
      const el = ref instanceof HTMLElement ? ref : ref?.current;
      if (el && modalRef.current) {
        const containerRect = modalRef.current.getBoundingClientRect();
        const elRect        = el.getBoundingClientRect();
        const scrollTo      = modalRef.current.scrollTop + elRect.top - containerRect.top - 80;
        modalRef.current.scrollTo({ top: Math.max(0, scrollTo), behavior: 'smooth' });
        el.focus();
      }
    }, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    form.clearErrors();

    const ve = form.validate(lineItems.items);
    if (ve) {
      const msg = translateError(ve.message, ve.itemIndex);
      form.setError(msg);
      form.setErrorFields(ve.fieldKey ? { [ve.fieldKey]: true } : {});
      if (ve.openSection === 'seller') form.setSellerOpen(true);
      if (ve.openSection === 'buyer')  form.setBuyerOpen(true);

      const refByKey: Record<string, React.RefObject<HTMLInputElement | null> | HTMLInputElement | null> = {
        invoiceNumber: invoiceNumberRef,
        sellerName:    sellerNameRef,
        sellerNip:     sellerNipRef,
        buyerName:     buyerNameRef,
        buyerNip:      buyerNipRef,
      };
      if (ve.itemIndex !== undefined) {
        refByKey[ve.fieldKey] = itemNameRefs.current[ve.itemIndex];
      }
      scrollFocusField(refByKey[ve.fieldKey]);
      return;
    }

    const ok = await form.submit(lineItems.computedItems, lineItems.totals);
    if (!ok) {
      // Translate generic send-failed code, leave API error messages as-is
      if (form.error === 'errSendFailed') form.setError(td.errSendFailed);
      modalRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleClose = () => {
    form.reset();
    lineItems.setItems([{ name: '', quantity: '1', unit: 'szt.', priceNet: '0', vatRate: '23' }]);
    onClose();
  };

  const { totals: { totalNet, totalVat, totalGross } } = lineItems;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-8"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {initialData ? td.titleCopy : td.title}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {initialData ? td.subtitleCopy : td.subtitle}
            </p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        {form.result ? (
          <div className="p-6 space-y-4">
            <div className={`rounded-lg p-4 ${form.result.success ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700'}`}>
              <p className={`font-medium ${form.result.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                {form.result.success ? td.successSent : td.errorSend}
              </p>
              {form.result.referenceNumber && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{t.reference}: <code className="font-mono">{form.result.referenceNumber}</code></p>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{form.result.message}</p>
            </div>
            <div className="flex justify-end"><Button onClick={handleClose}>{td.close}</Button></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Global error banner */}
            {form.error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-3 text-sm text-red-700 dark:text-red-300">
                {form.error}
              </div>
            )}

            {/* ── Invoice Details ─────────────────────────────── */}
            <section className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">{td.sectionDetails}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {td.labelInvoiceNumber} <span className="text-xs text-gray-400 font-normal">{td.labelInvoiceNumberHint.replace('{n}', String(MAX_ZNAKOWY))}</span>
                  </label>
                  <input
                    ref={invoiceNumberRef}
                    type="text"
                    value={form.invoiceNumber}
                    onChange={e => { form.setInvoiceNumber(e.target.value); form.setErrorFields(f => ({ ...f, invoiceNumber: false })); }}
                    placeholder={td.placeholderInvoiceNumber}
                    maxLength={MAX_ZNAKOWY}
                    className={`${inp} ${border('invoiceNumber')}`}
                    required
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelCurrency}</label>
                  <select value={form.currency} onChange={e => form.setCurrency(e.target.value)} className={`${inp} ${borderNormal}`}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelIssueDate}</label>
                  <input type="date" value={form.issueDate} onChange={e => form.setIssueDate(e.target.value)} className={`${inp} ${borderNormal}`} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelSellDate}</label>
                  <input type="date" value={form.sellDate} onChange={e => form.setSellDate(e.target.value)} className={`${inp} ${borderNormal}`} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelDueDate}</label>
                  <input type="date" value={form.dueDate} onChange={e => form.setDueDate(e.target.value)} className={`${inp} ${borderNormal}`} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelPaymentMethod}</label>
                  <select value={form.paymentMethod} onChange={e => form.setPaymentMethod(e.target.value)} className={`${inp} ${borderNormal}`}>
                    <option value="transfer">{td.paymentTransfer}</option>
                    <option value="cash">{td.paymentCash}</option>
                    <option value="card">{td.paymentCard}</option>
                  </select>
                </div>
                {form.paymentMethod === 'transfer' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelPaymentAccount}</label>
                    <input type="text" value={form.paymentAccount} onChange={e => form.setPaymentAccount(e.target.value)} placeholder="PL00 0000 0000 0000 0000 0000 0000" maxLength={MAX_ZNAKOWY} className={`${inp} ${borderNormal}`} />
                  </div>
                )}
              </div>
            </section>

            {/* ── Seller ─────────────────────────────────────── */}
            <section className="border dark:border-gray-700 rounded-lg">
              <button type="button" onClick={() => form.setSellerOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-t-lg">
                <span className="flex items-center gap-2">
                  {td.sectionSeller}
                  {(form.errorFields['sellerName'] || form.errorFields['sellerNip']) && (
                    <span className="text-xs text-red-500 font-normal">{td.errorFillRequired}</span>
                  )}
                </span>
                {form.sellerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {form.sellerOpen && (
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {td.labelCompanyName} <span className="text-xs text-gray-400 font-normal">{td.labelInvoiceNumberHint.replace('{n}', String(MAX_ZNAKOWY))}</span>
                    </label>
                    <PartyComboSelect
                      label={t.contractors.selectSeller}
                      value={{ name: form.sellerName, nip: form.sellerNip, street: form.sellerAddress.street, city: form.sellerAddress.city, zip: form.sellerAddress.zip, country: form.sellerAddress.country }}
                      onChange={(party) => {
                        form.setSellerName(party.name);
                        form.setSellerNip(party.nip);
                        form.setSellerAddress({ street: party.street, city: party.city, zip: party.zip, country: party.country });
                        form.setErrorFields(f => ({ ...f, sellerName: false, sellerNip: false }));
                      }}
                      contractors={contractors}
                      isLoading={contractorsLoading}
                      onCreateNew={(data) => createContractor(data)}
                      onUpdateContractor={(id, data) => updateContractor({ id, data })}
                      onDeleteContractor={(id) => deleteContractor(id)}
                      isCreating={isCreating}
                      isUpdating={isUpdating}
                      nameError={form.errorFields['sellerName']}
                      nipError={form.errorFields['sellerNip']}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelNip10}</label>
                    <input
                      ref={sellerNipRef}
                      type="text"
                      value={form.sellerNip}
                      onChange={e => { form.setSellerNip(e.target.value); form.setErrorFields(f => ({ ...f, sellerNip: false })); }}
                      placeholder="1234567890"
                      maxLength={13}
                      className={`${inp} font-mono ${border('sellerNip')}`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelCountry2}</label>
                    <input type="text" value={form.sellerAddress.country} onChange={e => form.setSellerAddress(a => ({ ...a, country: e.target.value.toUpperCase() }))} maxLength={2} minLength={2} className={`${inp} ${borderNormal}`} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelStreet} <span className="text-xs text-gray-400 font-normal">({td.labelInvoiceNumberHint.replace('{n}', String(MAX_ZNAKOWY_512)).replace('(', '').replace(')', '')})</span></label>
                    <input type="text" value={form.sellerAddress.street} onChange={e => form.setSellerAddress(a => ({ ...a, street: e.target.value }))} maxLength={MAX_ZNAKOWY_512} className={`${inp} ${borderNormal}`} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelCity} <span className="text-xs text-gray-400 font-normal">({td.labelInvoiceNumberHint.replace('{n}', String(MAX_ZNAKOWY_512)).replace('(', '').replace(')', '')})</span></label>
                    <input type="text" value={form.sellerAddress.city} onChange={e => form.setSellerAddress(a => ({ ...a, city: e.target.value }))} maxLength={MAX_ZNAKOWY_512} className={`${inp} ${borderNormal}`} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelZip}</label>
                    <input type="text" value={form.sellerAddress.zip} onChange={e => form.setSellerAddress(a => ({ ...a, zip: e.target.value }))} placeholder="00-001" maxLength={10} className={`${inp} ${borderNormal}`} />
                  </div>
                </div>
              )}
            </section>

            {/* ── Buyer ──────────────────────────────────────── */}
            <section className="border dark:border-gray-700 rounded-lg">
              <button type="button" onClick={() => form.setBuyerOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-t-lg">
                <span className="flex items-center gap-2">
                  {td.sectionBuyer}
                  {(form.errorFields['buyerName'] || form.errorFields['buyerNip']) && (
                    <span className="text-xs text-red-500 font-normal">{td.errorFillRequired}</span>
                  )}
                </span>
                {form.buyerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {form.buyerOpen && (
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {td.labelCompanyNameBuyer} <span className="text-xs text-gray-400 font-normal">{td.labelInvoiceNumberHint.replace('{n}', String(MAX_ZNAKOWY))}</span>
                    </label>
                    <PartyComboSelect
                      label={t.contractors.selectBuyer}
                      value={{ name: form.buyerName, nip: form.buyerNip, street: form.buyerAddress.street, city: form.buyerAddress.city, zip: form.buyerAddress.zip, country: form.buyerAddress.country }}
                      onChange={(party) => {
                        form.setBuyerName(party.name);
                        form.setBuyerNip(party.nip);
                        form.setBuyerAddress({ street: party.street, city: party.city, zip: party.zip, country: party.country });
                        form.setErrorFields(f => ({ ...f, buyerName: false, buyerNip: false }));
                      }}
                      contractors={contractors}
                      isLoading={contractorsLoading}
                      onCreateNew={(data) => createContractor(data)}
                      onUpdateContractor={(id, data) => updateContractor({ id, data })}
                      onDeleteContractor={(id) => deleteContractor(id)}
                      isCreating={isCreating}
                      isUpdating={isUpdating}
                      nameError={form.errorFields['buyerName']}
                      nipError={form.errorFields['buyerNip']}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelNip}</label>
                    <input
                      ref={buyerNipRef}
                      type="text"
                      value={form.buyerNip}
                      onChange={e => { form.setBuyerNip(e.target.value); form.setErrorFields(f => ({ ...f, buyerNip: false })); }}
                      maxLength={13}
                      className={`${inp} font-mono ${border('buyerNip')}`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelCountry2}</label>
                    <input type="text" value={form.buyerAddress.country} onChange={e => form.setBuyerAddress(a => ({ ...a, country: e.target.value.toUpperCase() }))} maxLength={2} minLength={2} className={`${inp} ${borderNormal}`} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelStreet} <span className="text-xs text-gray-400 font-normal">({td.labelInvoiceNumberHint.replace('{n}', String(MAX_ZNAKOWY_512)).replace('(', '').replace(')', '')})</span></label>
                    <input type="text" value={form.buyerAddress.street} onChange={e => form.setBuyerAddress(a => ({ ...a, street: e.target.value }))} maxLength={MAX_ZNAKOWY_512} className={`${inp} ${borderNormal}`} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelCity} <span className="text-xs text-gray-400 font-normal">({td.labelInvoiceNumberHint.replace('{n}', String(MAX_ZNAKOWY_512)).replace('(', '').replace(')', '')})</span></label>
                    <input type="text" value={form.buyerAddress.city} onChange={e => form.setBuyerAddress(a => ({ ...a, city: e.target.value }))} maxLength={MAX_ZNAKOWY_512} className={`${inp} ${borderNormal}`} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelZip}</label>
                    <input type="text" value={form.buyerAddress.zip} onChange={e => form.setBuyerAddress(a => ({ ...a, zip: e.target.value }))} placeholder="00-001" maxLength={10} className={`${inp} ${borderNormal}`} />
                  </div>
                </div>
              )}
            </section>

            {/* ── Line Items ─────────────────────────────────── */}
            <section className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">{td.sectionItems}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-2 font-medium pr-2 min-w-[180px]">{td.colName} <span className="text-xs font-normal">({MAX_ZNAKOWY})</span></th>
                      <th className="pb-2 font-medium pr-2 w-20">{td.colQty}</th>
                      <th className="pb-2 font-medium pr-2 w-16">{td.colUnit}</th>
                      <th className="pb-2 font-medium pr-2 w-24">{td.colPriceNet}</th>
                      <th className="pb-2 font-medium pr-2 w-28">VAT</th>
                      <th className="pb-2 font-medium pr-2 w-24 text-right">{td.colNet}</th>
                      <th className="pb-2 font-medium pr-2 w-24 text-right">VAT</th>
                      <th className="pb-2 font-medium text-right w-24">{td.colGross}</th>
                      <th className="pb-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {lineItems.items.map((row, idx) => {
                      const computed = computeItem(row);
                      const nameKey  = `item-${idx}-name`;
                      const qtyKey   = `item-${idx}-qty`;
                      return (
                        <tr key={idx}>
                          <td className="py-2 pr-2">
                            <input
                              ref={el => { itemNameRefs.current[idx] = el; }}
                              type="text"
                              value={row.name}
                              onChange={e => { lineItems.updateItem(idx, 'name', e.target.value); form.setErrorFields(f => ({ ...f, [nameKey]: false })); }}
                              placeholder={td.placeholderItem}
                              maxLength={MAX_ZNAKOWY}
                              className={`${inpSm} ${border(nameKey)}`}
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              min="0.001"
                              step="any"
                              value={row.quantity}
                              onChange={e => { lineItems.updateItem(idx, 'quantity', e.target.value); form.setErrorFields(f => ({ ...f, [qtyKey]: false })); }}
                              className={`${inpSm} ${border(qtyKey)}`}
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input type="text" value={row.unit} onChange={e => lineItems.updateItem(idx, 'unit', e.target.value)} maxLength={MAX_ZNAKOWY} className={`${inpSm} ${borderNormal}`} />
                          </td>
                          <td className="py-2 pr-2">
                            <input type="number" min="0" step="0.00000001" value={row.priceNet} onChange={e => lineItems.updateItem(idx, 'priceNet', e.target.value)} className={`${inpSm} ${borderNormal}`} />
                          </td>
                          <td className="py-2 pr-2">
                            <select value={row.vatRate} onChange={e => lineItems.updateItem(idx, 'vatRate', e.target.value)} className={`${inpSm} ${borderNormal}`}>
                              {VAT_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums text-gray-900 dark:text-gray-100">{computed.totalNet.toFixed(2)}</td>
                          <td className="py-2 pr-2 text-right tabular-nums text-gray-900 dark:text-gray-100">{computed.totalVat.toFixed(2)}</td>
                          <td className="py-2 text-right tabular-nums font-medium text-gray-900 dark:text-gray-100">{computed.totalGross.toFixed(2)}</td>
                          <td className="py-2 pl-2">
                            {lineItems.items.length > 1 && (
                              <button type="button" onClick={() => lineItems.removeItem(idx)} className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={lineItems.addItem} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                <Plus className="h-4 w-4" /> {td.addItem}
              </button>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="text-sm space-y-1 text-right min-w-[200px]">
                  <div className="flex justify-between gap-8 text-gray-600 dark:text-gray-300">
                    <span>{td.sumNet}</span>
                    <span className="tabular-nums">{totalNet.toFixed(2)} {form.currency}</span>
                  </div>
                  <div className="flex justify-between gap-8 text-gray-600 dark:text-gray-300">
                    <span>{td.sumVat}</span>
                    <span className="tabular-nums">{totalVat.toFixed(2)} {form.currency}</span>
                  </div>
                  <div className="flex justify-between gap-8 font-semibold text-gray-900 dark:text-gray-100 border-t border-gray-200 dark:border-gray-700 pt-1">
                    <span>{td.sumGross}</span>
                    <span className="tabular-nums">{totalGross.toFixed(2)} {form.currency}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <Button type="button" variant="outline" onClick={handleClose}>{t.cancel}</Button>
              <Button type="submit" disabled={form.submitting}>
                <Send className="h-4 w-4 mr-2" />
                {form.submitting ? t.sendingProgress : t.sendToKsef}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
