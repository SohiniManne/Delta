import {
  WatchlistSnapshot,
  TickerState,
  BaselineType,
} from '../types/market.js';
import { marketDataService } from './marketDataService.js';
import { INITIAL_MOCK_TICKERS } from '../data/mockTickers.js';
import fs from 'fs';
import path from 'path';

export class SnapshotService {
  private snapshots: Map<string, WatchlistSnapshot> = new Map();
  private userLastSeenMap: Map<string, string> = new Map(); // userId -> snapshotId
  private storageFilePath: string;

  constructor() {
    this.storageFilePath = path.join(process.cwd(), 'snapshots_db.json');
    this.loadFromDisk();
    this.seedDefaultHistoricalCheckpoints();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.snapshots)) {
          for (const s of data.snapshots) {
            this.snapshots.set(s.id, s);
          }
        }
        if (data.userLastSeen) {
          for (const [uid, sid] of Object.entries(data.userLastSeen)) {
            this.userLastSeenMap.set(uid, sid as string);
          }
        }
      }
    } catch (err) {
      console.warn('Could not load snapshots from disk, starting fresh:', err);
    }
  }

  private saveToDisk() {
    try {
      const data = {
        snapshots: Array.from(this.snapshots.values()),
        userLastSeen: Object.fromEntries(this.userLastSeenMap.entries()),
      };
      fs.writeFileSync(this.storageFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to save snapshots to disk:', err);
    }
  }

  private seedDefaultHistoricalCheckpoints() {
    // Only seed if snapshots are empty
    if (this.snapshots.size > 0) return;

    const now = Date.now();
    const fourHoursAgo = now - 4 * 60 * 60 * 1000;
    const yesterdayClose = now - 24 * 60 * 60 * 1000;

    // 1. Yesterday Close Checkpoint
    const yTickers: Record<string, TickerState> = {};
    for (const [sym, def] of Object.entries(INITIAL_MOCK_TICKERS)) {
      const p = parseFloat((def.baseOpenPrice * 0.985).toFixed(2));
      yTickers[sym] = {
        symbol: sym,
        name: def.name,
        price: p,
        open: p,
        high: p * 1.01,
        low: p * 0.99,
        volume: def.avgVolume,
        avgVolume: def.avgVolume,
        peRatio: def.peRatio,
        marketCap: def.marketCap,
        rsi14: 48.0,
        macd: { value: 0, signal: 0, histogram: 0 },
        sparkline: [p, p, p],
        activeCatalysts: [],
        freshness: 'REALTIME',
        dataAgeMs: 0,
        confidence: {
          level: 'HIGH',
          isDivergent: false,
          primaryProvider: 'NYSE / NASDAQ EOD Final',
          asOf: yesterdayClose,
        },
      };
    }

    const ySnapshot: WatchlistSnapshot = {
      id: 'snap-yesterday-close',
      userId: 'default_user',
      name: "Yesterday's Market Close (04:00 PM)",
      timestamp: yesterdayClose,
      baselineType: 'PREVIOUS_CLOSE',
      tickers: yTickers,
    };
    this.snapshots.set(ySnapshot.id, ySnapshot);

    // 2. Pre-Session Checkpoint (4 Hours Ago)
    const midTickers: Record<string, TickerState> = {};
    for (const [sym, def] of Object.entries(INITIAL_MOCK_TICKERS)) {
      const p = parseFloat((def.baseOpenPrice * 1.008).toFixed(2));
      midTickers[sym] = {
        symbol: sym,
        name: def.name,
        price: p,
        open: def.baseOpenPrice,
        high: p * 1.012,
        low: def.baseOpenPrice * 0.995,
        volume: Math.round(def.avgVolume * 0.4),
        avgVolume: def.avgVolume,
        peRatio: def.peRatio,
        marketCap: def.marketCap,
        rsi14: 53.5,
        macd: { value: 0.4, signal: 0.3, histogram: 0.1 },
        sparkline: [def.baseOpenPrice, p],
        activeCatalysts: [],
        freshness: 'REALTIME',
        dataAgeMs: 0,
        confidence: {
          level: 'HIGH',
          isDivergent: false,
          primaryProvider: 'Finnhub Market Stream',
          asOf: fourHoursAgo,
        },
      };
    }

    const midSnapshot: WatchlistSnapshot = {
      id: 'snap-midday-4h',
      userId: 'default_user',
      name: 'Mid-Morning Checkpoint (4h ago)',
      timestamp: fourHoursAgo,
      baselineType: 'USER_COMMIT',
      tickers: midTickers,
    };
    this.snapshots.set(midSnapshot.id, midSnapshot);

    // Save
    this.saveToDisk();
  }

  /**
   * Explicit Cold-Start Handler:
   * When a user has never committed a snapshot, synthesize either:
   * - "Today's Market Open (09:30 AM)" if regular trading hours
   * - "Previous Day Close (04:00 PM)" if pre-market (before 09:30 AM EST)
   */
  public getSyntheticColdStartBaseline(
    symbols: string[],
    userId = 'default_user',
    forceBaseline?: 'TODAY_OPEN' | 'PREVIOUS_CLOSE'
  ): WatchlistSnapshot {
    const now = new Date();
    // Check if pre-market (before 9:30 AM)
    const isPreMarket = forceBaseline === 'PREVIOUS_CLOSE' || (
      forceBaseline === undefined && (now.getHours() < 9 || (now.getHours() === 9 && now.getMinutes() < 30))
    );

    const baselineType: BaselineType = isPreMarket ? 'PREVIOUS_CLOSE' : 'TODAY_OPEN';

    let timestamp: number;
    let name: string;

    if (baselineType === 'PREVIOUS_CLOSE') {
      const prevCloseTime = new Date();
      prevCloseTime.setDate(prevCloseTime.getDate() - 1);
      prevCloseTime.setHours(16, 0, 0, 0);
      timestamp = prevCloseTime.getTime();
      name = "Previous Day Close (04:00 PM)";
    } else {
      const openTime = new Date();
      openTime.setHours(9, 30, 0, 0);
      timestamp = openTime.getTime() > Date.now() ? Date.now() - 3 * 3600 * 1000 : openTime.getTime();
      name = "Today's Market Open (09:30 AM)";
    }

    const tickers: Record<string, TickerState> = {};

    for (const sym of symbols) {
      const upper = sym.toUpperCase();
      const currentLive = marketDataService.getTickerState(upper);
      const def = INITIAL_MOCK_TICKERS[upper];

      let basePrice: number;
      if (baselineType === 'PREVIOUS_CLOSE') {
        basePrice = def ? parseFloat((def.baseOpenPrice * 0.985).toFixed(2)) : (currentLive ? currentLive.open : 100.00);
      } else {
        basePrice = currentLive ? currentLive.open : (def ? def.baseOpenPrice : 100.00);
      }

      const tickerName = currentLive ? currentLive.name : (def ? def.name : upper);
      const avgVol = currentLive ? currentLive.avgVolume : (def ? def.avgVolume : 20000000);

      tickers[upper] = {
        symbol: upper,
        name: tickerName,
        price: basePrice,
        open: basePrice,
        high: basePrice,
        low: basePrice,
        volume: Math.round(avgVol * (baselineType === 'PREVIOUS_CLOSE' ? 1.0 : 0.12)),
        avgVolume: avgVol,
        peRatio: def?.peRatio,
        marketCap: def?.marketCap || 1000000000,
        rsi14: 50.0,
        macd: { value: 0, signal: 0, histogram: 0 },
        sparkline: [basePrice, basePrice],
        activeCatalysts: [],
        freshness: 'REALTIME',
        dataAgeMs: 0,
        confidence: {
          level: 'HIGH',
          isDivergent: false,
          primaryProvider: baselineType === 'PREVIOUS_CLOSE' ? 'NYSE / NASDAQ EOD Official' : 'Official Exchange Opening Auction',
          asOf: timestamp,
        },
      };
    }

    return {
      id: `snap-synthetic-${baselineType.toLowerCase()}-${timestamp}`,
      userId,
      name,
      timestamp,
      isSyntheticColdStart: true,
      baselineType,
      tickers,
    };
  }

  /**
   * Retrieve the base snapshot for a user.
   * If user has a last-seen snapshot, returns it.
   * If cold-start (no last-seen), returns synthesized Market Open baseline.
   */
  public getLastSeenOrColdStartBaseline(symbols: string[], userId = 'default_user'): {
    snapshot: WatchlistSnapshot;
    isColdStart: boolean;
  } {
    const lastSeenId = this.userLastSeenMap.get(userId);
    if (lastSeenId && this.snapshots.has(lastSeenId)) {
      const found = this.snapshots.get(lastSeenId)!;
      // Ensure all current watchlist symbols are represented in snapshot
      const enhancedTickers = { ...found.tickers };
      let updated = false;

      for (const sym of symbols) {
        if (!enhancedTickers[sym]) {
          const live = marketDataService.getTickerState(sym);
          if (live) {
            enhancedTickers[sym] = { ...live, price: live.open };
            updated = true;
          }
        }
      }

      const snapshotToReturn = updated ? { ...found, tickers: enhancedTickers } : found;
      return {
        snapshot: snapshotToReturn,
        isColdStart: false,
      };
    }

    // Cold-start fallback!
    const synthetic = this.getSyntheticColdStartBaseline(symbols, userId);
    return {
      snapshot: synthetic,
      isColdStart: true,
    };
  }

  /**
   * Commit current live market state as a new checkpoint.
   */
  public commitSnapshot(
    symbols: string[],
    name?: string,
    baselineType: BaselineType = 'USER_COMMIT',
    userId = 'default_user'
  ): WatchlistSnapshot {
    const now = Date.now();
    const liveStates = marketDataService.getAllTickerStates(symbols);
    const snapshotId = `snap-${now}-${Math.random().toString(36).substring(2, 7)}`;

    const customName = name?.trim() || `Saved Checkpoint (${new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;

    const snapshot: WatchlistSnapshot = {
      id: snapshotId,
      userId,
      name: customName,
      timestamp: now,
      baselineType,
      tickers: liveStates,
      isSyntheticColdStart: false,
    };

    this.snapshots.set(snapshotId, snapshot);
    this.userLastSeenMap.set(userId, snapshotId);
    this.saveToDisk();

    return snapshot;
  }

  /**
   * Acknowledge / Mark as Seen: Updates user's last-seen snapshot to a new live snapshot
   */
  public acknowledgeCurrentState(symbols: string[], userId = 'default_user'): WatchlistSnapshot {
    return this.commitSnapshot(symbols, 'Acknowledged Checkpoint', 'USER_COMMIT', userId);
  }

  public getSnapshotById(id: string): WatchlistSnapshot | null {
    return this.snapshots.get(id) || null;
  }

  public listSnapshots(userId = 'default_user'): Array<Omit<WatchlistSnapshot, 'tickers'> & { tickerCount: number }> {
    const list: Array<Omit<WatchlistSnapshot, 'tickers'> & { tickerCount: number }> = [];

    for (const snap of this.snapshots.values()) {
      if (snap.userId === userId || snap.userId === 'default_user') {
        list.push({
          id: snap.id,
          userId: snap.userId,
          name: snap.name,
          timestamp: snap.timestamp,
          baselineType: snap.baselineType,
          isSyntheticColdStart: snap.isSyntheticColdStart,
          tickerCount: Object.keys(snap.tickers).length,
        });
      }
    }

    // Sort descending by timestamp
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }

  public deleteSnapshot(id: string, userId = 'default_user'): boolean {
    const snap = this.snapshots.get(id);
    if (!snap) return false;

    this.snapshots.delete(id);
    if (this.userLastSeenMap.get(userId) === id) {
      this.userLastSeenMap.delete(userId);
    }
    this.saveToDisk();
    return true;
  }
}

export const snapshotService = new SnapshotService();
