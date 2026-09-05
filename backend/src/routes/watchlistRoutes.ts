import { Router, Request, Response } from 'express';
import { watchlistService } from '../services/watchlistService.js';
import { marketDataService } from '../services/marketDataService.js';

const router = Router();

// GET /api/watchlist/all - List all user watchlists
router.get('/all', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'default_user';
  const watchlists = watchlistService.getUserWatchlists(userId);
  res.json({
    userId,
    watchlists,
  });
});

// GET /api/watchlist - List active/selected watchlist with live ticker states
router.get('/', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'default_user';
  const watchlistId = req.query.watchlistId as string | undefined;

  const watchlists = watchlistService.getUserWatchlists(userId);
  const activeWatchlist = watchlistId
    ? watchlists.find((w) => w.id === watchlistId) || watchlists[0]
    : watchlists[0];

  const symbols = activeWatchlist?.symbols || watchlistService.getWatchlist(userId, watchlistId);
  const tickers = marketDataService.getAllTickerStates(symbols);

  res.json({
    userId,
    watchlist: activeWatchlist,
    symbols,
    tickers,
    updatedAt: Date.now(),
  });
});

// POST /api/watchlist/create - Create new named watchlist
router.post('/create', (req: Request, res: Response) => {
  const { name, symbols = ['NVDA', 'AAPL'], userId = 'default_user' } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'Watchlist name is required' });
    return;
  }

  const created = watchlistService.createWatchlist(name, symbols, userId);
  const allWatchlists = watchlistService.getUserWatchlists(userId);

  res.status(201).json({
    message: `Watchlist "${created.name}" created`,
    watchlist: created,
    watchlists: allWatchlists,
  });
});

// PUT /api/watchlist/:id/rename - Rename watchlist
router.put('/:id/rename', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, userId = 'default_user' } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'New name is required' });
    return;
  }

  const updated = watchlistService.renameWatchlist(id, name, userId);
  if (!updated) {
    res.status(404).json({ error: `Watchlist "${id}" not found` });
    return;
  }

  const allWatchlists = watchlistService.getUserWatchlists(userId);
  res.json({
    message: `Watchlist renamed to "${updated.name}"`,
    watchlist: updated,
    watchlists: allWatchlists,
  });
});

// DELETE /api/watchlist/:id - Delete watchlist
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req.query.userId as string) || (req.body && req.body.userId) || 'default_user';

  const result = watchlistService.deleteWatchlist(id, userId);
  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }

  res.json({
    message: 'Watchlist deleted',
    watchlists: result.remainingWatchlists,
  });
});

// POST /api/watchlist/symbols/add or POST /api/watchlist
router.post('/symbols/add', (req: Request, res: Response) => {
  const { symbol, watchlistId, userId = 'default_user' } = req.body;
  if (!symbol) {
    res.status(400).json({ error: 'Symbol is required' });
    return;
  }

  const result = watchlistService.addSymbol(symbol, userId, watchlistId);
  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }

  const tickers = marketDataService.getAllTickerStates(result.symbols);
  res.status(201).json({
    userId,
    watchlist: result.watchlist,
    symbols: result.symbols,
    tickers,
    message: `Added ${symbol.toUpperCase()} to watchlist`,
  });
});

// Backward compatible POST /api/watchlist
router.post('/', (req: Request, res: Response) => {
  const { symbol, watchlistId, userId = 'default_user' } = req.body;
  if (!symbol) {
    res.status(400).json({ error: 'Symbol is required' });
    return;
  }

  const result = watchlistService.addSymbol(symbol, userId, watchlistId);
  if (!result.success) {
    res.status(400).json({ error: result.message });
    return;
  }

  const tickers = marketDataService.getAllTickerStates(result.symbols);
  res.status(201).json({
    userId,
    watchlist: result.watchlist,
    symbols: result.symbols,
    tickers,
    message: `Added ${symbol.toUpperCase()} to watchlist`,
  });
});

// POST /api/watchlist/symbols/remove
router.post('/symbols/remove', (req: Request, res: Response) => {
  const { symbol, watchlistId, userId = 'default_user' } = req.body;
  if (!symbol) {
    res.status(400).json({ error: 'Symbol is required' });
    return;
  }

  const result = watchlistService.removeSymbol(symbol, userId, watchlistId);
  const tickers = marketDataService.getAllTickerStates(result.symbols);

  res.json({
    userId,
    watchlist: result.watchlist,
    symbols: result.symbols,
    tickers,
    message: `Removed ${symbol.toUpperCase()} from watchlist`,
  });
});

// DELETE /api/watchlist/symbol/:symbol
router.delete('/symbol/:symbol', (req: Request, res: Response) => {
  const { symbol } = req.params;
  const userId = (req.query.userId as string) || 'default_user';
  const watchlistId = req.query.watchlistId as string | undefined;

  const result = watchlistService.removeSymbol(symbol, userId, watchlistId);
  const tickers = marketDataService.getAllTickerStates(result.symbols);

  res.json({
    userId,
    watchlist: result.watchlist,
    symbols: result.symbols,
    tickers,
    message: `Removed ${symbol.toUpperCase()} from watchlist`,
  });
});

// PUT /api/watchlist/reorder
router.put('/reorder', (req: Request, res: Response) => {
  const { symbols, watchlistId, userId = 'default_user' } = req.body;
  if (!Array.isArray(symbols)) {
    res.status(400).json({ error: 'symbols array is required' });
    return;
  }

  const reordered = watchlistService.reorderSymbols(symbols, userId, watchlistId);
  res.json({
    userId,
    symbols: reordered,
  });
});

export default router;

