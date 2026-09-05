export interface MockTickerDefinition {
  symbol: string;
  name: string;
  baseOpenPrice: number; // Today's market open price in INR (used for cold-start baseline)
  initialPrice: number;
  avgVolume: number;
  peRatio?: number;
  marketCap: number; // in INR
  sector: string;
  volatilityFactor: number;
}

export const INITIAL_MOCK_TICKERS: Record<string, MockTickerDefinition> = {
  // --- Indian Tech Momentum Equities ---
  TCS: {
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd',
    baseOpenPrice: 4150.00,
    initialPrice: 4218.50,
    avgVolume: 2450000,
    peRatio: 31.4,
    marketCap: 15250000000000, // ₹15.25 Lakh Cr
    sector: 'IT & Cloud Services',
    volatilityFactor: 0.015,
  },
  INFY: {
    symbol: 'INFY',
    name: 'Infosys Limited',
    baseOpenPrice: 1885.00,
    initialPrice: 1942.80,
    avgVolume: 5800000,
    peRatio: 28.2,
    marketCap: 8060000000000, // ₹8.06 Lakh Cr
    sector: 'IT & Digital Transformation',
    volatilityFactor: 0.022,
  },
  WIPRO: {
    symbol: 'WIPRO',
    name: 'Wipro Limited',
    baseOpenPrice: 522.00,
    initialPrice: 535.40,
    avgVolume: 6100000,
    peRatio: 22.8,
    marketCap: 2800000000000, // ₹2.80 Lakh Cr
    sector: 'IT Consulting',
    volatilityFactor: 0.018,
  },
  HCLTECH: {
    symbol: 'HCLTECH',
    name: 'HCL Technologies Ltd',
    baseOpenPrice: 1762.00,
    initialPrice: 1798.50,
    avgVolume: 3200000,
    peRatio: 26.5,
    marketCap: 4870000000000, // ₹4.87 Lakh Cr
    sector: 'IT & Engineering Services',
    volatilityFactor: 0.017,
  },
  TECHM: {
    symbol: 'TECHM',
    name: 'Tech Mahindra Ltd',
    baseOpenPrice: 1580.00,
    initialPrice: 1614.20,
    avgVolume: 2100000,
    peRatio: 33.1,
    marketCap: 1580000000000, // ₹1.58 Lakh Cr
    sector: 'IT & Telecom Solutions',
    volatilityFactor: 0.025,
  },

  // --- Indian Nifty 50 & Global Macro Giants ---
  RELIANCE: {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd',
    baseOpenPrice: 2980.00,
    initialPrice: 3048.00,
    avgVolume: 6800000,
    peRatio: 29.2,
    marketCap: 20620000000000, // ₹20.62 Lakh Cr
    sector: 'Energy, Retail & Telecom',
    volatilityFactor: 0.018,
  },
  HDFCBANK: {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Limited',
    baseOpenPrice: 1640.00,
    initialPrice: 1679.50,
    avgVolume: 14500000,
    peRatio: 19.4,
    marketCap: 12800000000000, // ₹12.80 Lakh Cr
    sector: 'Banking & Financials',
    volatilityFactor: 0.014,
  },
  ICICIBANK: {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Limited',
    baseOpenPrice: 1210.00,
    initialPrice: 1239.00,
    avgVolume: 12000000,
    peRatio: 18.6,
    marketCap: 8720000000000, // ₹8.72 Lakh Cr
    sector: 'Banking & Financials',
    volatilityFactor: 0.016,
  },
  ITC: {
    symbol: 'ITC',
    name: 'ITC Limited',
    baseOpenPrice: 495.00,
    initialPrice: 508.40,
    avgVolume: 11200000,
    peRatio: 27.3,
    marketCap: 6360000000000, // ₹6.36 Lakh Cr
    sector: 'FMCG & Conglomerate',
    volatilityFactor: 0.011,
  },
  SBIN: {
    symbol: 'SBIN',
    name: 'State Bank of India',
    baseOpenPrice: 815.00,
    initialPrice: 835.60,
    avgVolume: 18500000,
    peRatio: 11.7,
    marketCap: 7460000000000, // ₹7.46 Lakh Cr
    sector: 'Public Sector Banking',
    volatilityFactor: 0.019,
  },
  BHARTIARTL: {
    symbol: 'BHARTIARTL',
    name: 'Bharti Airtel Limited',
    baseOpenPrice: 1520.00,
    initialPrice: 1558.00,
    avgVolume: 5100000,
    peRatio: 45.8,
    marketCap: 9120000000000, // ₹9.12 Lakh Cr
    sector: 'Telecom & Digital',
    volatilityFactor: 0.016,
  },
  TATAMOTORS: {
    symbol: 'TATAMOTORS',
    name: 'Tata Motors Limited',
    baseOpenPrice: 1040.00,
    initialPrice: 1072.00,
    avgVolume: 8200000,
    peRatio: 16.4,
    marketCap: 3940000000000, // ₹3.94 Lakh Cr
    sector: 'Automotive & Commercial Vehicles',
    volatilityFactor: 0.024,
  },
  LICI: {
    symbol: 'LICI',
    name: 'Life Insurance Corporation of India',
    baseOpenPrice: 975.00,
    initialPrice: 994.00,
    avgVolume: 3400000,
    peRatio: 15.5,
    marketCap: 6280000000000, // ₹6.28 Lakh Cr
    sector: 'Life Insurance',
    volatilityFactor: 0.013,
  },

  // --- Digital Assets & Crypto (INR-denominated) ---
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin (INR)',
    baseOpenPrice: 5850000.00,
    initialPrice: 6125000.00,
    avgVolume: 28000000000,
    marketCap: 120500000000000, // ₹120.5 Lakh Cr
    sector: 'Digital Store of Value',
    volatilityFactor: 0.038,
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum (INR)',
    baseOpenPrice: 275000.00,
    initialPrice: 289500.00,
    avgVolume: 14000000000,
    marketCap: 34800000000000, // ₹34.8 Lakh Cr
    sector: 'Smart Contract Platform',
    volatilityFactor: 0.042,
  },
  SOL: {
    symbol: 'SOL',
    name: 'Solana (INR)',
    baseOpenPrice: 13200.00,
    initialPrice: 14150.00,
    avgVolume: 4500000000,
    marketCap: 6540000000000, // ₹6.54 Lakh Cr
    sector: 'High-Performance L1',
    volatilityFactor: 0.048,
  },
  MATIC: {
    symbol: 'MATIC',
    name: 'Polygon Ecosystem (INR)',
    baseOpenPrice: 42.50,
    initialPrice: 45.80,
    avgVolume: 850000000,
    marketCap: 455000000000, // ₹45,500 Cr
    sector: 'Ethereum Layer 2',
    volatilityFactor: 0.040,
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD (INR)',
    baseOpenPrice: 88.20,
    initialPrice: 88.65,
    avgVolume: 9200000000,
    marketCap: 10200000000000, // ₹10.2 Lakh Cr
    sector: 'USD Stablecoin',
    volatilityFactor: 0.005,
  },
};
