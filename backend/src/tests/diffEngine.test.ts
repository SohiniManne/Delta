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

  const symbols = ['RELIANCE', 'TCS', 'INFY'];

  // --- Test Suite 1: Cold-Start Fallback (TODAY_OPEN & PREVIOUS_CLOSE) ---
  console.log('Test Suite 1: Cold-Start Fallback Mechanisms');
  
  // 1A: Regular Hours Cold Start (TODAY_OPEN)
  const openColdStart = snapshotService.getSyntheticColdStartBaseline(symbols, 'user_open_test', 'TODAY_OPEN');
  assert(openColdStart.isSyntheticColdStart === true, 'Synthetic cold-start flag is set for open');
  assert(openColdStart.baselineType === 'TODAY_OPEN', 'Baseline type is TODAY_OPEN');
  assert(openColdStart.name === "Today's Market Open (09:15 AM)", 'Baseline name is Today\'s Market Open');
  assert(openColdStart.tickers['RELIANCE'] !== undefined, 'Contains RELIANCE ticker state');
  assert(openColdStart.tickers['RELIANCE'].price === openColdStart.tickers['RELIANCE'].open, 'Cold start open base price equals market open');

  // 1B: Pre-Market Cold Start (PREVIOUS_CLOSE branch)
  const prevCloseColdStart = snapshotService.getSyntheticColdStartBaseline(symbols, 'user_premarket_test', 'PREVIOUS_CLOSE');
  assert(prevCloseColdStart.isSyntheticColdStart === true, 'Synthetic cold-start flag is set for prev close');
  assert(prevCloseColdStart.baselineType === 'PREVIOUS_CLOSE', 'Baseline type is PREVIOUS_CLOSE for pre-market branch');
  assert(prevCloseColdStart.name === "Previous Day Close (03:30 PM)", 'Baseline name is Previous Day Close');
  assert(prevCloseColdStart.tickers['RELIANCE'].confidence.primaryProvider.includes('NSE / BSE Official EOD'), 'Provider reflects EOD official data');
  assert(prevCloseColdStart.tickers['RELIANCE'].volume > 0, 'Previous close initializes baseline volume');

  // --- Test Suite 2: Feed Divergence Detection & Low Confidence Degradation ---
  console.log('\nTest Suite 2: Feed Divergence Detection & Confidence Degradation');

  // Reset any overrides first
  marketDataService.setDivergenceOverride('INFY', null);
  const normalInfy = marketDataService.getTickerState('INFY')!;
  assert(normalInfy.confidence.isDivergent === false, 'INFY is not divergent under normal conditions');
  assert(normalInfy.confidence.level === 'HIGH', 'INFY has HIGH confidence under normal conditions');

  // Trigger 1.85% divergence on INFY (> 0.30% warning threshold and > 1.0% low confidence threshold)
  marketDataService.setDivergenceOverride('INFY', 1.85);
  const divergentInfy = marketDataService.getTickerState('INFY')!;

  assert(divergentInfy.confidence.isDivergent === true, 'isDivergent is true when primary & fallback feeds diverge');
  assert(
    Math.abs(divergentInfy.confidence.divergencePercent! - 1.85) < 0.01,
    'Divergence percent is accurately captured (~1.85%)'
  );
  assert(divergentInfy.confidence.level === 'LOW', 'Confidence level degrades to LOW when divergence > 1.0%');
  assert(divergentInfy.confidence.primaryProvider.length > 0, 'Primary provider is populated');
  assert(divergentInfy.confidence.secondaryProvider !== undefined, 'Secondary provider is populated');

  // Test mild divergence (0.45% divergence: >0.30% warning threshold -> MEDIUM confidence)
  marketDataService.setDivergenceOverride('TCS', 0.45);
  const mildDivergentTcs = marketDataService.getTickerState('TCS')!;
  assert(mildDivergentTcs.confidence.isDivergent === true, 'isDivergent is true for mild divergence (0.45%)');
  assert(mildDivergentTcs.confidence.level === 'MEDIUM', 'Confidence level degrades to MEDIUM for moderate spread');

  // Clean up
  marketDataService.setDivergenceOverride('INFY', null);
  marketDataService.setDivergenceOverride('TCS', null);

  // --- Test Suite 3: Freshness Tracking & Staleness ---
  console.log('\nTest Suite 3: Data Freshness Tracking (REALTIME, DELAYED, STALE)');
  
  marketDataService.setStalenessOverride('RELIANCE', 2); // 2 min old -> DELAYED
  const delayedReliance = marketDataService.getTickerState('RELIANCE')!;
  assert(delayedReliance.freshness === 'DELAYED', 'Identifies DELAYED data (2m old)');
  assert(delayedReliance.confidence.level === 'MEDIUM', 'Downgrades to MEDIUM confidence on DELAYED');

  marketDataService.setStalenessOverride('RELIANCE', 25); // 25 min old -> STALE
  const staleReliance = marketDataService.getTickerState('RELIANCE')!;
  assert(staleReliance.freshness === 'STALE', 'Identifies STALE data (>15m threshold)');
  assert(staleReliance.confidence.level === 'LOW', 'Downgrades to LOW confidence on STALE');

  marketDataService.setStalenessOverride('RELIANCE', null); // Reset

  // --- Test Suite 4: Structured Diff Math, Catalyst Filtering & Key Takeaways ---
  console.log('\nTest Suite 4: Structured Diff Engine Calculation & Dynamic Takeaways');

  const baseSnap: WatchlistSnapshot = {
    id: 'test-base',
    userId: 'test_user',
    name: "Today's Market Open (09:15 AM)",
    timestamp: Date.now() - 3600000,
    baselineType: 'TODAY_OPEN',
    tickers: {
      RELIANCE: {
        symbol: 'RELIANCE',
        name: 'Reliance Industries Ltd',
        price: 2950.00,
        open: 2950.00,
        high: 2980.00,
        low: 2940.00,
        volume: 1000000,
        avgVolume: 1000000,
        marketCap: 19958000000000,
        rsi14: 55.0,
        macd: { value: 0, signal: 0, histogram: -0.2 },
        sparkline: [2950],
        activeCatalysts: [],
        freshness: 'REALTIME',
        dataAgeMs: 0,
        confidence: { level: 'HIGH', isDivergent: false, primaryProvider: 'NSE Realtime Feed', asOf: Date.now() },
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
      RELIANCE: {
        symbol: 'RELIANCE',
        name: 'Reliance Industries Ltd',
        price: 3112.25, // +5.5% move (+₹162.25)
        open: 2950.00,
        high: 3120.00,
        low: 2950.00,
        volume: 2500000, // 2.5x volume
        avgVolume: 1000000,
        marketCap: 21055690000000,
        rsi14: 74.0, // Entered overbought
        macd: { value: 12.5, signal: 8.0, histogram: 4.5 }, // Bullish cross
        sparkline: [2950, 3112.25],
        activeCatalysts: [],
        freshness: 'REALTIME',
        dataAgeMs: 0,
        confidence: { level: 'HIGH', isDivergent: false, primaryProvider: 'NSE Realtime Feed', asOf: Date.now() },
      },
    },
  };

  const diffReport = await diffEngine.computeDiff(baseSnap, targetSnap, true);
  const relianceDiff = diffReport.diffs[0];

  assert(diffReport.coldStart.isColdStart === true, 'Report preserves cold-start metadata');
  assert(diffReport.coldStart.fallbackBaselineUsed === 'TODAY_OPEN', 'Report records fallback baseline used');
  assert(Math.abs(relianceDiff.priceDelta - 162.25) < 0.01, 'Calculates exact price delta (+₹162.25)');
  assert(Math.abs(relianceDiff.percentDelta - 5.50) < 0.01, 'Calculates exact percent delta (+5.50%)');
  assert(relianceDiff.volumeRatio === 2.50, 'Calculates volume surge ratio (2.5x)');
  assert(relianceDiff.indicatorShifts.rsiStatus === 'OVERBOUGHT_ENTERED', 'Flags RSI overbought entry (≥70)');
  assert(relianceDiff.indicatorShifts.macdCross === 'BULLISH_CROSS', 'Detects bullish MACD crossover');
  assert(relianceDiff.severity === 'CRITICAL' || relianceDiff.severity === 'MODERATE', 'Assigns elevated severity to outsized move');
  assert(relianceDiff.templatedTakeaway!.includes('Advanced +₹162.25 (+5.5%)'), 'templatedTakeaway includes clear INR price shift');
  assert(relianceDiff.templatedTakeaway!.includes('RSI crossed into overbought'), 'templatedTakeaway includes RSI overbought explanation');

  // --- Test Suite 5: AI Diff Narrator Resilience & Graceful Fallbacks ---
  console.log('\nTest Suite 5: AI Diff Narrator Resilience & Graceful Fallbacks');
  assert(relianceDiff.templatedTakeaway !== undefined, 'Every diff retains deterministic templatedTakeaway baseline');
  assert(typeof relianceDiff.keyTakeaway === 'string' && relianceDiff.keyTakeaway.length > 0, 'keyTakeaway is always non-empty');
  assert(relianceDiff.isAiNarrated === true, 'isAiNarrated boolean flag is set to true on AI enhancement');
  assert(relianceDiff.keyTakeaway.includes('RELIANCE') && relianceDiff.keyTakeaway.includes('162.25'), 'keyTakeaway reflects synthesized AI analyst narrative');

  // Verify that synchronous pure calculation yields valid fallback takeaway
  const syncReport = diffEngine.computeDiffSync(baseSnap, targetSnap, false);
  assert(syncReport.diffs[0].keyTakeaway.length > 0, 'Synchronous computeDiffSync yields valid takeaway');
  assert(syncReport.diffs[0].templatedTakeaway === syncReport.diffs[0].keyTakeaway, 'templatedTakeaway matches keyTakeaway on sync');

  // Verify graceful failure handling when AI service errors or times out on CRITICAL diff
  const { aiNarratorService } = await import('../services/aiNarratorService.js');
  aiNarratorService.setFailureSimulation(true);

  const failedAiReport = await diffEngine.computeDiff(baseSnap, targetSnap, false);
  const failedDiff = failedAiReport.diffs[0];

  assert(failedDiff.isAiNarrated === false, 'AI failure sets isAiNarrated: false gracefully');
  assert(failedDiff.keyTakeaway === failedDiff.templatedTakeaway, 'AI failure silently falls back to templated takeaway');
  assert(failedDiff.keyTakeaway.includes('Advanced +₹162.25 (+5.5%)'), 'Fallback takeaway contains complete deterministic metrics');
  assert(!failedDiff.keyTakeaway.includes('Error') && !failedDiff.keyTakeaway.includes('Exception'), 'Fallback takeaway contains no error messages or broken text');

  // Restore failure simulation to normal
  aiNarratorService.setFailureSimulation(false);
  const restoredReport = await diffEngine.computeDiff(baseSnap, targetSnap, false);
  assert(restoredReport.diffs[0].isAiNarrated === true, 'AI Narrator successfully restored to normal operation');

  // --- Test Suite 6: Multi-Watchlist CRUD & Cross-Watchlist Isolation ---
  console.log('\nTest Suite 6: Multi-Watchlist CRUD & Cross-Watchlist Isolation');
  const { watchlistService } = await import('../services/watchlistService.js');
  const testUserId = 'test_multi_user_' + Date.now();

  // 6A: User watchlists initialization
  const initialLists = watchlistService.getUserWatchlists(testUserId);
  assert(initialLists.length >= 3, 'New user starts with default seeded watchlists');
  assert(initialLists.some((w) => w.name === 'Tech Momentum'), 'Contains Tech Momentum portfolio');
  assert(initialLists.some((w) => w.name === 'Digital Assets & Crypto'), 'Contains Digital Assets & Crypto portfolio');

  // 6B: Create new named watchlist
  const createdWl = watchlistService.createWatchlist('Banking & NBFC Alpha', ['HDFCBANK', 'ICICIBANK', 'SBIN'], testUserId);
  assert(createdWl.id.startsWith('wl-'), 'Created watchlist receives unique ID');
  assert(createdWl.name === 'Banking & NBFC Alpha', 'Created watchlist preserves name');
  assert(createdWl.symbols.length === 3, 'Created watchlist has 3 initial symbols');

  // 6C: Add and remove symbols from specific watchlist
  const addRes = watchlistService.addSymbol('KOTAKBANK', testUserId, createdWl.id);
  assert(addRes.symbols.includes('KOTAKBANK'), 'Successfully added KOTAKBANK to Banking & NBFC Alpha watchlist');
  
  const removeRes = watchlistService.removeSymbol('ICICIBANK', testUserId, createdWl.id);
  assert(!removeRes.symbols.includes('ICICIBANK'), 'Successfully removed ICICIBANK from Banking & NBFC Alpha watchlist');
  assert(removeRes.symbols.includes('KOTAKBANK'), 'KOTAKBANK remains in watchlist');

  // 6D: Rename watchlist
  const renamed = watchlistService.renameWatchlist(createdWl.id, 'PSU & Private Banks Focus', testUserId);
  assert(renamed?.name === 'PSU & Private Banks Focus', 'Watchlist successfully renamed');

  // 6E: Cross-watchlist checkpoint & diff isolation
  const cryptoWl = initialLists.find((w) => w.name === 'Digital Assets & Crypto')!;
  const techWl = initialLists.find((w) => w.name === 'Tech Momentum')!;

  // Checkpoints committed to Tech watchlist do not overwrite Crypto watchlist baseline
  const techCheckpoint = snapshotService.commitSnapshot(['TCS', 'INFY'], 'Tech Checkpoint Alpha', 'USER_COMMIT', testUserId, techWl.id);
  const cryptoBaseline = snapshotService.getLastSeenOrColdStartBaseline(cryptoWl.symbols, testUserId, cryptoWl.id);

  assert(techCheckpoint.watchlistId === techWl.id, 'Tech checkpoint is explicitly scoped to Tech watchlistId');
  assert(cryptoBaseline.snapshot.watchlistId === cryptoWl.id || cryptoBaseline.isColdStart, 'Crypto watchlist maintains independent cold-start or baseline');
  assert(cryptoBaseline.snapshot.id !== techCheckpoint.id, 'Crypto baseline is completely isolated from Tech checkpoint');

  // 6F: Delete watchlist
  const deleteRes = watchlistService.deleteWatchlist(createdWl.id, testUserId);
  assert(deleteRes.success === true, 'Watchlist deleted successfully');
  assert(!deleteRes.remainingWatchlists.some((w) => w.id === createdWl.id), 'Deleted watchlist is no longer in user watchlists');



  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
