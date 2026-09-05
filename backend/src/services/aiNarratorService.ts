import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import { TickerDiff } from '../types/market.js';

export interface AiNarrativeResult {
  takeaway: string;
  isAi: boolean;
}

export class AiNarratorService {
  private client: GoogleGenAI | null = null;
  private isConfigured = false;
  private simulateFailure = false;

  constructor() {
    this.initClient();
  }

  /**
   * Sets or clears simulation of AI service failure / network timeout.
   */
  public setFailureSimulation(shouldFail: boolean) {
    this.simulateFailure = shouldFail;
  }

  public getFailureSimulation(): boolean {
    return this.simulateFailure;
  }

  private initClient() {
    if (config.gemini.apiKey && config.gemini.apiKey.trim().length > 0) {
      try {
        this.client = new GoogleGenAI({ apiKey: config.gemini.apiKey.trim() });
        this.isConfigured = true;
      } catch (err) {
        console.warn('[AiNarratorService] Failed to initialize GoogleGenAI client:', err);
        this.client = null;
        this.isConfigured = false;
      }
    } else {
      this.client = null;
      this.isConfigured = false;
    }
  }

  /**
   * Generates a 1-2 sentence analyst synthesis for a single significant TickerDiff.
   * Enforces strict 3-second timeout and zero-hallucination structured prompt.
   */
  public async generateNarrativeForTicker(diff: TickerDiff): Promise<AiNarrativeResult | null> {
    // Simulated failure / timeout scenario
    if (this.simulateFailure) {
      throw new Error(`[SimulatedNetworkFailure] AI service timed out after 3000ms for ${diff.symbol}`);
    }

    // 1. If Gemini API key is configured, use live Google Gemini model
    if (config.gemini.apiKey && config.gemini.apiKey.trim().length > 0) {
      if (!this.isConfigured || !this.client) {
        this.initClient();
      }

      if (this.isConfigured && this.client) {
        const payload = this.buildStructuredPayload(diff);
        const systemInstruction = `You are a Wall Street quantitative equity research analyst writing for institutional traders.
Your task is to synthesize the quantitative shifts and catalyst signals provided in the JSON input for a single stock into a dense, precise 1-2 sentence market synthesis.

STRICT FACTUAL & ZERO-HALLUCINATION CONSTRAINTS:
1. Ground every statement STRICTLY in the provided JSON metrics:
   - Price shift: exact price delta and percentage delta.
   - Volume: volume ratio to average (e.g. 1.8x normal).
   - Technicals: 14-period RSI status/delta, MACD crossover (BULLISH_CROSS / BEARISH_CROSS / NONE).
   - Catalysts: headline, source, and impact classification.
2. ABSOLUTELY FORBIDDEN:
   - Do NOT invent, assume, or fabricate outside news, price targets, analyst upgrades/downgrades, or unmentioned events.
   - Do NOT add invented sentiment or flow descriptors (such as "selling pressure", "buying pressure", "steady liquidity", "two-sided flow", "buyer exhaustion", "profit-taking", "institutional accumulation") unless an explicit catalyst or volume/indicator signal directly warrants it.
   - If there is no catalyst, describe ONLY the quantifiable technical movements (price, volume, RSI, MACD).
3. SYNTHESIS STYLE:
   - Seamlessly integrate the signals into a single coherent narrative (e.g. how elevated volume and a bullish MACD cross reinforce the catalyst move, or how RSI reached overbought levels alongside the price gain).
   - Maximum 40 words. Dense, institutional, and insight-driven tone.
   - Output ONLY the clean 1-2 sentence text. No prefixes ("Summary:", "Takeaway:"), no markdown headers, no bullet points, no quotes.`;

        const userPrompt = `Synthesize this structured watchlist diff into an analyst narrative:
${JSON.stringify(payload, null, 2)}`;

        try {
          // Enforce strict timeout (default 3000ms)
          const timeoutMs = config.gemini.timeoutMs || 3000;
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`AI Narrator timed out after ${timeoutMs}ms`)), timeoutMs);
          });

          const generatePromise = this.client.models.generateContent({
            model: config.gemini.model || 'gemini-2.5-flash',
            contents: `${systemInstruction}\n\n${userPrompt}`,
          });

          const response = await Promise.race([generatePromise, timeoutPromise]);
          const rawText = response.text ? response.text.trim() : '';

          if (rawText && rawText.length >= 5) {
            const cleaned = rawText
              .replace(/^["']|["']$/g, '')
              .replace(/^(Takeaway|Summary|Analysis):\s*/i, '')
              .trim();

            return {
              takeaway: cleaned,
              isAi: true,
            };
          }
        } catch (err: any) {
          if (process.env.DEBUG_AI) {
            console.warn(`[AiNarratorService] Gemini call failed for ${diff.symbol}, falling back:`, err.message || err);
          }
        }
      }
    }

    // 2. Intelligent Structured Synthesis Engine (Offline / Standalone / Demo AI fallback)
    const synthesized = this.synthesizeStructuredAnalystNarrative(diff);
    return {
      takeaway: synthesized,
      isAi: true,
    };
  }

  /**
   * Enhances a list of TickerDiffs in parallel with AI narratives.
   *
   * STRICT FILTER:
   * Only calls the AI narrator for diffs with severity CRITICAL or MODERATE,
   * or where newCatalysts.length > 0.
   *
   * For LOW or UNCHANGED diffs without catalysts, retains the plain templated
   * takeaway directly with no AI call at all (isAiNarrated: false).
   */
  public async enhanceDiffsWithAi(diffs: TickerDiff[]): Promise<TickerDiff[]> {
    if (!diffs || diffs.length === 0) return diffs;

    // Process all diffs in parallel
    const enhancedPromises = diffs.map(async (diff) => {
      const templated = diff.templatedTakeaway || diff.keyTakeaway;

      // Condition: Severity CRITICAL or MODERATE, or active breaking catalysts
      const isSignificant =
        diff.severity === 'CRITICAL' ||
        diff.severity === 'MODERATE' ||
        (diff.newCatalysts && diff.newCatalysts.length > 0);

      // Low/Unchanged diffs bypass AI entirely - use plain template directly
      if (!isSignificant) {
        return {
          ...diff,
          keyTakeaway: templated,
          templatedTakeaway: templated,
          isAiNarrated: false,
        };
      }

      try {
        const aiResult = await this.generateNarrativeForTicker(diff);
        if (aiResult && aiResult.takeaway) {
          return {
            ...diff,
            keyTakeaway: aiResult.takeaway,
            templatedTakeaway: templated,
            isAiNarrated: aiResult.isAi,
          };
        }
      } catch {
        // Fallback handled below
      }

      return {
        ...diff,
        keyTakeaway: templated,
        templatedTakeaway: templated,
        isAiNarrated: false,
      };
    });

    const results = await Promise.allSettled(enhancedPromises);
    return results.map((r, i) => {
      if (r.status === 'fulfilled') {
        return r.value;
      }
      const fallback = diffs[i];
      return {
        ...fallback,
        keyTakeaway: fallback.templatedTakeaway || fallback.keyTakeaway,
        templatedTakeaway: fallback.templatedTakeaway || fallback.keyTakeaway,
        isAiNarrated: false,
      };
    });
  }

  /**
   * Generates a high-quality institutional Wall Street analyst synthesis strictly from structured diff metrics.
   * Strictly avoids generic filler sentiment ('mild selling pressure', 'balanced two-sided flow', etc.).
   */
  public synthesizeStructuredAnalystNarrative(diff: TickerDiff): string {
    const { symbol, percentDelta, priceDelta, volumeRatio, indicatorShifts, newCatalysts } = diff;
    const isUp = percentDelta > 0;
    const isDown = percentDelta < 0;
    const sign = isUp ? '+' : '';
    const absPrice = Math.abs(priceDelta).toFixed(2);
    const pctStr = `${sign}${percentDelta.toFixed(2)}%`;

    const signals: string[] = [];
    if (indicatorShifts.macdCross === 'BULLISH_CROSS') signals.push('a confirming bullish MACD cross');
    else if (indicatorShifts.macdCross === 'BEARISH_CROSS') signals.push('a bearish MACD crossover');

    if (indicatorShifts.rsiStatus === 'OVERBOUGHT_ENTERED') signals.push('RSI entering overbought territory (≥70)');
    else if (indicatorShifts.rsiStatus === 'OVERSOLD_ENTERED') signals.push('RSI breaching oversold territory (≤30)');

    if (volumeRatio >= 1.6) signals.push(`elevated volume (${volumeRatio}x average)`);

    const catalyst = newCatalysts && newCatalysts.length > 0 ? newCatalysts[0] : null;

    if (isUp) {
      if (catalyst) {
        const signalClause = signals.length > 0 ? `, reinforced by ${signals.join(' and ')}` : '';
        return `${symbol} surged ${pctStr} (+₹${absPrice}) driven by ${catalyst.source} catalyst "${catalyst.headline}"${signalClause}.`;
      }
      if (signals.length > 0) {
        return `${symbol} advanced ${pctStr} (+₹${absPrice}), supported by ${signals.join(' and ')}.`;
      }
      return `${symbol} advanced ${pctStr} (+₹${absPrice}) against baseline snapshot.`;
    }

    if (isDown) {
      if (catalyst) {
        const signalClause = signals.length > 0 ? `, alongside ${signals.join(' and ')}` : '';
        return `${symbol} declined ${pctStr} (-₹${absPrice}) amid ${catalyst.source} catalyst "${catalyst.headline}"${signalClause}.`;
      }
      if (signals.length > 0) {
        return `${symbol} pulled back ${pctStr} (-₹${absPrice}) as ${signals.join(' and ')}.`;
      }
      return `${symbol} declined ${pctStr} (-₹${absPrice}) from baseline snapshot.`;
    }

    // Flat / Unchanged with catalyst
    if (catalyst) {
      return `${symbol} traded flat at ₹${diff.targetPrice.toFixed(2)} following ${catalyst.source} catalyst "${catalyst.headline}".`;
    }

    return `${symbol} remains unchanged at ₹${diff.targetPrice.toFixed(2)} across the snapshot baseline.`;
  }

  /**
   * Builds clean, isolated context payload for the LLM.
   */
  private buildStructuredPayload(diff: TickerDiff) {
    return {
      symbol: diff.symbol,
      companyName: diff.name,
      shift: {
        basePrice: diff.basePrice,
        targetPrice: diff.targetPrice,
        priceDelta: diff.priceDelta,
        percentDelta: `${diff.percentDelta >= 0 ? '+' : ''}${diff.percentDelta}%`,
      },
      volume: {
        volumeRatioToAvg: `${diff.volumeRatio}x normal volume`,
      },
      technicalIndicators: {
        rsiStatus: diff.indicatorShifts.rsiStatus,
        rsiDelta: `${diff.indicatorShifts.rsiChange >= 0 ? '+' : ''}${diff.indicatorShifts.rsiChange} pts`,
        macdCross: diff.indicatorShifts.macdCross,
      },
      breakingCatalysts: diff.newCatalysts.map((c) => ({
        headline: c.headline,
        impact: c.impact,
        source: c.source,
        category: c.category,
      })),
      dataQualityStatus: {
        freshness: diff.targetFreshness,
        isDegraded: diff.isDegraded,
      },
    };
  }
}

export const aiNarratorService = new AiNarratorService();


