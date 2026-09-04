import { Router, Request, Response } from 'express';
import { watchlistService } from '../services/watchlistService.js';
import { marketDataService } from '../services/marketDataService.js';

const router = Router();

// GET /api/watchlist - List current watchlist with live ticker states
router.get('/', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'default_user';
  const symbols = watchlistService.getWatchlist(userId);
  const tickers = marketDataService.getAllTickerStates(symbols);

  res.json({
    userId,
    symbols,
    tickers,
    updatedAt: Date.now(),
  });
});

// POST /api/watchlist - Add symbol to watchlist
router.post('/', (req: Request, res: Response) => {
  const { symbol, userId = 'default_user' } = req.body;
  if (!symbol) {
    res.status(400).json({ error: 'Symbol is required' });
    return;
  }

  const result = watchlistService.addSymbol(symbol, userId);
  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }

  const tickers = marketDataService.getAllTickerStates(result.symbols);
  res.status(201).json({
    userId,
    symbols: result.symbols,
    tickers,
    message: `Added ${symbol.toUpperCase()} to watchlist`,
  });
});

// DELETE /api/watchlist/:symbol - Remove symbol from watchlist
router.delete('/:symbol', (req: Request, res: Response) => {
  const { symbol } = req.params;
  const userId = (req.query.userId as string) || 'default_user';

  const result = watchlistService.removeSymbol(symbol, userId);
  const tickers = marketDataService.getAllTickerStates(result.symbols);

  res.json({
    userId,
    symbols: result.symbols,
    tickers,
    message: `Removed ${symbol.toUpperCase()} from watchlist`,
  });
});

// PUT /api/watchlist/reorder - Reorder symbols
router.put('/reorder', (req: Request, res: Response) => {
  const { symbols, userId = 'default_user' } = req.body;
  if (!Array.isArray(symbols)) {
    res.status(400).json({ error: 'symbols array is required' });
    return;
  }

  const reordered = watchlistService.reorderSymbols(symbols, userId);
  res.json({
    userId,
    symbols: reordered,
  });
});

export default router;
