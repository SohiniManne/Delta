import {
  WatchlistDiffReport,
  TickerState,
  SearchResult,
} from '../types';

const API_BASE = '/api';

export async function fetchWatchlist(userId = 'default_user'): Promise<{
  userId: string;
  symbols: string[];
  tickers: Record<string, TickerState>;
  updatedAt: number;
}> {
  const res = await fetch(`${API_BASE}/watchlist?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('Failed to fetch watchlist');
  return res.json();
}

export async function addWatchlistSymbol(symbol: string, userId = 'default_user'): Promise<{
  userId: string;
  symbols: string[];
  tickers: Record<string, TickerState>;
}> {
  const res = await fetch(`${API_BASE}/watchlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol, userId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add symbol');
  }
  return res.json();
}

export async function removeWatchlistSymbol(symbol: string, userId = 'default_user'): Promise<{
  userId: string;
  symbols: string[];
  tickers: Record<string, TickerState>;
}> {
  const res = await fetch(`${API_BASE}/watchlist/${symbol}?userId=${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to remove symbol');
  return res.json();
}

export async function fetchLastSeenDiff(userId = 'default_user'): Promise<WatchlistDiffReport> {
  const res = await fetch(`${API_BASE}/diff/last-seen?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('Failed to compute diff report');
  return res.json();
}

export async function fetchCompareDiff(baseId: string, userId = 'default_user'): Promise<WatchlistDiffReport> {
  const res = await fetch(`${API_BASE}/diff/compare?baseId=${encodeURIComponent(baseId)}&userId=${encodeURIComponent(userId)}`);
  if (!res.ok) throw new Error('Failed to compute comparison diff report');
  return res.json();
}

export async function acknowledgeDiff(userId = 'default_user'): Promise<{
  message: string;
  report: WatchlistDiffReport;
}> {
  const res = await fetch(`${API_BASE}/diff/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error('Failed to commit/acknowledge snapshot');
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
