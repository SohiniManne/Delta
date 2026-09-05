import {
  WatchlistSnapshot,
  TickerState,
  TickerDiff,
  WatchlistDiffReport,
  DiffSeverity,
  CatalystEvent,
  ConfidenceLevel,
} from '../types/market.js';
import { marketDataService } from './marketDataService.js';
import { aiNarratorService } from './aiNarratorService.js';

export class DiffEngine {
  /**
   * Computes structured diff between base snapshot and target snapshot,
   * asynchronously enhancing takeaways with AI Diff Narrator (Gemini) when available.
   */
  public async computeDiff(
    baseSnapshot: WatchlistSnapshot,
    targetSnapshot: WatchlistSnapshot,
    isColdStart = false
  ): Promise<WatchlistDiffReport> {
    const report = this.computeDiffSync(baseSnapshot, targetSnapshot, isColdStart);

    // Asynchronously enhance diff takeaways with AI Narrator (Gemini)
    try {
      const enhancedDiffs = await aiNarratorService.enhanceDiffsWithAi(report.diffs);
      report.diffs = enhancedDiffs;

      // Update top gainer/loser/mostActive references to point to enhanced objects
      const sortedByGain = [...enhancedDiffs].sort((a, b) => b.percentDelta - a.percentDelta);
      report.topGainer = sortedByGain.length > 0 && sortedByGain[0].percentDelta > 0 ? sortedByGain[0] : null;
      report.topLoser = sortedByGain.length > 0 && sortedByGain[sortedByGain.length - 1].percentDelta < 0
        ? sortedByGain[sortedByGain.length - 1]
        : null;
      report.mostActive = [...enhancedDiffs].sort((a, b) => b.volumeRatio - a.volumeRatio)[0] || null;
    } catch {
      // Graceful fallback to sync templated report
    }

    return report;
  }

