'use client';

import React, { useState, useCallback } from 'react';
import { RefreshCw, Download, FileCheck, FileDown, Loader2, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useKSeF } from '@/hooks/useKSeF';
import { KSeFStatusBadge } from './KSeFStatusBadge';
import { useLocale } from '@/contexts/LocaleContext';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';
import type { KSeFInvoicesQuery, KSeFInvoiceListItem } from '@/lib/api/ksef';

const translations = { en: enTranslations, pl: plTranslations, ru: ruTranslations };

interface KSeFInvoiceListProps {
  onCopy?: (inv: KSeFInvoiceListItem) => void;
  copyingRef?: string | null;
}

export function KSeFInvoiceList({ onCopy, copyingRef }: KSeFInvoiceListProps = {}) {
  const { locale } = useLocale();
  const t = translations[locale].ksef;
  const [query, setQuery] = useState<KSeFInvoicesQuery>({});
  const { invoices, isLoadingInvoices, refetchInvoices, downloadUPO, downloadInvoice, checkStatus } = useKSeF(query);

  const [downloadingRef, setDownloadingRef] = useState<string | null>(null);
  const [downloadingInvRef, setDownloadingInvRef] = useState<string | null>(null);
  const [checkingRef, setCheckingRef] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleDownloadUPO = useCallback(async (referenceNumber: string) => {
    setDownloadingRef(referenceNumber);
    setActionError(null);
    try {
      const blob = await downloadUPO(referenceNumber);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `UPO_${referenceNumber}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to download UPO');
    } finally {
      setDownloadingRef(null);
    }
  }, [downloadUPO]);

  const handleDownloadInvoice = useCallback(async (referenceNumber: string, invoiceNumber?: string) => {
    setDownloadingInvRef(referenceNumber);
    setActionError(null);
    try {
      const blob = await downloadInvoice(referenceNumber, 'pdf');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNumber || referenceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to download invoice');
    } finally {
      setDownloadingInvRef(null);
    }
  }, [downloadInvoice]);

  const handleCheckStatus = useCallback(async (referenceNumber: string) => {
    setCheckingRef(referenceNumber);
    setActionError(null);
    try {
      await checkStatus(referenceNumber);
      refetchInvoices();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to check status');
    } finally {
      setCheckingRef(null);
    }
  }, [checkStatus, refetchInvoices]);

  const canDownloadUPO = (inv: KSeFInvoiceListItem) =>
    inv.status === 'accepted' || inv.status === 'completed';

  const canCheckStatus = (inv: KSeFInvoiceListItem) =>
    inv.status === 'pending' || inv.status === 'sending' || inv.status === 'sent';

  const canDownloadInvoice = (inv: KSeFInvoiceListItem) =>
    inv.status === 'accepted' || inv.status === 'completed' || inv.direction === 'received';

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t.direction}</label>
          <select
            value={query.direction || ''}
            onChange={(e) => setQuery({ ...query, direction: (e.target.value as 'sent' | 'received') || undefined })}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
          >
            <option value="">{t.all}</option>
            <option value="sent">{t.sent}</option>
            <option value="received">{t.received}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t.status}</label>
          <select
            value={query.status || ''}
            onChange={(e) => setQuery({ ...query, status: (e.target.value as any) || undefined })}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
          >
            <option value="">{t.all}</option>
            <option value="pending">{t.pending}</option>
            <option value="sent">{t.sent}</option>
            <option value="accepted">{t.accepted}</option>
            <option value="rejected">{t.rejected}</option>
            <option value="completed">{t.completed}</option>
            <option value="failed">{t.failed}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t.from}</label>
          <input
            type="date"
            value={query.dateFrom || ''}
            onChange={(e) => setQuery({ ...query, dateFrom: e.target.value || undefined })}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t.to}</label>
          <input
            type="date"
            value={query.dateTo || ''}
            onChange={(e) => setQuery({ ...query, dateTo: e.target.value || undefined })}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchInvoices()}>
          {isLoadingInvoices ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {/* Error banner */}
      {actionError && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-red-700 dark:text-red-300">{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 dark:hover:text-red-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {isLoadingInvoices ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : !invoices || invoices.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            {t.noInvoices}
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-300">{t.direction}</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-300">{t.invoice}</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-300">{t.contractor}</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-300">{t.date}</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-300">{t.amount}</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-300">{t.status}</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500 dark:text-gray-300">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {invoices.map((inv) => (
                <tr key={inv.referenceNumber} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium ${inv.direction === 'sent' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`}>
                      {inv.direction === 'sent' ? 'OUT' : 'IN'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{inv.invoiceNumber}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[200px]" title={inv.referenceNumber}>
                      {inv.referenceNumber}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{inv.contractorName || '\u2014'}</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{new Date(inv.issueDate).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-right text-gray-900 dark:text-gray-100">
                    {inv.totalGross > 0 ? `${inv.totalGross.toFixed(2)} ${inv.currency}` : '\u2014'}
                  </td>
                  <td className="py-3 px-4">
                    <KSeFStatusBadge status={inv.status} errorCode={inv.errorCode} errorMessage={inv.errorMessage} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      {onCopy && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onCopy(inv)}
                          disabled={copyingRef === inv.referenceNumber}
                          title={t.copyInvoice ?? 'Kopiuj fakturę'}
                          className="h-7 w-7 p-0"
                        >
                          {copyingRef === inv.referenceNumber
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Copy className="h-3.5 w-3.5" />
                          }
                        </Button>
                      )}
                      {canDownloadUPO(inv) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadUPO(inv.referenceNumber)}
                          disabled={downloadingRef === inv.referenceNumber}
                          title={t.downloadUpo}
                          className="h-7 w-7 p-0"
                        >
                          {downloadingRef === inv.referenceNumber ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                      {canDownloadInvoice(inv) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoice(inv.referenceNumber, inv.invoiceNumber)}
                          disabled={downloadingInvRef === inv.referenceNumber}
                          title={t.downloadInvoice}
                          className="h-7 w-7 p-0"
                        >
                          {downloadingInvRef === inv.referenceNumber ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FileDown className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                      {canCheckStatus(inv) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCheckStatus(inv.referenceNumber)}
                          disabled={checkingRef === inv.referenceNumber}
                          title={t.checkStatus}
                          className="h-7 w-7 p-0"
                        >
                          {checkingRef === inv.referenceNumber ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FileCheck className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
