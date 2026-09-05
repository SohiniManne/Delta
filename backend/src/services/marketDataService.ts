import {
  TickerState,
  DataSourceConfidence,
  FreshnessLevel,
  ConfidenceLevel,
  CatalystEvent,
  DataSourceStatus,
} from '../types/market.js';
import { INITIAL_MOCK_TICKERS, MockTickerDefinition } from '../data/mockTickers.js';
import { INITIAL_MOCK_CATALYSTS } from '../data/mockCatalysts.js';
import { config } from '../config.js';
import { liveMarketDataService } from './liveMarketDataService.js';

interface TickerInternalRecord {
  definition: MockTickerDefinition;
  primaryPrice: number;
  secondaryPrice: number;
  lastUpdatedTimestamp: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  rsi14: number;
  macd: { value: number; signal: number; histogram: number };
  sparkline: number[];
  isManualStaleOverride?: boolean;
  manualStaleTimestamp?: number;
  isManualDivergenceOverride?: boolean;
  manualDivergencePercent?: number;
}

export class MarketDataService {
  private tickers: Map<string, TickerInternalRecord> = new Map();
  private catalysts: CatalystEvent[] = [...INITIAL_MOCK_CATALYSTS];
  private tickInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeTickers();
    this.startBackgroundSimulation();
  }

  private initializeTickers() {
    const now = Date.now();

    for (const [symbol, def] of Object.entries(INITIAL_MOCK_TICKERS)) {
      const initialPrice = def.initialPrice;
      const open = def.baseOpenPrice;
      const high = Math.max(open, initialPrice) * 1.015;
      const low = Math.min(open, initialPrice) * 0.988;
      const initialVolume = Math.round(def.avgVolume * 0.65);

      // Generate 20-point historical sparkline leading up to current price
      const sparkline: number[] = [];
      let cur = open;
      for (let i = 0; i < 20; i++) {
        const step = (initialPrice - open) / 20;
        const noise = (Math.random() - 0.48) * (initialPrice * def.volatilityFactor * 0.3);
        cur = Math.max(1, cur + step + noise);
        sparkline.push(parseFloat(cur.toFixed(2)));
      }
      sparkline[sparkline.length - 1] = initialPrice;

      // Default close match secondary price (e.g. 0.05% difference initially)
      const secondaryPrice = parseFloat((initialPrice * (1 + (Math.random() - 0.5) * 0.001)).toFixed(2));

      // Calculate initial realistic RSI
      const priceChangePct = ((initialPrice - open) / open) * 100;
      const rsi14 = Math.min(92, Math.max(15, 50 + priceChangePct * 4.5));

      const macdVal = (initialPrice - open) * 0.08;
      const macdSig = macdVal * 0.75;

      this.tickers.set(symbol, {
        definition: def,
        primaryPrice: initialPrice,
        secondaryPrice: secondaryPrice,
        lastUpdatedTimestamp: now,
        open,
        high,
        low,
        volume: initialVolume,
        rsi14: parseFloat(rsi14.toFixed(1)),
        macd: {
          value: parseFloat(macdVal.toFixed(2)),
          signal: parseFloat(macdSig.toFixed(2)),
          histogram: parseFloat((macdVal - macdSig).toFixed(2)),
        },
        sparkline,
      });
    }

    // Set one or two initial test conditions for demo completeness:
    // e.g., AMZN has a small feed divergence test by default, and AMD has a slight delay
    const amzn = this.tickers.get('AMZN');
    if (amzn) {
      amzn.secondaryPrice = parseFloat((amzn.primaryPrice * 1.0045).toFixed(2)); // 0.45% divergence
    }
  }

  private startBackgroundSimulation() {
    // Subtle realistic random walk every 4 seconds
    this.tickInterval = setInterval(() => {
      this.simulateMicroTick();
    }, 4000);
  }

  public simulateMicroTick() {
    const now = Date.now();
    for (const [symbol, record] of this.tickers.entries()) {
      if (record.isManualStaleOverride) continue;

      const def = record.definition;
      const deltaPercent = (Math.random() - 0.49) * def.volatilityFactor * 0.4;
      const newPrice = parseFloat((record.primaryPrice * (1 + deltaPercent / 100)).toFixed(2));

      record.primaryPrice = Math.max(0.1, newPrice);
      record.high = Math.max(record.high, record.primaryPrice);
      record.low = Math.min(record.low, record.primaryPrice);
      record.volume += Math.floor(Math.random() * 8000 + 2000);
      record.lastUpdatedTimestamp = now;

      // Update secondary price with minor organic drift
      if (!record.isManualDivergenceOverride) {
        const drift = (Math.random() - 0.5) * 0.0015;
        record.secondaryPrice = parseFloat((record.primaryPrice * (1 + drift)).toFixed(2));
      } else if (record.manualDivergencePercent !== undefined) {
        record.secondaryPrice = parseFloat((record.primaryPrice * (1 + record.manualDivergencePercent / 100)).toFixed(2));
      }

      // Shift sparkline
      record.sparkline.push(record.primaryPrice);
      if (record.sparkline.length > 25) {
        record.sparkline.shift();
      }

      // Recompute RSI
      const pctFromOpen = ((record.primaryPrice - record.open) / record.open) * 100;
      record.rsi14 = parseFloat(Math.min(95, Math.max(10, 50 + pctFromOpen * 4.2)).toFixed(1));
    }
  }

  // Track active data source status
  private lastDataSourceStatus: DataSourceStatus | null = null;

  public getLastDataSourceStatus(): DataSourceStatus {
    const override = liveMarketDataService.getSimulationOverride();
    const isHours = liveMarketDataService.isNseMarketOpen();
    if (override) {
      const isLive = override === 'LIVE_STREAM';
      const meta = liveMarketDataService.getStatusMetadata(override, isHours);
      return {
        isLive,
        reason: override,
        label: meta.label,
        description: meta.description,
        asOf: Date.now(),
        isMarketHours: isHours,
      };
    }

    if (this.lastDataSourceStatus) return this.lastDataSourceStatus;
    const meta = liveMarketDataService.getStatusMetadata(
      config.liveData.enabled ? (isHours ? 'LIVE_STREAM' : 'MARKET_CLOSED') : 'SYNTHETIC_MODE',
      isHours
    );
    return {
      isLive: config.liveData.enabled && isHours,
      reason: config.liveData.enabled ? (isHours ? 'LIVE_STREAM' : 'MARKET_CLOSED') : 'SYNTHETIC_MODE',
      label: meta.label,
      description: meta.description,
      asOf: Date.now(),
      isMarketHours: isHours,
    };
  }

  public async syncWithLiveData(symbols?: string[]): Promise<DataSourceStatus> {
    const targetSymbols = symbols && symbols.length > 0
      ? symbols
      : Array.from(this.tickers.keys());

    try {
      const { quotes, status } = await liveMarketDataService.fetchLiveQuotes(targetSymbols);
      this.lastDataSourceStatus = status;

      // Apply real market quotes if available
      for (const [sym, q] of Object.entries(quotes)) {
        const record = this.tickers.get(sym.toUpperCase());
        if (record && !record.isManualStaleOverride) {
          record.primaryPrice = q.price;
          record.open = q.open || record.open;
          record.high = Math.max(record.high, q.high || q.price);
          record.low = Math.min(record.low, q.low || q.price);
          record.volume = q.volume || record.volume;
          record.lastUpdatedTimestamp = q.fetchedAt || Date.now();
          record.sparkline.push(q.price);
          if (record.sparkline.length > 25) record.sparkline.shift();
        }
      }

      return status;
    } catch {
      const isHours = liveMarketDataService.isNseMarketOpen();
      const meta = liveMarketDataService.getStatusMetadata('SOURCE_UNAVAILABLE', isHours);
      const fallbackStatus: DataSourceStatus = {
        isLive: false,
        reason: 'SOURCE_UNAVAILABLE',
        label: meta.label,
        description: meta.description,
        asOf: Date.now(),
        isMarketHours: isHours,
      };
      this.lastDataSourceStatus = fallbackStatus;
      return fallbackStatus;
    }
  }

  public getTickerState(symbol: string): TickerState | null {
    const upper = symbol.toUpperCase();
    const record = this.tickers.get(upper);
    if (!record) return null;

    const now = Date.now();
    const effectiveTimestamp = record.isManualStaleOverride && record.manualStaleTimestamp
      ? record.manualStaleTimestamp
      : record.lastUpdatedTimestamp;

    const dataAgeMs = Math.max(0, now - effectiveTimestamp);

    // Determine Freshness Level
    let freshness: FreshnessLevel = 'REALTIME';
    if (dataAgeMs > config.freshness.delayedThresholdMs) {
      freshness = 'STALE';
    } else if (dataAgeMs > config.freshness.realtimeThresholdMs) {
      freshness = 'DELAYED';
    }

    // Determine Divergence and Confidence
    const divergencePercent = parseFloat(
      (Math.abs(record.primaryPrice - record.secondaryPrice) / record.primaryPrice * 100).toFixed(3)
    );
    const isDivergent = divergencePercent >= config.divergence.warningThresholdPercent;

    let confidenceLevel: ConfidenceLevel = 'HIGH';
    if (freshness === 'STALE' || divergencePercent > 1.0) {
      confidenceLevel = 'LOW';
    } else if (freshness === 'DELAYED' || isDivergent) {
      confidenceLevel = 'MEDIUM';
    }

    const currentStatus = this.getLastDataSourceStatus();
    const primaryProvider = currentStatus.isLive
      ? 'National Stock Exchange (NSE Live)'
      : 'Deterministic Synthetic Sim';
    const secondaryProvider = currentStatus.isLive
      ? 'Bombay Stock Exchange (BSE)'
      : 'BSE Parallel Sim';

    const confidence: DataSourceConfidence = {
      level: confidenceLevel,
      isDivergent,
      divergencePercent,
      primaryProvider,
      secondaryProvider,
      asOf: effectiveTimestamp,
      dataSourceReason: currentStatus.reason,
      isLiveData: currentStatus.isLive,
    };

    // Filter catalysts related to this symbol
    const activeCatalysts = this.catalysts.filter((c) => c.symbol === upper);

    return {
      symbol: upper,
      name: record.definition.name,
      price: record.primaryPrice,
      open: record.open,
      high: record.high,
      low: record.low,
      volume: record.volume,
      avgVolume: record.definition.avgVolume,
      peRatio: record.definition.peRatio,
      marketCap: record.definition.marketCap,
      rsi14: record.rsi14,
      macd: record.macd,
      sparkline: [...record.sparkline],
      activeCatalysts,
      freshness,
      dataAgeMs,
      confidence,
    };
  }

  public getAllTickerStates(symbols?: string[]): Record<string, TickerState> {
    const result: Record<string, TickerState> = {};
    const targetSymbols = symbols && symbols.length > 0
      ? symbols
      : Array.from(this.tickers.keys());

    for (const sym of targetSymbols) {
      const state = this.getTickerState(sym);
      if (state) {
        result[sym.toUpperCase()] = state;
      }
    }
    return result;
  }

  public searchTickers(query: string) {
    const q = query.trim().toUpperCase();
    const matches: Array<{ symbol: string; name: string; sector: string; price: number }> = [];

    for (const [symbol, record] of this.tickers.entries()) {
      if (symbol.includes(q) || record.definition.name.toUpperCase().includes(q)) {
        matches.push({
          symbol,
          name: record.definition.name,
          sector: record.definition.sector,
          price: record.primaryPrice,
        });
      }
    }
    return matches;
  }

  // --- Catalyst Ingestion ---
  public addCatalyst(event: Omit<CatalystEvent, 'id' | 'timestamp'> & { id?: string; timestamp?: number }): CatalystEvent {
    const newEvent: CatalystEvent = {
      id: event.id || `cat-${event.symbol.toLowerCase()}-${Date.now()}`,
      timestamp: event.timestamp || Date.now(),
      symbol: event.symbol.toUpperCase(),
      headline: event.headline,
      source: event.source,
      impact: event.impact,
      summary: event.summary,
      category: event.category || 'GENERAL',
    };
    this.catalysts.unshift(newEvent);

    // Apply immediate catalyst price surge or drop
    const record = this.tickers.get(newEvent.symbol);
    if (record) {
      let bumpPercent = 0;
      if (newEvent.impact === 'BULLISH') bumpPercent = 2.5 + Math.random() * 2.5;
      else if (newEvent.impact === 'BEARISH') bumpPercent = -(2.5 + Math.random() * 2.5);

      record.primaryPrice = parseFloat((record.primaryPrice * (1 + bumpPercent / 100)).toFixed(2));
      record.secondaryPrice = parseFloat((record.primaryPrice * (1 + (Math.random() - 0.5) * 0.002)).toFixed(2));
      record.high = Math.max(record.high, record.primaryPrice);
      record.low = Math.min(record.low, record.primaryPrice);
      record.volume += Math.floor(record.definition.avgVolume * 0.15);
      record.sparkline.push(record.primaryPrice);
      record.lastUpdatedTimestamp = Date.now();
    }

    return newEvent;
  }

  public getCatalysts(symbol?: string, sinceTimestamp?: number): CatalystEvent[] {
    return this.catalysts.filter((c) => {
      const symbolMatch = !symbol || c.symbol === symbol.toUpperCase();
      const timeMatch = !sinceTimestamp || c.timestamp >= sinceTimestamp;
      return symbolMatch && timeMatch;
    });
  }

  // --- Interactive Hackathon Simulation & Chaos Tools ---
  public setStalenessOverride(symbol: string, staleAgeMinutes: number | null) {
    const record = this.tickers.get(symbol.toUpperCase());
    if (!record) return false;

    if (staleAgeMinutes === null) {
      record.isManualStaleOverride = false;
      record.manualStaleTimestamp = undefined;
      record.lastUpdatedTimestamp = Date.now();
    } else {
      record.isManualStaleOverride = true;
      record.manualStaleTimestamp = Date.now() - staleAgeMinutes * 60 * 1000;
    }
    return true;
  }

  public setDivergenceOverride(symbol: string, divergencePercent: number | null) {
    const record = this.tickers.get(symbol.toUpperCase());
    if (!record) return false;

    if (divergencePercent === null) {
      record.isManualDivergenceOverride = false;
      record.manualDivergencePercent = undefined;
      record.secondaryPrice = record.primaryPrice;
    } else {
      record.isManualDivergenceOverride = true;
      record.manualDivergencePercent = divergencePercent;
      record.secondaryPrice = parseFloat((record.primaryPrice * (1 + divergencePercent / 100)).toFixed(2));
    }
    return true;
  }

  public triggerPriceShock(symbol: string, percentShift: number) {
    const record = this.tickers.get(symbol.toUpperCase());
    if (!record) return null;

    record.primaryPrice = parseFloat((record.primaryPrice * (1 + percentShift / 100)).toFixed(2));
    record.secondaryPrice = parseFloat((record.primaryPrice * 1.001).toFixed(2));
    record.high = Math.max(record.high, record.primaryPrice);
    record.low = Math.min(record.low, record.primaryPrice);
    record.sparkline.push(record.primaryPrice);
    if (record.sparkline.length > 25) record.sparkline.shift();
    record.lastUpdatedTimestamp = Date.now();
    return this.getTickerState(symbol);
  }

  public triggerCorrelationBreak(symbolA = 'INFY', symbolB = 'TCS', spreadShift = 5.2) {
    const recA = this.tickers.get(symbolA.toUpperCase());
    const recB = this.tickers.get(symbolB.toUpperCase());
    if (!recA || !recB) return null;

    // Apply asymmetric movement: symbolA advances +spreadShift%, symbolB stays flat / slight dip
    recA.primaryPrice = parseFloat((recA.primaryPrice * (1 + spreadShift / 100)).toFixed(2));
    recA.high = Math.max(recA.high, recA.primaryPrice);
    recA.volume += Math.floor(recA.definition.avgVolume * 0.4);
    recA.sparkline.push(recA.primaryPrice);
    recA.lastUpdatedTimestamp = Date.now();

    recB.primaryPrice = parseFloat((recB.primaryPrice * 0.998).toFixed(2));
    recB.sparkline.push(recB.primaryPrice);
    recB.lastUpdatedTimestamp = Date.now();

    return {
      tickerA: this.getTickerState(symbolA),
      tickerB: this.getTickerState(symbolB),
    };
  }

  public resetAllOverrides() {
    liveMarketDataService.setSimulationOverride(null);
    for (const record of this.tickers.values()) {
      record.isManualStaleOverride = false;
      record.manualStaleTimestamp = undefined;
      record.isManualDivergenceOverride = false;
      record.manualDivergencePercent = undefined;
      record.lastUpdatedTimestamp = Date.now();
      record.secondaryPrice = record.primaryPrice;
    }
  }
}

export const marketDataService = new MarketDataService();