  /**
   * Synchronous pure calculation of structured diff report with deterministic templated takeaways.
   */
  public computeDiffSync(
    baseSnapshot: WatchlistSnapshot,
    targetSnapshot: WatchlistSnapshot,
    isColdStart = false
  ): WatchlistDiffReport {
    const diffs: TickerDiff[] = [];
    const baseTickers = baseSnapshot.tickers;
    const targetTickers = targetSnapshot.tickers;

    const allSymbols = Array.from(
      new Set([...Object.keys(baseTickers), ...Object.keys(targetTickers)])
    );

    let totalDeltaPercentSum = 0;
    let validTickerCount = 0;
    let staleCount = 0;
    let divergenceCount = 0;
    let totalNewCatalysts = 0;

    for (const symbol of allSymbols) {
      const base = baseTickers[symbol];
      const target = targetTickers[symbol];

      // If missing in either, handle gracefully
      if (!target) continue;

      const basePrice = base ? base.price : target.open;
      const targetPrice = target.price;
      const priceDelta = parseFloat((targetPrice - basePrice).toFixed(2));
      const percentDelta = parseFloat(
        basePrice > 0 ? (((targetPrice - basePrice) / basePrice) * 100).toFixed(2) : '0'
      );

      totalDeltaPercentSum += percentDelta;
      validTickerCount++;

      // Track data quality metrics
      if (target.freshness === 'STALE') staleCount++;
      if (target.confidence.isDivergent) divergenceCount++;

      // Volume ratio
      const volumeRatio = parseFloat(
        (target.volume / (target.avgVolume || target.volume || 1)).toFixed(2)
      );

      // Indicator shifts
      const baseRsi = base ? base.rsi14 : 50;
      const targetRsi = target.rsi14;
      const rsiChange = parseFloat((targetRsi - baseRsi).toFixed(1));

      let rsiStatus: 'NORMAL' | 'OVERBOUGHT_ENTERED' | 'OVERSOLD_ENTERED' = 'NORMAL';
      if (targetRsi >= 70 && baseRsi < 70) rsiStatus = 'OVERBOUGHT_ENTERED';
      else if (targetRsi <= 30 && baseRsi > 30) rsiStatus = 'OVERSOLD_ENTERED';

      let macdCross: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NONE' = 'NONE';
      if (base) {
        if (base.macd.histogram <= 0 && target.macd.histogram > 0) macdCross = 'BULLISH_CROSS';
        else if (base.macd.histogram >= 0 && target.macd.histogram < 0) macdCross = 'BEARISH_CROSS';
      }

      // Filter new catalysts between base timestamp and target timestamp
      const newCatalysts = marketDataService
        .getCatalysts(symbol, baseSnapshot.timestamp)
        .filter((c) => c.timestamp <= targetSnapshot.timestamp + 5000);

      totalNewCatalysts += newCatalysts.length;

      // Priority and Severity calculation
      const { priorityScore, severity } = this.calculatePriorityAndSeverity(
        percentDelta,
        volumeRatio,
        rsiStatus,
        macdCross,
        newCatalysts,
        target.confidence.isDivergent
      );

      // Natural language dynamic takeaway synthesis (templated baseline)
      const templatedTakeaway = this.generateKeyTakeaway(
        symbol,
        percentDelta,
        priceDelta,
        newCatalysts,
        rsiStatus,
        macdCross,
        volumeRatio,
        target.confidence.isDivergent
      );

      // Degradation context
      const isDegraded = target.freshness === 'STALE' || target.confidence.level === 'LOW';
      let confidenceNote: string | undefined;
      if (target.confidence.isDivergent && target.confidence.divergencePercent) {
        confidenceNote = `Source discrepancy detected: feeds diverge by ${target.confidence.divergencePercent}%`;
      } else if (target.freshness === 'STALE') {
        confidenceNote = `Data is stale (${Math.round(target.dataAgeMs / 60000)}m old)`;
      }

      diffs.push({
        symbol,
        name: target.name,
        basePrice,
        targetPrice,
        priceDelta,
        percentDelta,
        volumeRatio,
        indicatorShifts: {
          rsiChange,
          rsiStatus,
          macdCross,
        },
        newCatalysts,
        priorityScore,
        severity,
        keyTakeaway: templatedTakeaway,
        templatedTakeaway,
        isAiNarrated: false,
        targetFreshness: target.freshness,
        dataAgeMs: target.dataAgeMs,
        confidence: target.confidence,
        isDegraded,
        confidenceNote,
        sparkline: target.sparkline || [],
      });
    }

    // Sort diffs by priority score descending
    diffs.sort((a, b) => b.priorityScore - a.priorityScore);

    // Identify top gainer, loser, most active
    const sortedByGain = [...diffs].sort((a, b) => b.percentDelta - a.percentDelta);
    const topGainer = sortedByGain.length > 0 && sortedByGain[0].percentDelta > 0 ? sortedByGain[0] : null;
    const topLoser = sortedByGain.length > 0 && sortedByGain[sortedByGain.length - 1].percentDelta < 0
      ? sortedByGain[sortedByGain.length - 1]
      : null;
    const mostActive = [...diffs].sort((a, b) => b.volumeRatio - a.volumeRatio)[0] || null;

    const portfolioDeltaPercent = parseFloat(
      validTickerCount > 0 ? (totalDeltaPercentSum / validTickerCount).toFixed(2) : '0'
    );

    // Calculate overall data quality health
    let overallConfidence: ConfidenceLevel | 'DEGRADED' = 'HIGH';
    if (staleCount > 0 || divergenceCount > 1) {
      overallConfidence = 'DEGRADED';
    } else if (divergenceCount === 1) {
      overallConfidence = 'MEDIUM';
    }

    // Cold-start messaging
    let coldStartMessage: string | undefined;
    if (isColdStart) {
      coldStartMessage = `First visit detected — showing movements since ${baseSnapshot.name || "Today's Market Open (09:15 AM)"}. Click 'Commit Checkpoint' anytime to establish a new baseline.`;
    }

    return {
      baseSnapshot: {
        id: baseSnapshot.id,
        name: baseSnapshot.name,
        timestamp: baseSnapshot.timestamp,
        baselineType: baseSnapshot.baselineType,
        isSyntheticColdStart: !!baseSnapshot.isSyntheticColdStart,
      },
      targetSnapshot: {
        id: targetSnapshot.id,
        name: targetSnapshot.name,
        timestamp: targetSnapshot.timestamp,
      },
      portfolioDeltaPercent,
      topGainer,
      topLoser,
      mostActive,
      diffs,
      totalNewCatalysts,
      generatedAt: Date.now(),
      coldStart: {
        isColdStart,
        message: coldStartMessage,
        fallbackBaselineUsed: isColdStart ? baseSnapshot.baselineType as any : 'NONE',
      },
      dataQualitySummary: {
        staleCount,
        divergenceCount,
        overallConfidence,
      },
    };
  }

