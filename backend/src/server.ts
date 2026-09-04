import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import watchlistRoutes from './routes/watchlistRoutes.js';
import snapshotRoutes from './routes/snapshotRoutes.js';
import diffRoutes from './routes/diffRoutes.js';
import marketRoutes from './routes/marketRoutes.js';

const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// API Routes
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/snapshots', snapshotRoutes);
app.use('/api/diff', diffRoutes);
app.use('/api/market', marketRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Delta Smart Market Watchlist API',
    version: '1.0.0',
    timestamp: Date.now(),
  });
});

// Start Server
app.listen(config.port, () => {
  console.log(`🚀 Delta Market Watchlist Backend running at http://localhost:${config.port}`);
  console.log(`📊 API endpoints ready:`);
  console.log(`   - Watchlist: http://localhost:${config.port}/api/watchlist`);
  console.log(`   - Diff Engine: http://localhost:${config.port}/api/diff/last-seen`);
  console.log(`   - Snapshots: http://localhost:${config.port}/api/snapshots`);
  console.log(`   - Market Feed: http://localhost:${config.port}/api/market/search?q=`);
});

export default app;
