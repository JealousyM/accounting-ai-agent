'use client';

import React, { useState, useRef } from 'react';
import { Plus, Trash2, X, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useKSeF } from '@/hooks/useKSeF';
import { useKSeFContractors } from '../../hooks/useKSeF';
import { sendRawInvoiceToKSeF, KSeFSendResult, FA3Item, FA3Address } from '@/lib/api/ksef';
import { PartyComboSelect } from './PartyComboSelect';
import { useLocale } from '@/contexts/LocaleContext';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = { en: enTranslations, pl: plTranslations, ru: ruTranslations };

// FA(3) XSD constraints
const MAX_ZNAKOWY     = 256;  // TZnakowy
const MAX_ZNAKOWY_512 = 512;  // TZnakowy512

// TStawkaPodatku enumeration from FA(3) XSD schema
const VAT_RATES: { value: string; label: string; rate: number }[] = [
  { value: '23',    label: '23%',          rate: 23 },
  { value: '8',     label: '8%',           rate: 8  },
  { value: '5',     label: '5%',           rate: 5  },
  { value: '0 KR',  label: '0% KR (kraj)', rate: 0  },
  { value: '0 WDT', label: '0% WDT',       rate: 0  },
  { value: '0 EX',  label: '0% EX (eksport)', rate: 0 },
  { value: 'zw',    label: 'zw (zwolnione)',   rate: 0 },
  { value: 'oo',    label: 'oo (odw. obciążenie)', rate: 0 },
  { value: 'np I',  label: 'np I (niepodlegające)', rate: 0 },
  { value: 'np II', label: 'np II',        rate: 0  },
];
const CURRENCIES = ['PLN', 'EUR', 'USD', 'GBP', 'CHF', 'CZK', 'DKK', 'NOK', 'SEK'];

const today       = () => new Date().toISOString().slice(0, 10);
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

function roundTwo(n: number): number { return Math.round(n * 100) / 100; }

interface ItemRow { name: string; quantity: string; unit: string; priceNet: string; vatRate: string; }

function computeItem(row: ItemRow): FA3Item {
  const quantity = parseFloat(row.quantity) || 0;
  const priceNet  = parseFloat(row.priceNet) || 0;
  const vatDef    = VAT_RATES.find(r => r.value === row.vatRate);
  const vatPct    = vatDef ? vatDef.rate : 0;
  const totalNet   = roundTwo(quantity * priceNet);
  const totalVat   = roundTwo(totalNet * vatPct / 100);
  const totalGross = roundTwo(totalNet + totalVat);
  return { name: row.name, quantity, unit: row.unit || 'szt.', priceNet, vatRate: row.vatRate, totalNet, totalVat, totalGross };
}

interface AddressFields { street: string; city: string; zip: string; country: string; }
const emptyAddress: AddressFields = { street: '', city: '', zip: '', country: 'PL' };
const emptyItem: ItemRow = { name: '', quantity: '1', unit: 'szt.', priceNet: '0', vatRate: '23' };

