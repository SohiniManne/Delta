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

// Root landing page (for direct browser visits to backend)
app.get('/', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Delta API Server</title>
        <style>
          body { background: #0B0E14; color: #F1F5F9; font-family: -apple-system, sans-serif; padding: 40px; }
          .card { background: #151F2E; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          h1 { color: #00E5FF; margin-top: 0; }
          a { color: #00E5FF; text-decoration: none; font-weight: bold; }
          a:hover { text-decoration: underline; }
          .btn { display: inline-block; background: #00E5FF; color: #03131A; padding: 10px 18px; border-radius: 6px; margin-top: 15px; font-weight: bold; }
          ul { line-height: 1.8; }
          code { background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: #38BDF8; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>DELTA — Market Watchlist API</h1>
          <p>The backend API server is running on <code>port 5000</code>.</p>
          <p>To view the <strong>React UI</strong>, open the frontend app:</p>
          <a class="btn" href="http://localhost:5173" target="_blank">Open React Frontend (localhost:5173) &rarr;</a>
          <h3 style="margin-top: 25px;">Available API Endpoints:</h3>
          <ul>
            <li><a href="/api/diff/last-seen">/api/diff/last-seen</a> (Structured Diff & Changelog)</li>
            <li><a href="/api/watchlist">/api/watchlist</a> (Active Watchlist)</li>
            <li><a href="/api/snapshots">/api/snapshots</a> (Saved Checkpoints)</li>
            <li><a href="/api/health">/api/health</a> (Server Health)</li>
          </ul>
        </div>
      </body>
    </html>
  `);
});

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
