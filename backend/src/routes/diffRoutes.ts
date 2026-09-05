import { Router, Request, Response } from 'express';
import { diffEngine } from '../services/diffEngine.js';
import { snapshotService } from '../services/snapshotService.js';
import { watchlistService } from '../services/watchlistService.js';
import { marketDataService } from '../services/marketDataService.js';
import { WatchlistSnapshot } from '../types/market.js';

const router = Router();

// GET /api/diff/last-seen - Structured diff against last-seen snapshot (or cold-start Open)
router.get('/last-seen', async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'default_user';
  const watchlistId = req.query.watchlistId as string | undefined;
  const symbols = watchlistService.getWatchlist(userId, watchlistId);

  // 1. Get base snapshot (either saved last-seen or synthesized Today's Market Open)
  const { snapshot: baseSnapshot, isColdStart } = snapshotService.getLastSeenOrColdStartBaseline(symbols, userId, watchlistId);

  // 2. Build live target snapshot
  const liveTickers = marketDataService.getAllTickerStates(symbols);
  const targetSnapshot: WatchlistSnapshot = {
    id: 'live',
    userId,
    watchlistId,
    name: 'Current Live State',
    timestamp: Date.now(),
    baselineType: 'USER_COMMIT',
    tickers: liveTickers,
  };

  // 3. Compute structured diff
  const report = await diffEngine.computeDiff(baseSnapshot, targetSnapshot, isColdStart);
  res.json(report);
});

// GET /api/diff/compare - Compare any two arbitrary snapshots
router.get('/compare', async (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'default_user';
  const watchlistId = req.query.watchlistId as string | undefined;
  const baseId = req.query.baseId as string;
  const targetId = (req.query.targetId as string) || 'live';

  if (!baseId) {
    res.status(400).json({ error: 'baseId query param is required' });
    return;
  }

  const symbols = watchlistService.getWatchlist(userId, watchlistId);

  // Retrieve base
  let baseSnapshot: WatchlistSnapshot | null = null;
  const upperBase = baseId.toUpperCase();

  if (upperBase === 'LAST_SEEN' || upperBase === 'LAST-SEEN' || upperBase === 'LAST_VISIT') {
    const { snapshot } = snapshotService.getLastSeenOrColdStartBaseline(symbols, userId, watchlistId);
    baseSnapshot = snapshot;
  } else if (upperBase === 'TODAY_OPEN' || upperBase === 'TODAY-OPEN' || baseId.startsWith('snap-synthetic-open')) {
    baseSnapshot = snapshotService.getSyntheticColdStartBaseline(symbols, userId, 'TODAY_OPEN', watchlistId);
  } else if (upperBase === 'PREVIOUS_CLOSE' || upperBase === 'YESTERDAY_CLOSE' || upperBase === 'YESTERDAY-CLOSE' || baseId === 'snap-yesterday-close') {
    baseSnapshot = snapshotService.getSnapshotById('snap-yesterday-close') || snapshotService.getSyntheticColdStartBaseline(symbols, userId, 'PREVIOUS_CLOSE', watchlistId);
  } else {
    baseSnapshot = snapshotService.getSnapshotById(baseId);
  }

  if (!baseSnapshot) {
    res.status(404).json({ error: `Base snapshot '${baseId}' not found` });
    return;
  }

  // Retrieve or synthesize target
  let targetSnapshot: WatchlistSnapshot | null = null;
  if (targetId === 'live') {
    const liveTickers = marketDataService.getAllTickerStates(symbols);
    targetSnapshot = {
      id: 'live',
      userId,
      watchlistId,
      name: 'Current Live State',
      timestamp: Date.now(),
      baselineType: 'USER_COMMIT',
      tickers: liveTickers,
    };
  } else {
    targetSnapshot = snapshotService.getSnapshotById(targetId);
  }

  if (!targetSnapshot) {
    res.status(404).json({ error: `Target snapshot '${targetId}' not found` });
    return;
  }

  const report = await diffEngine.computeDiff(baseSnapshot, targetSnapshot, false);
  res.json(report);
});

// POST /api/diff/acknowledge - "Catch Up / Mark Seen" action
router.post('/acknowledge', async (req: Request, res: Response) => {
  const { userId = 'default_user', watchlistId } = req.body;
  const symbols = watchlistService.getWatchlist(userId, watchlistId);

  const newSnapshot = snapshotService.acknowledgeCurrentState(symbols, userId, watchlistId);

  // Return fresh zero-delta report
  const report = await diffEngine.computeDiff(newSnapshot, newSnapshot, false);
  res.json({
    message: 'Watchlist acknowledged and updated to latest checkpoint',
    snapshot: newSnapshot,
    report,
  });
});

export default router;