export interface KSeFDirectSendFormInitialData {
  buyerName?: string;
  buyerNip?: string;
  buyerAddress?: AddressFields;
  sellerName?: string;
  sellerNip?: string;
  sellerAddress?: AddressFields;
  currency?: string;
  paymentMethod?: string;
  paymentAccount?: string;
  items?: ItemRow[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: (result: KSeFSendResult) => void;
  initialData?: KSeFDirectSendFormInitialData;
}

// Base input classes
const inp   = 'w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500';
const inpSm = 'w-full border rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500';
const borderNormal = 'border-gray-300 dark:border-gray-600';
const borderError  = 'border-red-500 dark:border-red-400 focus:ring-red-400';

export function KSeFDirectSendForm({ open, onClose, onSuccess, initialData }: Props) {
  const { config } = useKSeF();
  const { contractors, isLoading: contractorsLoading, createContractor, isCreating, updateContractor, isUpdating, deleteContractor } = useKSeFContractors();
  const { locale } = useLocale();
  const t = translations[locale].ksef;
  const td = t.directSend;

  // Scrollable modal container
  const modalRef = useRef<HTMLDivElement>(null);

  // Field refs for scroll-to-field on error
  const invoiceNumberRef = useRef<HTMLInputElement>(null);
  const sellerNameRef    = useRef<HTMLInputElement>(null);
  const sellerNipRef     = useRef<HTMLInputElement>(null);
  const buyerNameRef     = useRef<HTMLInputElement>(null);
  const buyerNipRef      = useRef<HTMLInputElement>(null);
  const itemNameRefs     = useRef<(HTMLInputElement | null)[]>([]);

  // Invoice metadata
  const [invoiceNumber,  setInvoiceNumber]  = useState('');
  const [issueDate,      setIssueDate]      = useState(today);
  const [sellDate,       setSellDate]       = useState(today);
  const [dueDate,        setDueDate]        = useState(() => daysFromNow(14));
  const [currency,       setCurrency]       = useState('PLN');
  const [paymentMethod,  setPaymentMethod]  = useState('transfer');
  const [paymentAccount, setPaymentAccount] = useState('');

  // Seller
  const [sellerName,    setSellerName]    = useState('');
  const [sellerNip,     setSellerNip]     = useState(config?.ksefNip ?? '');
  const [sellerAddress, setSellerAddress] = useState<AddressFields>(emptyAddress);

  // Buyer
  const [buyerName,    setBuyerName]    = useState('');
  const [buyerNip,     setBuyerNip]     = useState('');
  const [buyerAddress, setBuyerAddress] = useState<AddressFields>(emptyAddress);

  // Items
  const [items, setItems] = useState<ItemRow[]>([{ ...emptyItem }]);

  // UI state
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [result,      setResult]      = useState<KSeFSendResult | null>(null);
  const [buyerOpen,   setBuyerOpen]   = useState(true);
  const [sellerOpen,  setSellerOpen]  = useState(false);

  // Field-level error highlight: field key → true
  const [errorFields, setErrorFields] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (config?.ksefNip) setSellerNip(config.ksefNip);
  }, [config?.ksefNip]);

  React.useEffect(() => {
    if (open && initialData) {
      if (initialData.buyerName)     setBuyerName(initialData.buyerName);
      if (initialData.buyerNip)      setBuyerNip(initialData.buyerNip);
      if (initialData.buyerAddress)  setBuyerAddress(initialData.buyerAddress);
      if (initialData.sellerName)    setSellerName(initialData.sellerName);
      if (initialData.sellerNip)     setSellerNip(initialData.sellerNip);
      if (initialData.sellerAddress) setSellerAddress(initialData.sellerAddress);
      if (initialData.currency)      setCurrency(initialData.currency);
      if (initialData.paymentMethod) setPaymentMethod(initialData.paymentMethod);
      if (initialData.paymentAccount) setPaymentAccount(initialData.paymentAccount);
      if (initialData.items && initialData.items.length > 0) setItems(initialData.items);
    }
  }, [open, initialData]);

  if (!open) return null;

  const computedItems = items.map(computeItem);
  const totalNet   = roundTwo(computedItems.reduce((s, i) => s + i.totalNet,   0));
  const totalVat   = roundTwo(computedItems.reduce((s, i) => s + i.totalVat,   0));
  const totalGross = roundTwo(computedItems.reduce((s, i) => s + i.totalGross, 0));

  const updateItem = (idx: number, field: keyof ItemRow, value: string) =>
    setItems(prev => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));

  const addItem    = () => setItems(prev => [...prev, { ...emptyItem }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const toAddress = (a: AddressFields): FA3Address =>
    ({ street: a.street, city: a.city, zip: a.zip, country: a.country || 'PL' });

  /**
   * Show error and scroll/focus the specific problematic field.
   * fieldKey: logical name of the field (matches errorFields keys)
   * ref: direct ref to the input element to scroll to
   * openSection: optionally force-open a collapsible section
   */
  const showError = (
    msg: string,
    fieldKey: string,
    ref?: React.RefObject<HTMLInputElement | null> | HTMLInputElement | null,
    openSection?: () => void,
  ) => {
    setError(msg);
    setErrorFields({ [fieldKey]: true });
    if (openSection) openSection();

    setTimeout(() => {
      const el = ref instanceof HTMLElement ? ref : ref?.current;
      if (el && modalRef.current) {
        const containerRect = modalRef.current.getBoundingClientRect();
        const elRect        = el.getBoundingClientRect();
        const scrollTo      = modalRef.current.scrollTop + elRect.top - containerRect.top - 80;
        modalRef.current.scrollTo({ top: Math.max(0, scrollTo), behavior: 'smooth' });
        el.focus();
      }
    }, 50); // small delay so section is open before measuring
  };

  const clearErrors = () => { setError(null); setErrorFields({}); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    // ── Validate ─────────────────────────────────────────────
    const num = invoiceNumber.trim();
    if (!num)
      return showError(td.errInvoiceNumberRequired, 'invoiceNumber', invoiceNumberRef);
    if (num.length > MAX_ZNAKOWY)
      return showError(td.errInvoiceNumberTooLong.replace('{n}', String(MAX_ZNAKOWY)), 'invoiceNumber', invoiceNumberRef);

    const sName = sellerName.trim();
    if (!sName)
      return showError(td.errSellerNameRequired, 'sellerName', sellerNameRef, () => setSellerOpen(true));
    if (sName.length > MAX_ZNAKOWY)
      return showError(td.errSellerNameTooLong.replace('{n}', String(MAX_ZNAKOWY)), 'sellerName', sellerNameRef, () => setSellerOpen(true));

    const sNip = sellerNip.replace(/[-\s]/g, '');
    if (!/^\d{10}$/.test(sNip))
      return showError(td.errSellerNipInvalid, 'sellerNip', sellerNipRef, () => setSellerOpen(true));

    const bName = buyerName.trim();
    if (!bName)
      return showError(td.errBuyerNameRequired, 'buyerName', buyerNameRef, () => setBuyerOpen(true));
    if (bName.length > MAX_ZNAKOWY)
      return showError(td.errBuyerNameTooLong.replace('{n}', String(MAX_ZNAKOWY)), 'buyerName', buyerNameRef, () => setBuyerOpen(true));

    if (!buyerNip.trim())
      return showError(td.errBuyerNipRequired, 'buyerNip', buyerNipRef, () => setBuyerOpen(true));

    if (items.length === 0) {
      setError(td.errNoItems);
      setErrorFields({});
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      if (!row.name.trim())
        return showError(td.errItemNameRequired.replace('{n}', String(i + 1)), `item-${i}-name`, itemNameRefs.current[i]);
      if (row.name.length > MAX_ZNAKOWY)
        return showError(td.errItemNameTooLong.replace('{n}', String(i + 1)).replace('{max}', String(MAX_ZNAKOWY)), `item-${i}-name`, itemNameRefs.current[i]);
      const qty = parseFloat(row.quantity);
      if (isNaN(qty) || qty <= 0)
        return showError(td.errItemQtyInvalid.replace('{n}', String(i + 1)), `item-${i}-qty`);
    }

    setSubmitting(true);
    try {
      const res = await sendRawInvoiceToKSeF({
        invoiceNumber: num,
        issueDate, sellDate, dueDate,
        sellerName: sName, sellerNip: sNip,
        sellerAddress: toAddress(sellerAddress),
        buyerName: bName, buyerNip: buyerNip.trim(),
        buyerAddress: toAddress(buyerAddress),
        items: computedItems,
        totalNet, totalVat, totalGross,
        currency: currency || 'PLN',
        paymentMethod: paymentMethod || 'transfer',
        paymentAccount: paymentAccount.trim() || undefined,
      });
      setResult(res);
      onSuccess?.(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : td.errSendFailed);
      setErrorFields({});
      modalRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    clearErrors();
    // Reset buyer fields so next open (without initialData) starts clean
    setBuyerName('');
    setBuyerNip('');
    setBuyerAddress(emptyAddress);
    setInvoiceNumber('');
    setCurrency('PLN');
    setPaymentMethod('transfer');
    setPaymentAccount('');
    setIssueDate(today());
    setSellDate(today());
    setDueDate(daysFromNow(14));
    setItems([{ ...emptyItem }]);
    onClose();
  };

  // Helper: pick border class for a field
  const border = (key: string) => errorFields[key] ? borderError : borderNormal;

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
              {initialData
                ? td.subtitleCopy
                : td.subtitle}
            </p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        {result ? (
          <div className="p-6 space-y-4">
            <div className={`rounded-lg p-4 ${result.success ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700'}`}>
              <p className={`font-medium ${result.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                {result.success ? td.successSent : td.errorSend}
              </p>
              {result.referenceNumber && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{t.reference}: <code className="font-mono">{result.referenceNumber}</code></p>
              )}
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{result.message}</p>
            </div>
            <div className="flex justify-end"><Button onClick={handleClose}>{td.close}</Button></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Global error banner */}
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 p-3 text-sm text-red-700 dark:text-red-300">
                {error}
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
                    value={invoiceNumber}
                    onChange={e => { setInvoiceNumber(e.target.value); setErrorFields(f => ({ ...f, invoiceNumber: false })); }}
                    placeholder={td.placeholderInvoiceNumber}
                    maxLength={MAX_ZNAKOWY}
                    className={`${inp} ${border('invoiceNumber')}`}
                    required
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelCurrency}</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className={`${inp} ${borderNormal}`}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelIssueDate}</label>
                  <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={`${inp} ${borderNormal}`} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelSellDate}</label>
                  <input type="date" value={sellDate} onChange={e => setSellDate(e.target.value)} className={`${inp} ${borderNormal}`} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelDueDate}</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={`${inp} ${borderNormal}`} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelPaymentMethod}</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={`${inp} ${borderNormal}`}>
                    <option value="transfer">{td.paymentTransfer}</option>
                    <option value="cash">{td.paymentCash}</option>
                    <option value="card">{td.paymentCard}</option>
                  </select>
                </div>
                {paymentMethod === 'transfer' && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelPaymentAccount}</label>
                    <input type="text" value={paymentAccount} onChange={e => setPaymentAccount(e.target.value)} placeholder="PL00 0000 0000 0000 0000 0000 0000" maxLength={MAX_ZNAKOWY} className={`${inp} ${borderNormal}`} />
                  </div>
                )}
              </div>
            </section>

            {/* ── Seller ─────────────────────────────────────── */}
            <section className="border dark:border-gray-700 rounded-lg">
              <button type="button" onClick={() => setSellerOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-t-lg">
                <span className="flex items-center gap-2">
                  {td.sectionSeller}
                  {(errorFields['sellerName'] || errorFields['sellerNip']) && (
                    <span className="text-xs text-red-500 font-normal">{td.errorFillRequired}</span>
                  )}
                </span>
                {sellerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {sellerOpen && (
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {td.labelCompanyName} <span className="text-xs text-gray-400 font-normal">{td.labelInvoiceNumberHint.replace('{n}', String(MAX_ZNAKOWY))}</span>
                    </label>
                    <PartyComboSelect
                      label={t.contractors.selectSeller}
                      value={{ name: sellerName, nip: sellerNip, street: sellerAddress.street, city: sellerAddress.city, zip: sellerAddress.zip, country: sellerAddress.country }}
                      onChange={(party) => {
                        setSellerName(party.name);
                        setSellerNip(party.nip);
                        setSellerAddress({ street: party.street, city: party.city, zip: party.zip, country: party.country });
                        setErrorFields(f => ({ ...f, sellerName: false, sellerNip: false }));
                      }}
                      contractors={contractors}
                      isLoading={contractorsLoading}
                      onCreateNew={(data) => createContractor(data)}
                      onUpdateContractor={(id, data) => updateContractor({ id, data })}
                      onDeleteContractor={(id) => deleteContractor(id)}
                      isCreating={isCreating}
                      isUpdating={isUpdating}
                      nameError={errorFields['sellerName']}
                      nipError={errorFields['sellerNip']}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelNip10}</label>
                    <input
                      ref={sellerNipRef}
                      type="text"
                      value={sellerNip}
                      onChange={e => { setSellerNip(e.target.value); setErrorFields(f => ({ ...f, sellerNip: false })); }}
                      placeholder="1234567890"
                      maxLength={13}
                      className={`${inp} font-mono ${border('sellerNip')}`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelCountry2}</label>
                    <input type="text" value={sellerAddress.country} onChange={e => setSellerAddress(a => ({ ...a, country: e.target.value.toUpperCase() }))} maxLength={2} minLength={2} className={`${inp} ${borderNormal}`} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelStreet} <span className="text-xs text-gray-400 font-normal">({td.labelInvoiceNumberHint.replace('{n}', String(MAX_ZNAKOWY_512)).replace('(', '').replace(')', '')})</span></label>
                    <input type="text" value={sellerAddress.street} onChange={e => setSellerAddress(a => ({ ...a, street: e.target.value }))} maxLength={MAX_ZNAKOWY_512} className={`${inp} ${borderNormal}`} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelCity} <span className="text-xs text-gray-400 font-normal">({td.labelInvoiceNumberHint.replace('{n}', String(MAX_ZNAKOWY_512)).replace('(', '').replace(')', '')})</span></label>
                    <input type="text" value={sellerAddress.city} onChange={e => setSellerAddress(a => ({ ...a, city: e.target.value }))} maxLength={MAX_ZNAKOWY_512} className={`${inp} ${borderNormal}`} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelZip}</label>
                    <input type="text" value={sellerAddress.zip} onChange={e => setSellerAddress(a => ({ ...a, zip: e.target.value }))} placeholder="00-001" maxLength={10} className={`${inp} ${borderNormal}`} />
                  </div>
                </div>
              )}
            </section>

            {/* ── Buyer ──────────────────────────────────────── */}
            <section className="border dark:border-gray-700 rounded-lg">
              <button type="button" onClick={() => setBuyerOpen(v => !v)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-t-lg">
                <span className="flex items-center gap-2">
                  {td.sectionBuyer}
                  {(errorFields['buyerName'] || errorFields['buyerNip']) && (
                    <span className="text-xs text-red-500 font-normal">{td.errorFillRequired}</span>
                  )}
                </span>
                {buyerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {buyerOpen && (
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {td.labelCompanyNameBuyer} <span className="text-xs text-gray-400 font-normal">{td.labelInvoiceNumberHint.replace('{n}', String(MAX_ZNAKOWY))}</span>
                    </label>
                    <PartyComboSelect
                      label={t.contractors.selectBuyer}
                      value={{ name: buyerName, nip: buyerNip, street: buyerAddress.street, city: buyerAddress.city, zip: buyerAddress.zip, country: buyerAddress.country }}
                      onChange={(party) => {
                        setBuyerName(party.name);
                        setBuyerNip(party.nip);
                        setBuyerAddress({ street: party.street, city: party.city, zip: party.zip, country: party.country });
                        setErrorFields(f => ({ ...f, buyerName: false, buyerNip: false }));
                      }}
                      contractors={contractors}
                      isLoading={contractorsLoading}
                      onCreateNew={(data) => createContractor(data)}
                      onUpdateContractor={(id, data) => updateContractor({ id, data })}
                      onDeleteContractor={(id) => deleteContractor(id)}
                      isCreating={isCreating}
                      isUpdating={isUpdating}
                      nameError={errorFields['buyerName']}
                      nipError={errorFields['buyerNip']}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelNip}</label>
                    <input
                      ref={buyerNipRef}
                      type="text"
                      value={buyerNip}
                      onChange={e => { setBuyerNip(e.target.value); setErrorFields(f => ({ ...f, buyerNip: false })); }}
                      maxLength={13}
                      className={`${inp} font-mono ${border('buyerNip')}`}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelCountry2}</label>
                    <input type="text" value={buyerAddress.country} onChange={e => setBuyerAddress(a => ({ ...a, country: e.target.value.toUpperCase() }))} maxLength={2} minLength={2} className={`${inp} ${borderNormal}`} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelStreet} <span className="text-xs text-gray-400 font-normal">({td.labelInvoiceNumberHint.replace('{n}', String(MAX_ZNAKOWY_512)).replace('(', '').replace(')', '')})</span></label>
                    <input type="text" value={buyerAddress.street} onChange={e => setBuyerAddress(a => ({ ...a, street: e.target.value }))} maxLength={MAX_ZNAKOWY_512} className={`${inp} ${borderNormal}`} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelCity} <span className="text-xs text-gray-400 font-normal">({td.labelInvoiceNumberHint.replace('{n}', String(MAX_ZNAKOWY_512)).replace('(', '').replace(')', '')})</span></label>
                    <input type="text" value={buyerAddress.city} onChange={e => setBuyerAddress(a => ({ ...a, city: e.target.value }))} maxLength={MAX_ZNAKOWY_512} className={`${inp} ${borderNormal}`} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{td.labelZip}</label>
                    <input type="text" value={buyerAddress.zip} onChange={e => setBuyerAddress(a => ({ ...a, zip: e.target.value }))} placeholder="00-001" maxLength={10} className={`${inp} ${borderNormal}`} />
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
                    {items.map((row, idx) => {
                      const computed  = computeItem(row);
                      const nameKey   = `item-${idx}-name`;
                      const qtyKey    = `item-${idx}-qty`;
                      return (
                        <tr key={idx}>
                          <td className="py-2 pr-2">
                            <input
                              ref={el => { itemNameRefs.current[idx] = el; }}
                              type="text"
                              value={row.name}
                              onChange={e => { updateItem(idx, 'name', e.target.value); setErrorFields(f => ({ ...f, [nameKey]: false })); }}
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
                              onChange={e => { updateItem(idx, 'quantity', e.target.value); setErrorFields(f => ({ ...f, [qtyKey]: false })); }}
                              className={`${inpSm} ${border(qtyKey)}`}
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input type="text" value={row.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} maxLength={MAX_ZNAKOWY} className={`${inpSm} ${borderNormal}`} />
                          </td>
                          <td className="py-2 pr-2">
                            <input type="number" min="0" step="0.00000001" value={row.priceNet} onChange={e => updateItem(idx, 'priceNet', e.target.value)} className={`${inpSm} ${borderNormal}`} />
                          </td>
                          <td className="py-2 pr-2">
                            <select value={row.vatRate} onChange={e => updateItem(idx, 'vatRate', e.target.value)} className={`${inpSm} ${borderNormal}`}>
                              {VAT_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums text-gray-900 dark:text-gray-100">{computed.totalNet.toFixed(2)}</td>
                          <td className="py-2 pr-2 text-right tabular-nums text-gray-900 dark:text-gray-100">{computed.totalVat.toFixed(2)}</td>
                          <td className="py-2 text-right tabular-nums font-medium text-gray-900 dark:text-gray-100">{computed.totalGross.toFixed(2)}</td>
                          <td className="py-2 pl-2">
                            {items.length > 1 && (
                              <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300">
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
              <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                <Plus className="h-4 w-4" /> {td.addItem}
              </button>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="text-sm space-y-1 text-right min-w-[200px]">
                  <div className="flex justify-between gap-8 text-gray-600 dark:text-gray-300">
                    <span>{td.sumNet}</span>
                    <span className="tabular-nums">{totalNet.toFixed(2)} {currency}</span>
                  </div>
                  <div className="flex justify-between gap-8 text-gray-600 dark:text-gray-300">
                    <span>{td.sumVat}</span>
                    <span className="tabular-nums">{totalVat.toFixed(2)} {currency}</span>
                  </div>
                  <div className="flex justify-between gap-8 font-semibold text-gray-900 dark:text-gray-100 border-t border-gray-200 dark:border-gray-700 pt-1">
                    <span>{td.sumGross}</span>
                    <span className="tabular-nums">{totalGross.toFixed(2)} {currency}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <Button type="button" variant="outline" onClick={handleClose}>{t.cancel}</Button>
              <Button type="submit" disabled={submitting}>
                <Send className="h-4 w-4 mr-2" />
                {submitting ? t.sendingProgress : t.sendToKsef}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
