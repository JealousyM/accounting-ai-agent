'use client';

import { useState } from 'react';
import { computeItem, roundTwo, emptyItem, ItemRow } from '@/lib/ksef-calculation';
import type { FA3Item } from '@/lib/api/ksef';

export interface InvoiceLineItemsTotals {
  totalNet: number;
  totalVat: number;
  totalGross: number;
}

export interface UseInvoiceLineItemsReturn {
  items: ItemRow[];
  computedItems: FA3Item[];
  totals: InvoiceLineItemsTotals;
  addItem: () => void;
  removeItem: (index: number) => void;
  updateItem: (index: number, field: keyof ItemRow, value: string) => void;
  setItems: React.Dispatch<React.SetStateAction<ItemRow[]>>;
}

export function useInvoiceLineItems(initial?: ItemRow[]): UseInvoiceLineItemsReturn {
  const [items, setItems] = useState<ItemRow[]>(initial ?? [{ ...emptyItem }]);

  const computedItems = items.map(computeItem);
  const totals: InvoiceLineItemsTotals = {
    totalNet:   roundTwo(computedItems.reduce((s, i) => s + i.totalNet,   0)),
    totalVat:   roundTwo(computedItems.reduce((s, i) => s + i.totalVat,   0)),
    totalGross: roundTwo(computedItems.reduce((s, i) => s + i.totalGross, 0)),
  };

  const addItem = () => setItems(prev => [...prev, { ...emptyItem }]);
  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));
  const updateItem = (index: number, field: keyof ItemRow, value: string) =>
    setItems(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));

  return { items, computedItems, totals, addItem, removeItem, updateItem, setItems };
}
