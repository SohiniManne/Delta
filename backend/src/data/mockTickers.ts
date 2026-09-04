export interface MockTickerDefinition {
  symbol: string;
  name: string;
  baseOpenPrice: number; // Today's market open price (used for cold-start baseline)
  initialPrice: number;
  avgVolume: number;
  peRatio?: number;
  marketCap: number;
  sector: string;
  volatilityFactor: number;
}

export const INITIAL_MOCK_TICKERS: Record<string, MockTickerDefinition> = {
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    baseOpenPrice: 124.50,
    initialPrice: 129.80,
    avgVolume: 48500000,
    peRatio: 52.4,
    marketCap: 3180000000000,
    sector: 'Semiconductors',
    volatilityFactor: 0.025,
  },
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    baseOpenPrice: 228.10,
    initialPrice: 231.40,
    avgVolume: 54000000,
    peRatio: 34.1,
    marketCap: 3520000000000,
    sector: 'Consumer Electronics',
    volatilityFactor: 0.012,
  },
  TSLA: {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    baseOpenPrice: 218.00,
    initialPrice: 212.30,
    avgVolume: 62000000,
    peRatio: 64.8,
    marketCap: 678000000000,
    sector: 'Automotive / Clean Tech',
    volatilityFactor: 0.038,
  },
  MSFT: {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    baseOpenPrice: 442.00,
    initialPrice: 446.85,
    avgVolume: 21000000,
    peRatio: 36.5,
    marketCap: 3320000000000,
    sector: 'Cloud & Software',
    volatilityFactor: 0.011,
  },
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin (USD)',
    baseOpenPrice: 58200.00,
    initialPrice: 61450.00,
    avgVolume: 28000000000,
    marketCap: 1210000000000,
    sector: 'Crypto / Digital Asset',
    volatilityFactor: 0.045,
  },
  AMD: {
    symbol: 'AMD',
    name: 'Advanced Micro Devices',
    baseOpenPrice: 148.20,
    initialPrice: 154.60,
    avgVolume: 38000000,
    peRatio: 42.1,
    marketCap: 250000000000,
    sector: 'Semiconductors',
    volatilityFactor: 0.028,
  },
  AMZN: {
    symbol: 'AMZN',
    name: 'Amazon.com, Inc.',
    baseOpenPrice: 178.50,
    initialPrice: 177.20,
    avgVolume: 35000000,
    peRatio: 41.2,
    marketCap: 1850000000000,
    sector: 'E-Commerce / Cloud',
    volatilityFactor: 0.015,
  },
  GOOGL: {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    baseOpenPrice: 165.30,
    initialPrice: 167.90,
    avgVolume: 26000000,
    peRatio: 24.2,
    marketCap: 2090000000000,
    sector: 'Internet / AI',
    volatilityFactor: 0.014,
  },
  PLTR: {
    symbol: 'PLTR',
    name: 'Palantir Technologies',
    baseOpenPrice: 31.20,
    initialPrice: 34.15,
    avgVolume: 45000000,
    peRatio: 88.0,
    marketCap: 76000000000,
    sector: 'Enterprise AI / Defense',
    volatilityFactor: 0.035,
  },
  META: {
    symbol: 'META',
    name: 'Meta Platforms, Inc.',
    baseOpenPrice: 512.00,
    initialPrice: 524.70,
    avgVolume: 14500000,
    peRatio: 27.8,
    marketCap: 1330000000000,
    sector: 'Social / Metaverse',
    volatilityFactor: 0.018,
  }
};
