import { diffEngine } from '../services/diffEngine.js';
import { snapshotService } from '../services/snapshotService.js';
import { marketDataService } from '../services/marketDataService.js';
import { WatchlistSnapshot } from '../types/market.js';

async function runTests() {
  console.log('🧪 Starting Delta Backend Comprehensive Unit Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  const symbols = ['NVDA', 'AAPL', 'TSLA'];

  // --- Test Suite 1: Cold-Start Fallback (TODAY_OPEN & PREVIOUS_CLOSE) ---
  console.log('Test Suite 1: Cold-Start Fallback Mechanisms');
  
  // 1A: Regular Hours Cold Start (TODAY_OPEN)
  const openColdStart = snapshotService.getSyntheticColdStartBaseline(symbols, 'user_open_test', 'TODAY_OPEN');
  assert(openColdStart.isSyntheticColdStart === true, 'Synthetic cold-start flag is set for open');
  assert(openColdStart.baselineType === 'TODAY_OPEN', 'Baseline type is TODAY_OPEN');
  assert(openColdStart.name === "Today's Market Open (09:30 AM)", 'Baseline name is Today\'s Market Open');
  assert(openColdStart.tickers['NVDA'] !== undefined, 'Contains NVDA ticker state');
  assert(openColdStart.tickers['NVDA'].price === openColdStart.tickers['NVDA'].open, 'Cold start open base price equals market open');

  // 1B: Pre-Market Cold Start (PREVIOUS_CLOSE branch)
  const prevCloseColdStart = snapshotService.getSyntheticColdStartBaseline(symbols, 'user_premarket_test', 'PREVIOUS_CLOSE');
  assert(prevCloseColdStart.isSyntheticColdStart === true, 'Synthetic cold-start flag is set for prev close');
  assert(prevCloseColdStart.baselineType === 'PREVIOUS_CLOSE', 'Baseline type is PREVIOUS_CLOSE for pre-market branch');
  assert(prevCloseColdStart.name === "Previous Day Close (04:00 PM)", 'Baseline name is Previous Day Close');
  assert(prevCloseColdStart.tickers['NVDA'].confidence.primaryProvider.includes('NYSE / NASDAQ EOD'), 'Provider reflects EOD official data');
  assert(prevCloseColdStart.tickers['NVDA'].volume > 0, 'Previous close initializes baseline volume');

  // --- Test Suite 2: Feed Divergence Detection & Low Confidence Degradation ---
  console.log('\nTest Suite 2: Feed Divergence Detection & Confidence Degradation');

  // Reset any overrides first
  marketDataService.setDivergenceOverride('TSLA', null);
  const normalTsla = marketDataService.getTickerState('TSLA')!;
  assert(normalTsla.confidence.isDivergent === false, 'TSLA is not divergent under normal conditions');
  assert(normalTsla.confidence.level === 'HIGH', 'TSLA has HIGH confidence under normal conditions');

  // Trigger 1.85% divergence on TSLA (> 0.30% warning threshold and > 1.0% low confidence threshold)
  marketDataService.setDivergenceOverride('TSLA', 1.85);
  const divergentTsla = marketDataService.getTickerState('TSLA')!;

  assert(divergentTsla.confidence.isDivergent === true, 'isDivergent is true when primary & fallback feeds diverge');
  assert(
    Math.abs(divergentTsla.confidence.divergencePercent! - 1.85) < 0.01,
    'Divergence percent is accurately captured (~1.85%)'
  );
  assert(divergentTsla.confidence.level === 'LOW', 'Confidence level degrades to LOW when divergence > 1.0%');
  assert(divergentTsla.confidence.primaryProvider.length > 0, 'Primary provider is populated');
  assert(divergentTsla.confidence.secondaryProvider !== undefined, 'Secondary provider is populated');

  // Test mild divergence (0.45% divergence: >0.30% warning threshold -> MEDIUM confidence)
  marketDataService.setDivergenceOverride('AAPL', 0.45);
  const mildDivergentAapl = marketDataService.getTickerState('AAPL')!;
  assert(mildDivergentAapl.confidence.isDivergent === true, 'isDivergent is true for mild divergence (0.45%)');
  assert(mildDivergentAapl.confidence.level === 'MEDIUM', 'Confidence level degrades to MEDIUM for moderate spread');

  // Clean up
  marketDataService.setDivergenceOverride('TSLA', null);
  marketDataService.setDivergenceOverride('AAPL', null);

  // --- Test Suite 3: Freshness Tracking & Staleness ---
  console.log('\nTest Suite 3: Data Freshness Tracking (REALTIME, DELAYED, STALE)');
  
  marketDataService.setStalenessOverride('NVDA', 2); // 2 min old -> DELAYED
  const delayedNvda = marketDataService.getTickerState('NVDA')!;
  assert(delayedNvda.freshness === 'DELAYED', 'Identifies DELAYED data (2m old)');
  assert(delayedNvda.confidence.level === 'MEDIUM', 'Downgrades to MEDIUM confidence on DELAYED');

  marketDataService.setStalenessOverride('NVDA', 25); // 25 min old -> STALE
  const staleNvda = marketDataService.getTickerState('NVDA')!;
  assert(staleNvda.freshness === 'STALE', 'Identifies STALE data (>15m threshold)');
  assert(staleNvda.confidence.level === 'LOW', 'Downgrades to LOW confidence on STALE');

  marketDataService.setStalenessOverride('NVDA', null); // Reset

  // --- Test Suite 4: Structured Diff Math, Catalyst Filtering & Key Takeaways ---
  console.log('\nTest Suite 4: Structured Diff Engine Calculation & Dynamic Takeaways');

  const baseSnap: WatchlistSnapshot = {
    id: 'test-base',
    userId: 'test_user',
    name: "Today's Market Open (09:30 AM)",
    timestamp: Date.now() - 3600000,
    baselineType: 'TODAY_OPEN',
    tickers: {
      NVDA: {
        symbol: 'NVDA',
        name: 'NVIDIA Corporation',
        price: 100.00,
        open: 100.00,
        high: 102.00,
        low: 99.00,
        volume: 1000000,
        avgVolume: 1000000,
        marketCap: 3000000000000,
        rsi14: 55.0,
        macd: { value: 0, signal: 0, histogram: -0.2 },
        sparkline: [100],
        activeCatalysts: [],
        freshness: 'REALTIME',
        dataAgeMs: 0,
        confidence: { level: 'HIGH', isDivergent: false, primaryProvider: 'Finnhub', asOf: Date.now() },
      },
    },
  };

  const targetSnap: WatchlistSnapshot = {
    id: 'test-target',
    userId: 'test_user',
    name: 'Live Target',
    timestamp: Date.now(),
    baselineType: 'USER_COMMIT',
    tickers: {
      NVDA: {
        symbol: 'NVDA',
        name: 'NVIDIA Corporation',
        price: 105.50, // +5.5% move
        open: 100.00,
        high: 106.00,
        low: 100.00,
        volume: 2500000, // 2.5x volume
        avgVolume: 1000000,
        marketCap: 3165000000000,
        rsi14: 74.0, // Entered overbought
        macd: { value: 1.2, signal: 0.8, histogram: 0.4 }, // Bullish cross
        sparkline: [100, 105.50],
        activeCatalysts: [],
        freshness: 'REALTIME',
        dataAgeMs: 0,
        confidence: { level: 'HIGH', isDivergent: false, primaryProvider: 'Finnhub', asOf: Date.now() },
      },
    },
  };

  const diffReport = diffEngine.computeDiff(baseSnap, targetSnap, true);
  const nvdaDiff = diffReport.diffs[0];

  assert(diffReport.coldStart.isColdStart === true, 'Report preserves cold-start metadata');
  assert(diffReport.coldStart.fallbackBaselineUsed === 'TODAY_OPEN', 'Report records fallback baseline used');
  assert(nvdaDiff.priceDelta === 5.50, 'Calculates exact price delta (+$5.50)');
  assert(nvdaDiff.percentDelta === 5.50, 'Calculates exact percent delta (+5.50%)');
  assert(nvdaDiff.volumeRatio === 2.50, 'Calculates volume surge ratio (2.5x)');
  assert(nvdaDiff.indicatorShifts.rsiStatus === 'OVERBOUGHT_ENTERED', 'Flags RSI overbought entry (≥70)');
  assert(nvdaDiff.indicatorShifts.macdCross === 'BULLISH_CROSS', 'Detects bullish MACD crossover');
  assert(nvdaDiff.severity === 'CRITICAL' || nvdaDiff.severity === 'MODERATE', 'Assigns elevated severity to outsized move');
  assert(nvdaDiff.keyTakeaway.includes('Advanced +$5.50 (+5.5%)'), 'keyTakeaway includes clear price shift');
  assert(nvdaDiff.keyTakeaway.includes('RSI crossed into overbought'), 'keyTakeaway includes RSI overbought explanation');

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
