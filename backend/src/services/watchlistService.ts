import fs from 'fs';
import path from 'path';

export class WatchlistService {
  private userWatchlists: Map<string, string[]> = new Map();
  private storageFilePath: string;

  constructor() {
    this.storageFilePath = path.join(process.cwd(), 'watchlists_db.json');
    this.loadFromDisk();
    this.seedDefaultWatchlist();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
        const data = JSON.parse(raw);
        for (const [userId, symbols] of Object.entries(data)) {
          if (Array.isArray(symbols)) {
            this.userWatchlists.set(userId, symbols as string[]);
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

  private seedDefaultWatchlist() {
    if (!this.userWatchlists.has('default_user')) {
      this.userWatchlists.set('default_user', [
        'NVDA',
        'AAPL',
        'TSLA',
        'BTC',
        'MSFT',
        'AMD',
        'PLTR',
        'AMZN',
      ]);
      this.saveToDisk();
    }
  }

  public getWatchlist(userId = 'default_user'): string[] {
    return this.userWatchlists.get(userId) || ['NVDA', 'AAPL', 'TSLA', 'BTC', 'MSFT'];
  }

  public addSymbol(symbol: string, userId = 'default_user'): { success: boolean; symbols: string[]; message?: string } {
    const clean = symbol.trim().toUpperCase();
    if (!clean) return { success: false, symbols: this.getWatchlist(userId), message: 'Invalid symbol' };

    const current = this.getWatchlist(userId);
    if (current.includes(clean)) {
      return { success: false, symbols: current, message: `${clean} is already in your watchlist` };
    }

    const updated = [clean, ...current];
    this.userWatchlists.set(userId, updated);
    this.saveToDisk();
    return { success: true, symbols: updated };
  }

  public removeSymbol(symbol: string, userId = 'default_user'): { success: boolean; symbols: string[] } {
    const clean = symbol.trim().toUpperCase();
    const current = this.getWatchlist(userId);
    const updated = current.filter((s) => s !== clean);

    this.userWatchlists.set(userId, updated);
    this.saveToDisk();
    return { success: true, symbols: updated };
  }

  public reorderSymbols(symbols: string[], userId = 'default_user'): string[] {
    const upper = symbols.map((s) => s.trim().toUpperCase());
    this.userWatchlists.set(userId, upper);
    this.saveToDisk();
    return upper;
  }
}

export const watchlistService = new WatchlistService();
