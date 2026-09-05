import { Router, Request, Response } from 'express';
import { marketDataService } from '../services/marketDataService.js';

const router = Router();

// GET /api/market/quote/:symbol
router.get('/quote/:symbol', (req: Request, res: Response) => {
  const { symbol } = req.params;
  const quote = marketDataService.getTickerState(symbol);
  if (!quote) {
    res.status(404).json({ error: `Ticker ${symbol} not found` });
    return;
  }
  res.json(quote);
});

// GET /api/market/search?q=:query
router.get('/search', (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  const results = marketDataService.searchTickers(query);
  res.json({ results });
});

// GET /api/market/catalysts
router.get('/catalysts', (req: Request, res: Response) => {
  const symbol = req.query.symbol as string | undefined;
  const since = req.query.since ? parseInt(req.query.since as string, 10) : undefined;
  const catalysts = marketDataService.getCatalysts(symbol, since);
  res.json({ catalysts });
});

// POST /api/market/catalysts - Add breaking catalyst
router.post('/catalysts', (req: Request, res: Response) => {
  const { symbol, headline, source, impact, summary, category } = req.body;
  if (!symbol || !headline || !source || !impact || !summary) {
    res.status(400).json({ error: 'Missing required catalyst fields' });
    return;
  }

  const created = marketDataService.addCatalyst({
    symbol,
    headline,
    source,
    impact,
    summary,
    category,
  });

  res.status(201).json({ catalyst: created });
});

// --- Simulation and Chaos Controls for Live Demoing ---

// POST /api/market/simulate/tick
router.post('/simulate/tick', (_req: Request, res: Response) => {
  marketDataService.simulateMicroTick();
  res.json({ message: 'Market tick triggered' });
});

// POST /api/market/simulate/stale
router.post('/simulate/stale', (req: Request, res: Response) => {
  const { symbol, staleMinutes } = req.body;
  if (!symbol) {
    res.status(400).json({ error: 'symbol is required' });
    return;
  }

  const age = staleMinutes !== undefined ? staleMinutes : 22; // default 22m stale
  marketDataService.setStalenessOverride(symbol, age);
  const updated = marketDataService.getTickerState(symbol);
  res.json({ message: `Staleness override set for ${symbol}`, ticker: updated });
});

// POST /api/market/simulate/divergence
router.post('/simulate/divergence', (req: Request, res: Response) => {
  const { symbol, divergencePercent } = req.body;
  if (!symbol) {
    res.status(400).json({ error: 'symbol is required' });
    return;
  }

  const spread = divergencePercent !== undefined ? divergencePercent : 1.25; // 1.25% spread
  marketDataService.setDivergenceOverride(symbol, spread);
  const updated = marketDataService.getTickerState(symbol);
  res.json({ message: `Feed divergence override set for ${symbol}`, ticker: updated });
});

// POST /api/market/simulate/shock
router.post('/simulate/shock', (req: Request, res: Response) => {
  const { symbol, percentShift } = req.body;
  if (!symbol || percentShift === undefined) {
    res.status(400).json({ error: 'symbol and percentShift are required' });
    return;
  }

  const updated = marketDataService.triggerPriceShock(symbol, Number(percentShift));
  res.json({ message: `Price shock of ${percentShift}% applied to ${symbol}`, ticker: updated });
});

// POST /api/market/simulate/ai-failure
router.post('/simulate/ai-failure', async (req: Request, res: Response) => {
  const { failed = true } = req.body;
  const { aiNarratorService } = await import('../services/aiNarratorService.js');
  aiNarratorService.setFailureSimulation(!!failed);
  res.json({ message: `AI failure simulation set to ${!!failed}`, simulateFailure: aiNarratorService.getFailureSimulation() });
});

// POST /api/market/simulate/reset
router.post('/simulate/reset', (_req: Request, res: Response) => {
  marketDataService.resetAllOverrides();
  res.json({ message: 'All market feed overrides reset to live nominal stream' });
});

export default router;
