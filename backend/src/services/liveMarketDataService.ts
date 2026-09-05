import yahooFinance from 'yahoo-finance2';
import { config } from '../config.js';
import { DataSourceReason, DataSourceStatus } from '../types/market.js';

export interface LiveQuoteResult {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  changePercent: number;
  fetchedAt: number;
}

export class LiveMarketDataService {
  private simulationOverride: DataSourceReason | null = null;

  /**
   * Set simulation override mode for testing fallback states in live demo.
   */
  public setSimulationOverride(override: DataSourceReason | null) {
    this.simulationOverride = override;
  }

  public getSimulationOverride(): DataSourceReason | null {
    return this.simulationOverride;
  }

  /**
   * Map internal symbol to Yahoo Finance ticker.
   * Indian equities require '.NS' suffix; Crypto requires '-INR' suffix.
   */
  public mapToYahooSymbol(symbol: string): string {
    const s = symbol.toUpperCase().trim();
    if (s === 'BTC' || s === 'BTCUSD') return 'BTC-INR';
    if (s === 'ETH' || s === 'ETHUSD') return 'ETH-INR';
    if (s === 'SOL' || s === 'SOLUSD') return 'SOL-INR';
    if (s === 'MATIC' || s === 'MATICUSD') return 'MATIC-INR';
    if (s.includes('.') || s.includes('-')) return s;
    return `${s}.NS`;
  }

  /**
   * Check if National Stock Exchange (NSE) is currently in open market hours.
   * NSE Market Hours: Monday to Friday, 09:15 AM to 03:30 PM IST (UTC+05:30).
   */
  public isNseMarketOpen(now = new Date()): boolean {
    // Convert to IST (UTC + 5 hours 30 minutes)
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const istTime = new Date(utcTime + 5.5 * 3600000);

    const day = istTime.getDay(); // 0 = Sun, 6 = Sat
    if (day === 0 || day === 6) return false;

    const hour = istTime.getHours();
    const minute = istTime.getMinutes();
    const totalMinutes = hour * 60 + minute;

    // 09:15 AM is 9 * 60 + 15 = 555 minutes
    // 03:30 PM is 15 * 60 + 30 = 930 minutes
    return totalMinutes >= 555 && totalMinutes <= 930;
  }

  /**
   * Generate human-readable label and description for a DataSourceReason.
   */
  public getStatusMetadata(reason: DataSourceReason, isMarketHours: boolean): { label: string; description: string } {
    switch (reason) {
      case 'LIVE_STREAM':
        return {
          label: 'Live Market Data (NSE Feed)',
          description: 'Connected to real-time live quotes via National Stock Exchange of India feed.',
        };
      case 'MARKET_CLOSED':
        return {
          label: 'Simulated (Market Closed)',
          description: 'NSE Indian equity markets are closed (Trading Hours: 09:15-15:30 IST Mon-Fri). High-frequency synthetic simulation active.',
        };
      case 'RATE_LIMITED':
        return {
          label: 'Simulated (Rate Limited)',
          description: 'Upstream rate limit threshold reached (HTTP 429). Transparent failover to deterministic simulation engine.',
        };
      case 'TIMEOUT':
        return {
          label: 'Simulated (Feed Timeout)',
          description: 'Live quote request exceeded 3,000ms latency threshold. Fast fallback to simulation engine preserving UI responsiveness.',
        };
      case 'SOURCE_UNAVAILABLE':
        return {
          label: 'Simulated (Provider Offline)',
          description: 'Upstream market provider unavailable. Fallback engine running with zero UI disruption.',
        };
      case 'SYNTHETIC_MODE':
      default:
        return {
          label: 'Deterministic Simulator',
          description: 'High-frequency deterministic market simulation active for offline resilience.',
        };
    }
  }

