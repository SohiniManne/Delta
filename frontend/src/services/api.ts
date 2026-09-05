import {
  WatchlistDiffReport,
  TickerState,
  SearchResult,
  UserWatchlist,
} from '../types';
// Resolve backend API URL from environment variable (Vercel / Production) with local dev fallback
const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (!envUrl || typeof envUrl !== 'string' || !envUrl.trim()) {
    return '/api';
  }
  const cleanUrl = envUrl.trim().replace(/\/+$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

const API_BASE = getApiBase();

export async function fetchAllWatchlists(userId = 'default_user'): Promise<{
  userId: string;
  watchlists: UserWatchlist[];
}> {
  const res = await fetch(`${API_BASE}/watchlist/all?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('Failed to fetch watchlists');
  return res.json();
}

export async function fetchWatchlist(userId = 'default_user', watchlistId?: string): Promise<{
  userId: string;
  watchlist?: UserWatchlist;
  symbols: string[];
  tickers: Record<string, TickerState>;
  updatedAt: number;
}> {
  const params = new URLSearchParams({ userId });
  if (watchlistId) params.append('watchlistId', watchlistId);
  const res = await fetch(`${API_BASE}/watchlist?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch watchlist');
  return res.json();
}

export async function createWatchlist(name: string, symbols?: string[], userId = 'default_user'): Promise<{
  message: string;
  watchlist: UserWatchlist;
  watchlists: UserWatchlist[];
}> {
  const res = await fetch(`${API_BASE}/watchlist/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, symbols, userId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create watchlist');
  }
  return res.json();
}

export async function renameWatchlist(watchlistId: string, name: string, userId = 'default_user'): Promise<{
  message: string;
  watchlist: UserWatchlist;
  watchlists: UserWatchlist[];
}> {
  const res = await fetch(`${API_BASE}/watchlist/${encodeURIComponent(watchlistId)}/rename`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, userId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to rename watchlist');
  }
  return res.json();
}

export async function deleteWatchlist(watchlistId: string, userId = 'default_user'): Promise<{
  message: string;
  watchlists: UserWatchlist[];
}> {
  const res = await fetch(`${API_BASE}/watchlist/${encodeURIComponent(watchlistId)}?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete watchlist');
  }
  return res.json();
}

export async function addWatchlistSymbol(symbol: string, userId = 'default_user', watchlistId?: string): Promise<{
  userId: string;
  watchlist?: UserWatchlist;
  symbols: string[];
  tickers: Record<string, TickerState>;
}> {
  const res = await fetch(`${API_BASE}/watchlist/symbols/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, userId, watchlistId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add symbol');
  }
  return res.json();
}

export async function removeWatchlistSymbol(symbol: string, userId = 'default_user', watchlistId?: string): Promise<{
  userId: string;
  watchlist?: UserWatchlist;
  symbols: string[];
  tickers: Record<string, TickerState>;
}> {
  const res = await fetch(`${API_BASE}/watchlist/symbols/remove`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, userId, watchlistId }),
  });
  if (!res.ok) throw new Error('Failed to remove symbol');
  return res.json();
}

export async function fetchLastSeenDiff(userId = 'default_user', watchlistId?: string): Promise<WatchlistDiffReport> {
  const params = new URLSearchParams({ userId });
  if (watchlistId) params.append('watchlistId', watchlistId);
  const res = await fetch(`${API_BASE}/diff/last-seen?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to compute diff report');
  return res.json();
}

export async function fetchCompareDiff(baseId: string, userId = 'default_user', watchlistId?: string): Promise<WatchlistDiffReport> {
  const params = new URLSearchParams({ baseId, userId });
  if (watchlistId) params.append('watchlistId', watchlistId);
  const res = await fetch(`${API_BASE}/diff/compare?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to compute comparison diff report');
  return res.json();
}

export async function acknowledgeDiff(userId = 'default_user', watchlistId?: string): Promise<{
  message: string;
  report: WatchlistDiffReport;
}> {
  const res = await fetch(`${API_BASE}/diff/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, watchlistId }),
  });
  if (!res.ok) throw new Error('Failed to commit/acknowledge snapshot');
  return res.json();
}

export async function fetchSnapshots(userId = 'default_user', watchlistId?: string): Promise<{
  snapshots: Array<{
    id: string;
    userId: string;
    watchlistId?: string;
    name: string;
    timestamp: number;
    baselineType: string;
    isSyntheticColdStart?: boolean;
    tickerCount: number;
  }>;
}> {
  const params = new URLSearchParams({ userId });
  if (watchlistId) params.append('watchlistId', watchlistId);
  const res = await fetch(`${API_BASE}/snapshots?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch snapshots');
  return res.json();
}

export async function commitSnapshot(name: string, userId = 'default_user', watchlistId?: string): Promise<any> {
  const res = await fetch(`${API_BASE}/snapshots/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, userId, watchlistId }),
  });
  if (!res.ok) throw new Error('Failed to commit checkpoint');
  return res.json();
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const res = await fetch(`${API_BASE}/market/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.results || [];
}

// Simulation endpoints for interactive hackathon testing
export async function simulateTick(): Promise<void> {
  await fetch(`${API_BASE}/market/simulate/tick`, { method: 'POST' });
}

export async function simulateStaleness(symbol: string, staleMinutes = 24): Promise<void> {
  await fetch(`${API_BASE}/market/simulate/stale`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, staleMinutes }),
  });
}

export async function simulateDivergence(symbol: string, divergencePercent = 1.45): Promise<void> {
  await fetch(`${API_BASE}/market/simulate/divergence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, divergencePercent }),
  });
}

export async function resetSimulation(symbol: string): Promise<void> {
  await fetch(`${API_BASE}/market/simulate/stale`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, staleMinutes: null }),
  });
  await fetch(`${API_BASE}/market/simulate/divergence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, divergencePercent: null }),
  });
}

export async function fetchDataSourceStatus(): Promise<any> {
  const res = await fetch(`${API_BASE}/market/data-source-status`);
  if (!res.ok) throw new Error('Failed to fetch data source status');
  return res.json();
}

export async function simulateLiveDataMode(mode: string | null): Promise<any> {
  const res = await fetch(`${API_BASE}/market/simulate/live-data-mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new Error('Failed to set live data mode override');
  return res.json();
}

export async function simulateCorrelationBreak(symbolA = 'INFY', symbolB = 'TCS', spreadShift = 5.2): Promise<any> {
  const res = await fetch(`${API_BASE}/market/simulate/correlation-break`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbolA, symbolB, spreadShift }),
  });
  if (!res.ok) throw new Error('Failed to trigger correlation break');
  return res.json();
}

export async function simulateAiFailure(failed: boolean): Promise<any> {
  const res = await fetch(`${API_BASE}/market/simulate/ai-failure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ failed }),
  });
  if (!res.ok) throw new Error('Failed to set AI failure simulation');
  return res.json();
}

export async function syncLiveData(symbols?: string[]): Promise<any> {
  const res = await fetch(`${API_BASE}/market/sync-live`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols }),
  });
  if (!res.ok) throw new Error('Failed to sync live market quotes');
  return res.json();
}
