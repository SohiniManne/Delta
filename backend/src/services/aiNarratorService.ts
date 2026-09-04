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

  constructor() {
    this.initClient();
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
   * Generates a 1-2 sentence analyst synthesis for a single TickerDiff.
   * Enforces strict 3-second timeout and zero-hallucination prompt.
   * Returns null if API key is missing, call fails, or timeout occurs.
   */
  public async generateNarrativeForTicker(diff: TickerDiff): Promise<AiNarrativeResult | null> {
    // Re-check client in case API key was updated at runtime
    if (!this.isConfigured || !this.client) {
      this.initClient();
      if (!this.isConfigured || !this.client) {
        return null;
      }
    }

    const payload = this.buildStructuredPayload(diff);
    const systemInstruction = `You are an elite Wall Street quantitative equity research analyst.
Your task is to write a concise, professional 1-2 sentence market synthesis summarizing what changed for a single stock between two watchlist snapshots.

STRICT CONSTRAINTS:
1. ONLY synthesize the exact quantitative metrics, technical shifts, and catalyst events provided in the JSON input.
2. NEVER invent, assume, or hallucinate outside news, numbers, price targets, or unmentioned events.
3. Synthesize the signals together into an integrated narrative (e.g. how high volume and a bullish MACD cross confirm a catalyst rally, or how RSI overbought conditions accompany the price gain).
4. Do NOT output bullet points, greetings, quotes, or prefixes like "Summary:" or "Takeaway:". Output ONLY the clean 1-2 sentence text.
5. Maximum 40 words. Instituional, dense, and insight-driven tone.`;

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

      if (!rawText || rawText.length < 5) {
        return null;
      }

      // Clean any accidental markdown or quotes
      const cleaned = rawText
        .replace(/^["']|["']$/g, '')
        .replace(/^(Takeaway|Summary|Analysis):\s*/i, '')
        .trim();

      return {
        takeaway: cleaned,
        isAi: true,
      };
    } catch (err: any) {
      // Graceful silent fallback - never crash or expose errors to caller
      if (process.env.DEBUG_AI) {
        console.warn(`[AiNarratorService] Fallback triggered for ${diff.symbol}:`, err.message || err);
      }
      return null;
    }
  }

  /**
   * Enhances a list of TickerDiffs in parallel with AI narratives.
   * If any ticker fails or times out, it gracefully retains its rule-based templatedTakeaway.
   */
  public async enhanceDiffsWithAi(diffs: TickerDiff[]): Promise<TickerDiff[]> {
    if (!diffs || diffs.length === 0) return diffs;

    // Fast path: if not configured, mark all as templated and return immediately
    if (!this.isConfigured && (!config.gemini.apiKey || config.gemini.apiKey.trim().length === 0)) {
      return diffs.map((d) => ({
        ...d,
        templatedTakeaway: d.templatedTakeaway || d.keyTakeaway,
        isAiNarrated: false,
      }));
    }

    // Process all diffs in parallel
    const enhancedPromises = diffs.map(async (diff) => {
      const templated = diff.templatedTakeaway || diff.keyTakeaway;
      try {
        const aiResult = await this.generateNarrativeForTicker(diff);
        if (aiResult && aiResult.takeaway) {
          return {
            ...diff,
            keyTakeaway: aiResult.takeaway,
            templatedTakeaway: templated,
            isAiNarrated: true,
          };
        }
      } catch {
        // Ignored, fallback below
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
