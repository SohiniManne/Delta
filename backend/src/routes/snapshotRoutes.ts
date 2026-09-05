import { Router, Request, Response } from 'express';
import { snapshotService } from '../services/snapshotService.js';
import { watchlistService } from '../services/watchlistService.js';

const router = Router();

// GET /api/snapshots - List all snapshots
router.get('/', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'default_user';
  const watchlistId = req.query.watchlistId as string | undefined;
  const list = snapshotService.listSnapshots(userId, watchlistId);
  res.json({ snapshots: list });
});

// POST /api/snapshots/commit - Commit a new snapshot
router.post('/commit', (req: Request, res: Response) => {
  const { name, userId = 'default_user', baselineType = 'USER_COMMIT', watchlistId } = req.body;
  const symbols = watchlistService.getWatchlist(userId, watchlistId);

  const snapshot = snapshotService.commitSnapshot(symbols, name, baselineType, userId, watchlistId);
  res.status(201).json({
    message: 'Checkpoint successfully committed',
    snapshot,
  });
});

// GET /api/snapshots/:id - Get specific snapshot
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const snapshot = snapshotService.getSnapshotById(id);
  if (!snapshot) {
    res.status(404).json({ error: 'Snapshot not found' });
    return;
  }
  res.json({ snapshot });
});

// DELETE /api/snapshots/:id - Delete snapshot
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req.query.userId as string) || 'default_user';
  const watchlistId = req.query.watchlistId as string | undefined;
  const success = snapshotService.deleteSnapshot(id, userId, watchlistId);
  if (!success) {
    res.status(404).json({ error: 'Snapshot not found' });
    return;
  }
  res.json({ message: 'Snapshot deleted successfully' });
});

export default router;
