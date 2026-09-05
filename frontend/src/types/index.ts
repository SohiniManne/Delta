export type FreshnessLevel = 'REALTIME' | 'DELAYED' | 'STALE';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type CatalystImpact = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type DiffSeverity = 'CRITICAL' | 'MODERATE' | 'LOW' | 'UNCHANGED';
export type BaselineType = 'USER_COMMIT' | 'AUTO_SESSION' | 'TODAY_OPEN' | 'PREVIOUS_CLOSE';

export type DataSourceReason =
  | 'LIVE_STREAM'
  | 'MARKET_CLOSED'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'SOURCE_UNAVAILABLE'
  | 'SYNTHETIC_MODE';

export interface DataSourceStatus {
  isLive: boolean;
  reason: DataSourceReason;
  label: string;
  description: string;
  asOf: number;
  isMarketHours: boolean;
}

export interface DataSourceConfidence {
  level: ConfidenceLevel;
  isDivergent: boolean;
  divergencePercent?: number;
  primaryProvider: string;
  secondaryProvider?: string;
  asOf: number;
  dataSourceReason?: DataSourceReason;
  isLiveData?: boolean;
}

export interface CatalystEvent {
  id: string;
  symbol: string;
  timestamp: number;
  headline: string;
  source: string;
  impact: CatalystImpact;
  summary: string;
  category: 'EARNINGS' | 'MACRO' | 'PRODUCT' | 'ANALYST' | 'LEGAL' | 'GENERAL';
}

export interface CorrelationBreakEvent {
  id: string;
  tickerA: string;
  tickerB: string;
  nameA: string;
  nameB: string;
  historicalCorrelation: number; // e.g. 0.88
  deltaA: number; // e.g. +5.20%
  deltaB: number; // e.g. -0.10%
  spreadPercent: number; // e.g. 5.30%
  severity: 'CRITICAL' | 'MODERATE';
  headline: string;
  summary: string;
  timestamp: number;
}

export interface TickerState {
  symbol: string;
  name: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  avgVolume: number;
  peRatio?: number;
  marketCap: number;
  rsi14: number;
  macd: { value: number; signal: number; histogram: number };
  sparkline: number[];
  activeCatalysts: CatalystEvent[];
  freshness: FreshnessLevel;
  dataAgeMs: number;
  confidence: DataSourceConfidence;
}

export interface UserWatchlist {
  id: string;
  userId: string;
  name: string;
  symbols: string[];
  createdAt: number;
  updatedAt: number;
}

export interface WatchlistSnapshot {
  id: string;
  userId: string;
  watchlistId?: string;
  name: string;
  timestamp: number;
  isSyntheticColdStart?: boolean;
  baselineType: BaselineType;
  tickers: Record<string, TickerState>;
}

export interface TickerDiff {
  symbol: string;
  name: string;
  basePrice: number;
  targetPrice: number;
  priceDelta: number;
  percentDelta: number;
  volumeRatio: number;
  indicatorShifts: {
    rsiChange: number;
    rsiStatus: 'NORMAL' | 'OVERBOUGHT_ENTERED' | 'OVERSOLD_ENTERED';
    macdCross: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NONE';
  };
  newCatalysts: CatalystEvent[];
  priorityScore: number;
  severity: DiffSeverity;
  keyTakeaway: string;
  isAiNarrated?: boolean;
  templatedTakeaway?: string;
  correlationBreak?: CorrelationBreakEvent;
  targetFreshness: FreshnessLevel;
  dataAgeMs: number;
  confidence: DataSourceConfidence;
  isDegraded: boolean;
  confidenceNote?: string;
  sparkline: number[];
}

export interface WatchlistDiffReport {
  baseSnapshot: {
    id: string;
    name: string;
    timestamp: number;
    baselineType: BaselineType;
    isSyntheticColdStart: boolean;
  };
  targetSnapshot: {
    id: string;
    name: string;
    timestamp: number;
  };
  portfolioDeltaPercent: number;
  topGainer: TickerDiff | null;
  topLoser: TickerDiff | null;
  mostActive: TickerDiff | null;
  diffs: TickerDiff[];
  totalNewCatalysts: number;
  correlationBreaks?: CorrelationBreakEvent[];
  generatedAt: number;
  coldStart: {
    isColdStart: boolean;
    message?: string;
    fallbackBaselineUsed: 'TODAY_OPEN' | 'PREVIOUS_CLOSE' | 'NONE';
  };
  dataQualitySummary: {
    staleCount: number;
    divergenceCount: number;
    overallConfidence: ConfidenceLevel | 'DEGRADED';
  };
  dataSourceStatus?: DataSourceStatus;
}

export interface SearchResult {
  symbol: string;
  name: string;
  sector: string;
  price: number;
}
