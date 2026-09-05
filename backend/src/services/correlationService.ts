import { CorrelationBreakEvent, TickerDiff, TickerState } from '../types/market.js';

export class CorrelationService {
  // Curated historical baseline correlation coefficients for sector peers
  private knownCorrelations: Record<string, number> = {
    'INFY:TCS': 0.88,
    'TCS:INFY': 0.88,
    'INFY:WIPRO': 0.82,
    'WIPRO:INFY': 0.82,
    'TCS:WIPRO': 0.79,
    'WIPRO:TCS': 0.79,
    'HCLTECH:INFY': 0.84,
    'INFY:HCLTECH': 0.84,
    'HCLTECH:TECHM': 0.78,
    'TECHM:HCLTECH': 0.78,
    'HDFCBANK:ICICIBANK': 0.86,
    'ICICIBANK:HDFCBANK': 0.86,
    'HDFCBANK:SBIN': 0.76,
    'SBIN:HDFCBANK': 0.76,
    'ICICIBANK:SBIN': 0.78,
    'SBIN:ICICIBANK': 0.78,
    'RELIANCE:SBIN': 0.72,
    'SBIN:RELIANCE': 0.72,
    'BTC:ETH': 0.89,
    'ETH:BTC': 0.89,
    'ETH:SOL': 0.84,
    'SOL:ETH': 0.84,
    'BTC:SOL': 0.81,
    'SOL:BTC': 0.81,
    'MATIC:ETH': 0.79,
    'ETH:MATIC': 0.79,
  };

  /**
   * Compute Pearson correlation coefficient r between two numeric series.
   */
  public calculatePearsonCorrelation(seriesA: number[], seriesB: number[]): number {
    if (!seriesA || !seriesB || seriesA.length < 3 || seriesB.length < 3) {
      return 0;
    }

    const n = Math.min(seriesA.length, seriesB.length);
    const a = seriesA.slice(-n);
    const b = seriesB.slice(-n);

    const meanA = a.reduce((sum, val) => sum + val, 0) / n;
    const meanB = b.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let sumSqA = 0;
    let sumSqB = 0;

    for (let i = 0; i < n; i++) {
      const diffA = a[i] - meanA;
      const diffB = b[i] - meanB;
      numerator += diffA * diffB;
      sumSqA += diffA * diffA;
      sumSqB += diffB * diffB;
    }

    const denominator = Math.sqrt(sumSqA * sumSqB);
    if (denominator === 0) return 0;

    const r = numerator / denominator;
    return parseFloat(Math.max(-1, Math.min(1, r)).toFixed(2));
  }

  /**
   * Retrieve rolling baseline correlation for a pair of symbols.
   */
  public getPairCorrelation(symA: string, symB: string, sparkA?: number[], sparkB?: number[]): number {
    const key = `${symA.toUpperCase()}:${symB.toUpperCase()}`;
    const baseKnown = this.knownCorrelations[key];
    if (baseKnown !== undefined) {
      return baseKnown;
    }

    if (sparkA && sparkB && sparkA.length >= 5 && sparkB.length >= 5) {
      return this.calculatePearsonCorrelation(sparkA, sparkB);
    }

    return 0;
  }

  /**
   * Detect correlation break events across active ticker diffs in a watchlist.
   * Threshold: Historical correlation r >= 0.70 AND divergence spread >= 3.0%.
   */
  public detectCorrelationBreaks(diffs: TickerDiff[]): CorrelationBreakEvent[] {
    const breakEvents: CorrelationBreakEvent[] = [];
    const seenPairs = new Set<string>();

    for (let i = 0; i < diffs.length; i++) {
      for (let j = i + 1; j < diffs.length; j++) {
        const diffA = diffs[i];
        const diffB = diffs[j];

        const pairKey = [diffA.symbol, diffB.symbol].sort().join(':');
        if (seenPairs.has(pairKey)) continue;

        const correlation = this.getPairCorrelation(
          diffA.symbol,
          diffB.symbol,
          diffA.sparkline,
          diffB.sparkline
        );

        // Historical correlation baseline threshold: r >= 0.70
        if (correlation >= 0.70) {
          const spreadPercent = parseFloat(Math.abs(diffA.percentDelta - diffB.percentDelta).toFixed(2));

          // Correlation Break Trigger: spread >= 3.0%
          if (spreadPercent >= 3.0) {
            seenPairs.add(pairKey);

            const leader = diffA.percentDelta >= diffB.percentDelta ? diffA : diffB;
            const laggard = diffA.percentDelta < diffB.percentDelta ? diffA : diffB;

            const severity = spreadPercent >= 4.5 ? 'CRITICAL' : 'MODERATE';
            const headline = `${leader.symbol}/${laggard.symbol} Correlation Decoupled: ${leader.symbol} ${leader.percentDelta >= 0 ? '+' : ''}${leader.percentDelta.toFixed(2)}% vs ${laggard.symbol} ${laggard.percentDelta >= 0 ? '+' : ''}${laggard.percentDelta.toFixed(2)}%`;
            const summary = `Historically correlated sector peers (r=${correlation.toFixed(2)}) diverged by ${spreadPercent}% in the current diff session.`;

            const event: CorrelationBreakEvent = {
              id: `corr-break-${leader.symbol.toLowerCase()}-${laggard.symbol.toLowerCase()}-${Date.now()}`,
              tickerA: leader.symbol,
              tickerB: laggard.symbol,
              nameA: leader.name,
              nameB: laggard.name,
              historicalCorrelation: correlation,
              deltaA: leader.percentDelta,
              deltaB: laggard.percentDelta,
              spreadPercent,
              severity,
              headline,
              summary,
              timestamp: Date.now(),
            };

            breakEvents.push(event);

            // Attach correlation break reference directly to both diffs
            if (!diffA.correlationBreak) diffA.correlationBreak = event;
            if (!diffB.correlationBreak) diffB.correlationBreak = event;
          }
        }
      }
    }

    return breakEvents;
  }
}

export const correlationService = new CorrelationService();
