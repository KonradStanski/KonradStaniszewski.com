import { useState, useCallback, useMemo } from 'react';
import { buildNormalizedTransactions, collectTransactionDates } from 'canada-acb';
import type {
  RawSellTransaction,
  RawVestEvent,
  RawEsppPurchase,
  NormalizedTransaction,
  ExchangeRateCache,
} from '../types';

export function useTransactions() {
  const [sells, setSells] = useState<RawSellTransaction[]>([]);
  const [vests, setVests] = useState<RawVestEvent[]>([]);
  const [esppPurchases, setEsppPurchases] = useState<RawEsppPurchase[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateCache>({});

  const addSells = useCallback((newSells: RawSellTransaction[]) => {
    setSells((prev) => {
      const existing = new Set(
        prev.map((s) => `${s.tradeDate}|${s.quantity}|${s.price}|${s.principal}`)
      );
      const unique = newSells.filter(
        (s) => !existing.has(`${s.tradeDate}|${s.quantity}|${s.price}|${s.principal}`)
      );
      return [...prev, ...unique];
    });
  }, []);

  const addVests = useCallback((newVests: RawVestEvent[]) => {
    setVests((prev) => {
      const existing = new Set(
        prev.map((v) => `${v.vestDate}|${v.vestedQty}|${v.grantNumber}|${v.source}`)
      );
      const unique = newVests.filter(
        (v) => !existing.has(`${v.vestDate}|${v.vestedQty}|${v.grantNumber}|${v.source}`)
      );
      return [...prev, ...unique];
    });
  }, []);

  const addEsppPurchases = useCallback((newPurchases: RawEsppPurchase[]) => {
    setEsppPurchases((prev) => {
      const existing = new Set(
        prev.map((p) => `${p.purchaseDate}|${p.purchasedQty}|${p.purchasePrice}|${p.source}`)
      );
      const unique = newPurchases.filter(
        (p) => !existing.has(`${p.purchaseDate}|${p.purchasedQty}|${p.purchasePrice}|${p.source}`)
      );
      return [...prev, ...unique];
    });
  }, []);

  const updateExchangeRates = useCallback((rates: ExchangeRateCache) => {
    setExchangeRates((prev) => ({ ...prev, ...rates }));
  }, []);

  const normalized: NormalizedTransaction[] = useMemo(() => {
    return buildNormalizedTransactions(
      {
        sells,
        vests,
        esppPurchases,
      },
      exchangeRates,
    );
  }, [sells, vests, esppPurchases, exchangeRates]);

  const allDates = useMemo(() => {
    return collectTransactionDates({
      sells,
      vests,
      esppPurchases,
    });
  }, [sells, vests, esppPurchases]);

  const clearAll = useCallback(() => {
    setSells([]);
    setVests([]);
    setEsppPurchases([]);
    setExchangeRates({});
  }, []);

  return {
    sells,
    vests,
    esppPurchases,
    normalized,
    exchangeRates,
    allDates,
    addSells,
    addVests,
    addEsppPurchases,
    updateExchangeRates,
    clearAll,
  };
}