  private calculatePriorityAndSeverity(
    percentDelta: number,
    volumeRatio: number,
    rsiStatus: string,
    macdCross: string,
    newCatalysts: CatalystEvent[],
    isDivergent: boolean
  ): { priorityScore: number; severity: DiffSeverity } {
    let score = 0;

    // Magnitude of price move
    const absMove = Math.abs(percentDelta);
    score += Math.min(45, absMove * 9); // e.g. 5% move = 45 pts

    // Volume surges
    if (volumeRatio > 1.8) score += 20;
    else if (volumeRatio > 1.2) score += 10;

    // Catalysts count & impact
    for (const cat of newCatalysts) {
      if (cat.impact === 'BULLISH' || cat.impact === 'BEARISH') score += 25;
      else score += 10;
    }

    // Indicator shifts
    if (rsiStatus !== 'NORMAL') score += 15;
    if (macdCross !== 'NONE') score += 15;

    // Source divergence attention
    if (isDivergent) score += 10;

    const clampedScore = Math.min(100, Math.round(score));

    let severity: DiffSeverity = 'UNCHANGED';
    if (clampedScore >= 65) severity = 'CRITICAL';
    else if (clampedScore >= 35) severity = 'MODERATE';
    else if (clampedScore > 10) severity = 'LOW';

    return { priorityScore: clampedScore, severity };
  }

  private generateKeyTakeaway(
    symbol: string,
    percentDelta: number,
    priceDelta: number,
    catalysts: CatalystEvent[],
    rsiStatus: string,
    macdCross: string,
    volumeRatio: number,
    isDivergent: boolean
  ): string {
    const parts: string[] = [];

    // Direction & Move
    if (percentDelta > 0) {
      parts.push(`Advanced +₹${priceDelta.toFixed(2)} (+${percentDelta}%)`);
    } else if (percentDelta < 0) {
      parts.push(`Declined -₹${Math.abs(priceDelta).toFixed(2)} (${percentDelta}%)`);
    } else {
      parts.push(`Unchanged at current levels`);
    }

    // Catalyst mention
    if (catalysts.length > 0) {
      const topCat = catalysts[0];
      parts.push(`following ${topCat.source} catalyst: "${topCat.headline}"`);
    }

    // Technical flags
    if (rsiStatus === 'OVERBOUGHT_ENTERED') parts.push(`• RSI crossed into overbought zone (≥70)`);
    if (rsiStatus === 'OVERSOLD_ENTERED') parts.push(`• RSI reached oversold territory (≤30)`);
    if (macdCross === 'BULLISH_CROSS') parts.push(`• Bullish MACD crossover formed`);
    if (macdCross === 'BEARISH_CROSS') parts.push(`• Bearish MACD signal generated`);
    if (volumeRatio > 1.6) parts.push(`• Volume elevated (${volumeRatio}x average)`);
    if (isDivergent) parts.push(`• ⚠️ Primary and secondary data feeds show active spread`);

    return parts.join(' ');
  }
}

export const diffEngine = new DiffEngine();
