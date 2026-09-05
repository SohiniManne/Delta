import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Freshness thresholds (in milliseconds)
  freshness: {
    realtimeThresholdMs: 30 * 1000,      // < 30s is REALTIME
    delayedThresholdMs: 15 * 60 * 1000,  // 30s to 15m is DELAYED, > 15m is STALE
  },
  // Divergence threshold (percentage difference between primary and fallback feeds)
  divergence: {
    warningThresholdPercent: 0.30, // > 0.30% divergence triggers warning and lower confidence
  },
  // AI Diff Narrator Configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS || '3000', 10), // Strict 3s timeout
  },
  // Real Market Data Layer (Yahoo Finance NSE)
  liveData: {
    enabled: process.env.USE_LIVE_DATA === 'true',
    timeoutMs: parseInt(process.env.YAHOO_TIMEOUT_MS || '3000', 10),
  },
};
