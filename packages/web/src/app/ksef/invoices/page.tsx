'use client';

import React, { useState } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { KSeFInvoiceList, KSeFEnvironmentBadge, KSeFDirectSendForm } from '@/components/ksef';
import type { KSeFDirectSendFormInitialData } from '@/components/ksef/KSeFDirectSendForm';
import Link from 'next/link';
import { ArrowLeft, FilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getKSeFInvoiceDetails } from '@/lib/api/ksef';
import type { KSeFInvoiceListItem } from '@/lib/api/ksef';
import { useLocale } from '@/contexts/LocaleContext';
import enTranslations from '@/i18n/locales/en.json';
import plTranslations from '@/i18n/locales/pl.json';
import ruTranslations from '@/i18n/locales/ru.json';

const translations = {
  en: enTranslations,
  pl: plTranslations,
  ru: ruTranslations,
};

export default function KSeFInvoicesPage() {
  const { locale } = useLocale();
  const t = translations[locale].ksef;

  const [showDirectSend, setShowDirectSend] = useState(false);
  const [copyData, setCopyData] = useState<KSeFDirectSendFormInitialData | undefined>(undefined);
  const [isCopying, setIsCopying] = useState<string | null>(null);

  const handleCopy = async (inv: KSeFInvoiceListItem) => {
    setIsCopying(inv.referenceNumber);
    try {
      const details = await getKSeFInvoiceDetails(inv.referenceNumber);
      const p = details.invoicePayload;

      if (p) {
        // Full data available (direct-adapter invoice) — prefill everything except invoice number
        setCopyData({
          sellerName: p.sellerName,
          sellerNip: p.sellerNip,
          sellerAddress: p.sellerAddress as { street: string; city: string; zip: string; country: string },
          buyerName: p.buyerName,
          buyerNip: p.buyerNip,
          buyerAddress: p.buyerAddress as { street: string; city: string; zip: string; country: string },
          currency: p.currency,
          paymentMethod: p.paymentMethod,
          paymentAccount: p.paymentAccount,
          items: p.items.map((item) => ({
            name: item.name,
            quantity: String(item.quantity),
            unit: item.unit || 'szt.',
            priceNet: String(item.priceNet),
            vatRate: String(item.vatRate),
          })),
        });
      } else {
        // wFirma invoice or no payload stored — prefill what we have from the list item
        setCopyData({
          buyerName: inv.contractorName || undefined,
          buyerNip: inv.contractorNip || undefined,
          currency: inv.currency || undefined,
        });
      }
    } catch {
      // Fallback to basic data from the list item if details fetch fails
      setCopyData({
        buyerName: inv.contractorName || undefined,
        currency: inv.currency || undefined,
      });
    } finally {
      setIsCopying(null);
      setShowDirectSend(true);
    }
  };

  const handleClose = () => {
    setShowDirectSend(false);
    setCopyData(undefined);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <Link href="/ksef" className="text-gray-400 hover:text-gray-600">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">{t.title} {t.invoices}</h1>
              </div>
              <div className="flex items-center gap-3">
                <KSeFEnvironmentBadge />
                <Button variant="outline" size="sm" onClick={() => setShowDirectSend(true)}>
                  <FilePlus className="h-4 w-4 mr-1.5" />
                  {t.newInvoice}
                </Button>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <KSeFInvoiceList onCopy={handleCopy} copyingRef={isCopying} />
        </main>
      </div>

      <KSeFDirectSendForm
        open={showDirectSend}
        onClose={handleClose}
        initialData={copyData}
      />
    </ProtectedRoute>
  );
}
