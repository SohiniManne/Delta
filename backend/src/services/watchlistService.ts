import fs from 'fs';
import path from 'path';
import { UserWatchlist } from '../types/market.js';

export class WatchlistService {
  private userWatchlists: Map<string, UserWatchlist[]> = new Map();
  private storageFilePath: string;

  constructor() {
    const baseDir = fs.existsSync(path.join(process.cwd(), 'backend'))
      ? path.join(process.cwd(), 'backend')
      : process.cwd();
    this.storageFilePath = path.join(baseDir, 'watchlists_db.json');
    this.loadFromDisk();
    this.seedDefaultWatchlists();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
        const data = JSON.parse(raw);
        for (const [userId, val] of Object.entries(data)) {
          if (Array.isArray(val)) {
            // Check if legacy format (string[]) or new format (UserWatchlist[])
            if (val.length > 0 && typeof val[0] === 'string') {
              // Migrate legacy format
              this.userWatchlists.set(userId, [
                {
                  id: 'wl-tech',
                  userId,
                  name: 'Tech Momentum',
                  symbols: val as string[],
                  createdAt: Date.now() - 86400000,
                  updatedAt: Date.now(),
                },
              ]);
            } else {
              this.userWatchlists.set(userId, val as UserWatchlist[]);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Could not load watchlists from disk:', err);
    }
  }

  private saveToDisk() {
    try {
      const obj = Object.fromEntries(this.userWatchlists.entries());
      fs.writeFileSync(this.storageFilePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to save watchlists to disk:', err);
    }
  }

  public seedUserWatchlists(userId: string) {
    if (!this.userWatchlists.has(userId) || this.userWatchlists.get(userId)!.length === 0) {
      this.userWatchlists.set(userId, [
        {
          id: `wl-tech-${userId}`,
          userId,
          name: 'Tech Momentum',
          symbols: ['TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM'],
          createdAt: Date.now() - 3 * 86400000,
          updatedAt: Date.now(),
        },
        {
          id: `wl-macro-${userId}`,
          userId,
          name: 'Global Macro & Large Cap',
          symbols: ['RELIANCE', 'HDFCBANK', 'ICICIBANK', 'ITC', 'SBIN'],
          createdAt: Date.now() - 86400000,
          updatedAt: Date.now(),
        },
        {
          id: `wl-crypto-${userId}`,
          userId,
          name: 'Digital Assets & Crypto',
          symbols: ['BTC', 'ETH', 'SOL', 'MATIC', 'USDT'],
          createdAt: Date.now() - 2 * 86400000,
          updatedAt: Date.now(),
        },
      ]);
      this.saveToDisk();
    }
  }

  private seedDefaultWatchlists() {
    const users = ['default_user', 'alice_quant', 'bob_macro', 'crypto_whale'];
    for (const userId of users) {
      this.seedUserWatchlists(userId);
    }
  }

  /**
   * Returns all watchlists for a user.
   */
  public getUserWatchlists(userId = 'default_user'): UserWatchlist[] {
    if (!this.userWatchlists.has(userId) || this.userWatchlists.get(userId)!.length === 0) {
      this.seedUserWatchlists(userId);
    }
    return this.userWatchlists.get(userId) || [];
  }

  /**
   * Returns symbols for a given watchlist (or default first watchlist if omitted).
   */
  public getWatchlist(userId = 'default_user', watchlistId?: string): string[] {
    const lists = this.getUserWatchlists(userId);
    if (watchlistId) {
      const target = lists.find((l) => l.id === watchlistId);
      if (target) return target.symbols;
    }
    return lists[0]?.symbols || ['TCS', 'INFY', 'WIPRO', 'RELIANCE', 'HDFCBANK'];
  }

  /**
   * Returns a specific watchlist object.
   */
  public getWatchlistMeta(watchlistId: string, userId = 'default_user'): UserWatchlist | null {
    const lists = this.getUserWatchlists(userId);
    return lists.find((l) => l.id === watchlistId) || null;
  }

  /**
   * Creates a new named watchlist for a user.
   */
  public createWatchlist(name: string, symbols: string[] = ['TCS', 'INFY'], userId = 'default_user'): UserWatchlist {
    const lists = this.getUserWatchlists(userId);
    const cleanName = name.trim() || 'Untitled Watchlist';
    const id = `wl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newWatchlist: UserWatchlist = {
      id,
      userId,
      name: cleanName,
      symbols: symbols.map((s) => s.trim().toUpperCase()),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [...lists, newWatchlist];
    this.userWatchlists.set(userId, updated);
    this.saveToDisk();
    return newWatchlist;
  }

  /**
   * Renames an existing watchlist.
   */
  public renameWatchlist(watchlistId: string, newName: string, userId = 'default_user'): UserWatchlist | null {
    const lists = this.getUserWatchlists(userId);
    const cleanName = newName.trim();
    if (!cleanName) return null;

    let target: UserWatchlist | null = null;
    const updated = lists.map((l) => {
      if (l.id === watchlistId) {
        target = { ...l, name: cleanName, updatedAt: Date.now() };
        return target;
      }
      return l;
    });

    if (target) {
      this.userWatchlists.set(userId, updated);
      this.saveToDisk();
    }
    return target;
  }

  /**
   * Deletes a watchlist. Ensures at least one watchlist remains.
   */
  public deleteWatchlist(watchlistId: string, userId = 'default_user'): { success: boolean; remainingWatchlists: UserWatchlist[]; message?: string } {
    const lists = this.getUserWatchlists(userId);
    if (lists.length <= 1) {
      return { success: false, remainingWatchlists: lists, message: 'Cannot delete the only remaining watchlist.' };
    }

    const updated = lists.filter((l) => l.id !== watchlistId);
    this.userWatchlists.set(userId, updated);
    this.saveToDisk();
    return { success: true, remainingWatchlists: updated };
  }

  /**
   * Adds a symbol to a specific watchlist.
   */
  public addSymbol(
    symbol: string,
    userId = 'default_user',
    watchlistId?: string
  ): { success: boolean; symbols: string[]; message?: string; watchlist?: UserWatchlist } {
    const clean = symbol.trim().toUpperCase();
    if (!clean) return { success: false, symbols: this.getWatchlist(userId, watchlistId), message: 'Invalid symbol' };

    const lists = this.getUserWatchlists(userId);
    const target = watchlistId ? lists.find((l) => l.id === watchlistId) : lists[0];
    if (!target) {
      return { success: false, symbols: [], message: 'Watchlist not found' };
    }

    if (target.symbols.includes(clean)) {
      return { success: false, symbols: target.symbols, message: `${clean} is already in this watchlist` };
    }

    const updatedSymbols = [clean, ...target.symbols];
    target.symbols = updatedSymbols;
    target.updatedAt = Date.now();

    this.userWatchlists.set(userId, lists);
    this.saveToDisk();
    return { success: true, symbols: updatedSymbols, watchlist: target };
  }

  /**
   * Removes a symbol from a specific watchlist.
   */
  public removeSymbol(
    symbol: string,
    userId = 'default_user',
    watchlistId?: string
  ): { success: boolean; symbols: string[]; watchlist?: UserWatchlist } {
    const clean = symbol.trim().toUpperCase();
    const lists = this.getUserWatchlists(userId);
    const target = watchlistId ? lists.find((l) => l.id === watchlistId) : lists[0];
    if (!target) {
      return { success: false, symbols: [] };
    }

    const updatedSymbols = target.symbols.filter((s) => s !== clean);
    target.symbols = updatedSymbols;
    target.updatedAt = Date.now();

    this.userWatchlists.set(userId, lists);
    this.saveToDisk();
    return { success: true, symbols: updatedSymbols, watchlist: target };
  }

  /**
   * Reorders symbols inside a watchlist.
   */
  public reorderSymbols(symbols: string[], userId = 'default_user', watchlistId?: string): string[] {
    const upper = symbols.map((s) => s.trim().toUpperCase());
    const lists = this.getUserWatchlists(userId);
    const target = watchlistId ? lists.find((l) => l.id === watchlistId) : lists[0];
    if (target) {
      target.symbols = upper;
      target.updatedAt = Date.now();
      this.userWatchlists.set(userId, lists);
      this.saveToDisk();
    }
    return upper;
  }
}

export const watchlistService = new WatchlistService();

