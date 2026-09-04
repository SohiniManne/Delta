import { Router, Request, Response } from 'express';
import { snapshotService } from '../services/snapshotService.js';
import { watchlistService } from '../services/watchlistService.js';

const router = Router();

// GET /api/snapshots - List all snapshots
router.get('/', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'default_user';
  const list = snapshotService.listSnapshots(userId);
  res.json({ snapshots: list });
});

// POST /api/snapshots/commit - Commit a new snapshot
router.post('/commit', (req: Request, res: Response) => {
  const { name, userId = 'default_user', baselineType = 'USER_COMMIT' } = req.body;
  const symbols = watchlistService.getWatchlist(userId);

  const snapshot = snapshotService.commitSnapshot(symbols, name, baselineType, userId);
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
  const success = snapshotService.deleteSnapshot(id, userId);
  if (!success) {
    res.status(404).json({ error: 'Snapshot not found' });
    return;
  }
  res.json({ message: 'Snapshot deleted successfully' });
});

export default router;
