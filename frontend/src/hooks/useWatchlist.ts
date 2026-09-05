import { useState, useEffect, useCallback } from 'react';
import { TickerState, UserWatchlist } from '../types';
import {
  fetchAllWatchlists,
  fetchWatchlist,
  createWatchlist,
  renameWatchlist,
  deleteWatchlist,
  addWatchlistSymbol,
  removeWatchlistSymbol,
} from '../services/api';

export function useWatchlist(userId: string) {
  const [watchlists, setWatchlists] = useState<UserWatchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>('');
  const [symbols, setSymbols] = useState<string[]>([]);
  const [tickers, setTickers] = useState<Record<string, TickerState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  // 1. Fetch all user watchlists and select the first/active one
  const loadAllWatchlists = useCallback(async (preferredId?: string) => {
    if (!userId) return;
    try {
      setError(null);
      const data = await fetchAllWatchlists(userId);
      const list = data.watchlists || [];
      setWatchlists(list);

      const targetId = preferredId || activeWatchlistId || list[0]?.id || '';
      const exists = list.some((w) => w.id === targetId);
      const resolvedId = exists ? targetId : (list[0]?.id || '');
      setActiveWatchlistId(resolvedId);

      if (resolvedId) {
        const activeData = await fetchWatchlist(userId, resolvedId);
        setSymbols(activeData.symbols);
        setTickers(activeData.tickers);
      } else {
        setSymbols([]);
        setTickers({});
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load watchlists');
    } finally {
      setIsLoading(false);
    }
  }, [userId, activeWatchlistId]);

  // Load when userId changes
  useEffect(() => {
    loadAllWatchlists();
  }, [userId]);

  // Load specific active watchlist data
  const loadActiveWatchlist = useCallback(async () => {
    if (!userId || !activeWatchlistId) return;
    try {
      const data = await fetchWatchlist(userId, activeWatchlistId);
      setSymbols(data.symbols);
      setTickers(data.tickers);
    } catch (err: any) {
      setError(err.message || 'Failed to load watchlist');
    }
  }, [userId, activeWatchlistId]);

  // Switch watchlist
  const switchWatchlist = (id: string) => {
    setActiveWatchlistId(id);
    setIsLoading(true);
    fetchWatchlist(userId, id)
      .then((data) => {
        setSymbols(data.symbols);
        setTickers(data.tickers);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  };

  const createNewWatchlist = async (name: string, initialSymbols?: string[]) => {
    try {
      setIsLoading(true);
      const res = await createWatchlist(name, initialSymbols, userId);
      setWatchlists(res.watchlists);
      setActiveWatchlistId(res.watchlist.id);
      setSymbols(res.watchlist.symbols);
      const activeData = await fetchWatchlist(userId, res.watchlist.id);
      setTickers(activeData.tickers);
      return res.watchlist;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const renameCurrentWatchlist = async (watchlistId: string, newName: string) => {
    try {
      const res = await renameWatchlist(watchlistId, newName, userId);
      setWatchlists(res.watchlists);
      return res.watchlist;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteCurrentWatchlist = async (watchlistId: string) => {
    try {
      setIsLoading(true);
      const res = await deleteWatchlist(watchlistId, userId);
      setWatchlists(res.watchlists);
      const nextId = res.watchlists[0]?.id || '';
      setActiveWatchlistId(nextId);
      if (nextId) {
        const nextData = await fetchWatchlist(userId, nextId);
        setSymbols(nextData.symbols);
        setTickers(nextData.tickers);
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const addSymbol = async (symbol: string) => {
    const data = await addWatchlistSymbol(symbol, userId, activeWatchlistId);
    setSymbols(data.symbols);
    setTickers(data.tickers);
    // Update local watchlist symbol count
    setWatchlists((prev) =>
      prev.map((w) => (w.id === activeWatchlistId ? { ...w, symbols: data.symbols } : w))
    );
  };

  const removeSymbol = async (symbol: string) => {
    try {
      setIsRemoving(symbol);
      const data = await removeWatchlistSymbol(symbol, userId, activeWatchlistId);
      setSymbols(data.symbols);
      setTickers(data.tickers);
      setWatchlists((prev) =>
        prev.map((w) => (w.id === activeWatchlistId ? { ...w, symbols: data.symbols } : w))
      );
    } finally {
      setIsRemoving(null);
    }
  };

  return {
    watchlists,
    activeWatchlistId,
    activeWatchlist: watchlists.find((w) => w.id === activeWatchlistId) || watchlists[0],
    symbols,
    tickers,
    isLoading,
    error,
    isRemoving,
    switchWatchlist,
    createNewWatchlist,
    renameCurrentWatchlist,
    deleteCurrentWatchlist,
    loadWatchlist: loadActiveWatchlist,
    loadAllWatchlists,
    addSymbol,
    removeSymbol,
  };
}