  /**
   * Attempt to fetch real market quotes with transparent fallback status determination.
   */
  public async fetchLiveQuotes(
    symbols: string[]
  ): Promise<{ quotes: Record<string, LiveQuoteResult>; status: DataSourceStatus }> {
    const isMarketHours = this.isNseMarketOpen();
    const now = Date.now();

    // Check for user-forced simulation override
    if (this.simulationOverride) {
      const isLive = this.simulationOverride === 'LIVE_STREAM';
      const meta = this.getStatusMetadata(this.simulationOverride, isMarketHours);
      return {
        quotes: {},
        status: {
          isLive,
          reason: this.simulationOverride,
          label: meta.label,
          description: meta.description,
          asOf: now,
          isMarketHours,
        },
      };
    }

    // If live market data is disabled in configuration
    if (!config.liveData.enabled) {
      const meta = this.getStatusMetadata('SYNTHETIC_MODE', isMarketHours);
      return {
        quotes: {},
        status: {
          isLive: false,
          reason: 'SYNTHETIC_MODE',
          label: meta.label,
          description: meta.description,
          asOf: now,
          isMarketHours,
        },
      };
    }

    // Check if non-crypto symbols are requested outside market hours
    const hasCryptoOnly = symbols.every((s) => ['BTC', 'ETH', 'SOL', 'MATIC'].includes(s.toUpperCase()));
    if (!isMarketHours && !hasCryptoOnly) {
      const meta = this.getStatusMetadata('MARKET_CLOSED', isMarketHours);
      return {
        quotes: {},
        status: {
          isLive: false,
          reason: 'MARKET_CLOSED',
          label: meta.label,
          description: meta.description,
          asOf: now,
          isMarketHours,
        },
      };
    }

    // Attempt real fetch with strict timeout
    try {
      const timeoutMs = config.liveData.timeoutMs || 3000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), timeoutMs)
      );

      const fetchPromise = async (): Promise<Record<string, LiveQuoteResult>> => {
        const results: Record<string, LiveQuoteResult> = {};
        const fetchPromises = symbols.map(async (symbol) => {
          const ySymbol = this.mapToYahooSymbol(symbol);
          try {
            const q: any = await (yahooFinance as any).quote(ySymbol);
            if (q && q.regularMarketPrice !== undefined) {
              results[symbol] = {
                symbol,
                price: q.regularMarketPrice,
                open: q.regularMarketOpen ?? q.regularMarketPrice,
                high: q.regularMarketDayHigh ?? q.regularMarketPrice,
                low: q.regularMarketDayLow ?? q.regularMarketPrice,
                volume: q.regularMarketVolume ?? 100000,
                changePercent: q.regularMarketChangePercent ?? 0,
                fetchedAt: Date.now(),
              };
            }
          } catch (err: any) {
            // Check for 429
            if (err?.message?.includes('429') || err?.status === 429) {
              throw new Error('RATE_LIMITED');
            }
            // Swallow individual symbol error
          }
        });

        await Promise.all(fetchPromises);
        return results;
      };

      const quotes: Record<string, LiveQuoteResult> = await Promise.race([fetchPromise(), timeoutPromise]);
      const fetchedCount = Object.keys(quotes).length;

      if (fetchedCount > 0) {
        const meta = this.getStatusMetadata('LIVE_STREAM', isMarketHours);
        return {
          quotes,
          status: {
            isLive: true,
            reason: 'LIVE_STREAM',
            label: meta.label,
            description: meta.description,
            asOf: now,
            isMarketHours,
          },
        };
      } else {
        const meta = this.getStatusMetadata('SOURCE_UNAVAILABLE', isMarketHours);
        return {
          quotes: {},
          status: {
            isLive: false,
            reason: 'SOURCE_UNAVAILABLE',
            label: meta.label,
            description: meta.description,
            asOf: now,
            isMarketHours,
          },
        };
      }
    } catch (err: any) {
      let reason: DataSourceReason = 'SOURCE_UNAVAILABLE';
      if (err?.message === 'TIMEOUT_EXCEEDED') {
        reason = 'TIMEOUT';
      } else if (err?.message === 'RATE_LIMITED' || err?.message?.includes('429')) {
        reason = 'RATE_LIMITED';
      }

      const meta = this.getStatusMetadata(reason, isMarketHours);
      return {
        quotes: {},
        status: {
          isLive: false,
          reason,
          label: meta.label,
          description: meta.description,
          asOf: now,
          isMarketHours,
        },
      };
    }
  }
}

export const liveMarketDataService = new LiveMarketDataService();
