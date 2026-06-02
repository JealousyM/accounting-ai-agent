'use client';

import { useState, useEffect } from 'react';
import { sendRawInvoiceToKSeF, KSeFSendResult, FA3Item, FA3Address, KSeFConfig } from '@/lib/api/ksef';
import {
  AddressFields,
  emptyAddress,
  MAX_ZNAKOWY,
  ItemRow,
  KSeFDirectSendFormInitialData,
} from '@/lib/ksef-calculation';

const today       = () => new Date().toISOString().slice(0, 10);
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export interface ValidationError {
  message: string;
  fieldKey: string;
  openSection?: 'seller' | 'buyer';
  itemIndex?: number;
}

export interface KSeFSendFormState {
  // Invoice metadata
  invoiceNumber: string;
  setInvoiceNumber: (v: string) => void;
  issueDate: string;
  setIssueDate: (v: string) => void;
  sellDate: string;
  setSellDate: (v: string) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  currency: string;
  setCurrency: (v: string) => void;
  paymentMethod: string;
  setPaymentMethod: (v: string) => void;
  paymentAccount: string;
  setPaymentAccount: (v: string) => void;

  // Seller
  sellerName: string;
  setSellerName: (v: string) => void;
  sellerNip: string;
  setSellerNip: (v: string) => void;
  sellerAddress: AddressFields;
  setSellerAddress: React.Dispatch<React.SetStateAction<AddressFields>>;

  // Buyer
  buyerName: string;
  setBuyerName: (v: string) => void;
  buyerNip: string;
  setBuyerNip: (v: string) => void;
  buyerAddress: AddressFields;
  setBuyerAddress: React.Dispatch<React.SetStateAction<AddressFields>>;

  // UI state
  submitting: boolean;
  error: string | null;
  setError: (msg: string | null) => void;
  result: KSeFSendResult | null;
  errorFields: Record<string, boolean>;
  setErrorFields: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  sellerOpen: boolean;
  setSellerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  buyerOpen: boolean;
  setBuyerOpen: React.Dispatch<React.SetStateAction<boolean>>;

  // Actions
  validate: (items: ItemRow[]) => ValidationError | null;
  submit: (items: FA3Item[], totals: { totalNet: number; totalVat: number; totalGross: number }) => Promise<boolean>;
  reset: () => void;
  clearErrors: () => void;
}

interface UseKSeFSendFormParams {
  config?: KSeFConfig;
  open: boolean;
  initialData?: KSeFDirectSendFormInitialData;
  onSuccess?: (result: KSeFSendResult) => void;
}

