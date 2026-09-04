import { useState, useEffect, useCallback } from 'react';
import { TickerState } from '../types';
import {
  fetchWatchlist,
  addWatchlistSymbol,
  removeWatchlistSymbol,
} from '../services/api';

export function useWatchlist(userId: string) {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [tickers, setTickers] = useState<Record<string, TickerState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const loadWatchlist = useCallback(async () => {
    if (!userId) return;
    try {
      setError(null);
      const data = await fetchWatchlist(userId);
      setSymbols(data.symbols);
      setTickers(data.tickers);
    } catch (err: any) {
      setError(err.message || 'Failed to load watchlist');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  const addSymbol = async (symbol: string) => {
    const data = await addWatchlistSymbol(symbol, userId);
    setSymbols(data.symbols);
    setTickers(data.tickers);
  };

  const removeSymbol = async (symbol: string) => {
    try {
      setIsRemoving(symbol);
      const data = await removeWatchlistSymbol(symbol, userId);
      setSymbols(data.symbols);
      setTickers(data.tickers);
    } finally {
      setIsRemoving(null);
    }
  };

  return {
    symbols,
    tickers,
    isLoading,
    error,
    isRemoving,
    loadWatchlist,
    addSymbol,
    removeSymbol,
  };
}
