import { TickerDiff } from '../types/market.js';

const sampleDiffs: TickerDiff[] = [
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    basePrice: 124.50,
    targetPrice: 131.85,
    priceDelta: 7.35,
    percentDelta: 5.90,
    volumeRatio: 2.35,
    indicatorShifts: {
      rsiChange: 18.5,
      rsiStatus: 'OVERBOUGHT_ENTERED',
      macdCross: 'BULLISH_CROSS',
    },
    newCatalysts: [
      {
        id: 'cat-1',
        symbol: 'NVDA',
        timestamp: Date.now() - 15 * 60 * 1000,
        headline: 'Next-Gen Blackwell Ultra Chips Enter Mass Production Ahead of Schedule',
        source: 'Bloomberg Tech',
        impact: 'BULLISH',
        summary: 'Supply chain partners confirm early ramp of high-density AI accelerators.',
        category: 'PRODUCT',
      },
    ],
    priorityScore: 94,
    severity: 'CRITICAL',
    keyTakeaway: 'Advanced +$7.35 (+5.9%) following Bloomberg Tech catalyst: "Next-Gen Blackwell Ultra Chips Enter Mass Production Ahead of Schedule" • RSI crossed into overbought zone (≥70) • Bullish MACD crossover formed • Volume elevated (2.35x average)',
    templatedTakeaway: 'Advanced +$7.35 (+5.9%) following Bloomberg Tech catalyst: "Next-Gen Blackwell Ultra Chips Enter Mass Production Ahead of Schedule" • RSI crossed into overbought zone (≥70) • Bullish MACD crossover formed • Volume elevated (2.35x average)',
    targetFreshness: 'REALTIME',
    dataAgeMs: 0,
    confidence: { level: 'HIGH', isDivergent: false, primaryProvider: 'Finnhub', asOf: Date.now() },
    isDegraded: false,
    sparkline: [124.5, 126.0, 128.5, 131.85],
  },
  {
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    basePrice: 218.00,
    targetPrice: 209.75,
    priceDelta: -8.25,
    percentDelta: -3.78,
    volumeRatio: 1.85,
    indicatorShifts: {
      rsiChange: -12.4,
      rsiStatus: 'NORMAL',
      macdCross: 'BEARISH_CROSS',
    },
    newCatalysts: [
      {
        id: 'cat-2',
        symbol: 'TSLA',
        timestamp: Date.now() - 45 * 60 * 1000,
        headline: 'European Regulatory Delay Announced for Full Self-Driving Rollout',
        source: 'Reuters Auto',
        impact: 'BEARISH',
        summary: 'Transport authority requests additional 6-month trial documentation.',
        category: 'LEGAL',
      },
    ],
    priorityScore: 88,
    severity: 'MODERATE',
    keyTakeaway: 'Declined -$8.25 (-3.78%) following Reuters Auto catalyst: "European Regulatory Delay Announced for Full Self-Driving Rollout" • Bearish MACD signal generated • Volume elevated (1.85x average)',
    templatedTakeaway: 'Declined -$8.25 (-3.78%) following Reuters Auto catalyst: "European Regulatory Delay Announced for Full Self-Driving Rollout" • Bearish MACD signal generated • Volume elevated (1.85x average)',
    targetFreshness: 'REALTIME',
    dataAgeMs: 0,
    confidence: { level: 'HIGH', isDivergent: false, primaryProvider: 'Finnhub', asOf: Date.now() },
    isDegraded: false,
    sparkline: [218.0, 215.2, 212.0, 209.75],
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    basePrice: 228.10,
    targetPrice: 228.40,
    priceDelta: 0.30,
    percentDelta: 0.13,
    volumeRatio: 0.72,
    indicatorShifts: {
      rsiChange: 0.5,
      rsiStatus: 'NORMAL',
      macdCross: 'NONE',
    },
    newCatalysts: [],
    priorityScore: 2,
    severity: 'UNCHANGED',
    keyTakeaway: 'Advanced +$0.30 (+0.13%)',
    templatedTakeaway: 'Advanced +$0.30 (+0.13%)',
    targetFreshness: 'REALTIME',
    dataAgeMs: 0,
    confidence: { level: 'HIGH', isDivergent: false, primaryProvider: 'Finnhub', asOf: Date.now() },
    isDegraded: false,
    sparkline: [228.1, 228.2, 228.3, 228.4],
  },
];

console.log('========================================================================================');
console.log('       DELTA AI DIFF NARRATOR — BEFORE (TEMPLATED) VS AFTER (AI ANALYST) COMPARISON     ');
console.log('========================================================================================\n');

for (const diff of sampleDiffs) {
  console.log(`📌 TICKER: ${diff.symbol} (${diff.name})`);
  console.log(`----------------------------------------------------------------------------------------`);
  console.log(`📋 BEFORE (Rule-Based Templated Fallback):`);
  console.log(`   "${diff.templatedTakeaway}"`);
  console.log(``);

  // Generate simulated analyst synthesis
  let aiSynthesis = '';
  if (diff.symbol === 'NVDA') {
    aiSynthesis = 'NVDA surged +5.90% to $131.85 on 2.35x elevated volume, propelled by Bloomberg news of accelerated Blackwell chip production; momentum is reinforced by a fresh bullish MACD crossover as RSI enters overbought territory.';
  } else if (diff.symbol === 'TSLA') {
    aiSynthesis = 'TSLA declined -3.78% to $209.75 under heavy selling pressure (1.85x volume) triggered by European FSD regulatory delays, generating a bearish MACD crossover signal.';
  } else {
    aiSynthesis = 'AAPL held steady with minimal movement (+0.13% to $228.40) on subdued trading volume (0.72x average) in the absence of breaking catalysts.';
  }

  console.log(`✨ AFTER (Gemini AI Diff Narrator):`);
  console.log(`   "${aiSynthesis}"`);
  console.log(`========================================================================================\n`);
}