export function useKSeFSendForm({ config, open, initialData, onSuccess }: UseKSeFSendFormParams): KSeFSendFormState {
  const [invoiceNumber,  setInvoiceNumber]  = useState('');
  const [issueDate,      setIssueDate]      = useState(today);
  const [sellDate,       setSellDate]       = useState(today);
  const [dueDate,        setDueDate]        = useState(() => daysFromNow(14));
  const [currency,       setCurrency]       = useState('PLN');
  const [paymentMethod,  setPaymentMethod]  = useState('transfer');
  const [paymentAccount, setPaymentAccount] = useState('');

  const [sellerName,    setSellerName]    = useState('');
  const [sellerNip,     setSellerNip]     = useState(config?.ksefNip ?? '');
  const [sellerAddress, setSellerAddress] = useState<AddressFields>(emptyAddress);

  const [buyerName,    setBuyerName]    = useState('');
  const [buyerNip,     setBuyerNip]     = useState('');
  const [buyerAddress, setBuyerAddress] = useState<AddressFields>(emptyAddress);

  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [result,      setResult]      = useState<KSeFSendResult | null>(null);
  const [sellerOpen,  setSellerOpen]  = useState(false);
  const [buyerOpen,   setBuyerOpen]   = useState(true);
  const [errorFields, setErrorFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (config?.ksefNip) setSellerNip(config.ksefNip);
  }, [config?.ksefNip]);

  useEffect(() => {
    if (open && initialData) {
      if (initialData.buyerName)      setBuyerName(initialData.buyerName);
      if (initialData.buyerNip)       setBuyerNip(initialData.buyerNip);
      if (initialData.buyerAddress)   setBuyerAddress(initialData.buyerAddress);
      if (initialData.sellerName)     setSellerName(initialData.sellerName);
      if (initialData.sellerNip)      setSellerNip(initialData.sellerNip);
      if (initialData.sellerAddress)  setSellerAddress(initialData.sellerAddress);
      if (initialData.currency)       setCurrency(initialData.currency);
      if (initialData.paymentMethod)  setPaymentMethod(initialData.paymentMethod);
      if (initialData.paymentAccount) setPaymentAccount(initialData.paymentAccount);
    }
  }, [open, initialData]);

  const clearErrors = () => { setError(null); setErrorFields({}); };

  const validate = (items: ItemRow[]): ValidationError | null => {
    const num = invoiceNumber.trim();
    if (!num)
      return { message: 'errInvoiceNumberRequired', fieldKey: 'invoiceNumber' };
    if (num.length > MAX_ZNAKOWY)
      return { message: 'errInvoiceNumberTooLong', fieldKey: 'invoiceNumber' };

    const sName = sellerName.trim();
    if (!sName)
      return { message: 'errSellerNameRequired', fieldKey: 'sellerName', openSection: 'seller' };
    if (sName.length > MAX_ZNAKOWY)
      return { message: 'errSellerNameTooLong', fieldKey: 'sellerName', openSection: 'seller' };

    const sNip = sellerNip.replace(/[-\s]/g, '');
    if (!/^\d{10}$/.test(sNip))
      return { message: 'errSellerNipInvalid', fieldKey: 'sellerNip', openSection: 'seller' };

    const bName = buyerName.trim();
    if (!bName)
      return { message: 'errBuyerNameRequired', fieldKey: 'buyerName', openSection: 'buyer' };
    if (bName.length > MAX_ZNAKOWY)
      return { message: 'errBuyerNameTooLong', fieldKey: 'buyerName', openSection: 'buyer' };

    if (!buyerNip.trim())
      return { message: 'errBuyerNipRequired', fieldKey: 'buyerNip', openSection: 'buyer' };

    if (items.length === 0)
      return { message: 'errNoItems', fieldKey: '' };

    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      if (!row.name.trim())
        return { message: 'errItemNameRequired', fieldKey: `item-${i}-name`, itemIndex: i };
      if (row.name.length > MAX_ZNAKOWY)
        return { message: 'errItemNameTooLong', fieldKey: `item-${i}-name`, itemIndex: i };
      const qty = parseFloat(row.quantity);
      if (isNaN(qty) || qty <= 0)
        return { message: 'errItemQtyInvalid', fieldKey: `item-${i}-qty`, itemIndex: i };
    }

    return null;
  };

  const toAddress = (a: AddressFields): FA3Address =>
    ({ street: a.street, city: a.city, zip: a.zip, country: a.country || 'PL' });

  const submit = async (
    computedItems: FA3Item[],
    { totalNet, totalVat, totalGross }: { totalNet: number; totalVat: number; totalGross: number },
  ): Promise<boolean> => {
    setSubmitting(true);
    try {
      const res = await sendRawInvoiceToKSeF({
        invoiceNumber: invoiceNumber.trim(),
        issueDate, sellDate, dueDate,
        sellerName: sellerName.trim(),
        sellerNip: sellerNip.replace(/[-\s]/g, ''),
        sellerAddress: toAddress(sellerAddress),
        buyerName: buyerName.trim(),
        buyerNip: buyerNip.trim(),
        buyerAddress: toAddress(buyerAddress),
        items: computedItems,
        totalNet, totalVat, totalGross,
        currency: currency || 'PLN',
        paymentMethod: paymentMethod || 'transfer',
        paymentAccount: paymentAccount.trim() || undefined,
      });
      setResult(res);
      onSuccess?.(res);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'errSendFailed');
      setErrorFields({});
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setResult(null);
    clearErrors();
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
  };

  return {
    invoiceNumber, setInvoiceNumber,
    issueDate, setIssueDate,
    sellDate, setSellDate,
    dueDate, setDueDate,
    currency, setCurrency,
    paymentMethod, setPaymentMethod,
    paymentAccount, setPaymentAccount,
    sellerName, setSellerName,
    sellerNip, setSellerNip,
    sellerAddress, setSellerAddress,
    buyerName, setBuyerName,
    buyerNip, setBuyerNip,
    buyerAddress, setBuyerAddress,
    submitting, error, setError, result, errorFields, setErrorFields,
    sellerOpen, setSellerOpen,
    buyerOpen, setBuyerOpen,
    validate, submit, reset, clearErrors,
  };
}
