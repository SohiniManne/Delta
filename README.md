# 🔺 DELTA — Smart Market Watchlist
> **Modeling Watchlist State as Versioned Snapshots & Structured Diffs**

Delta reimagines the modern market watchlist. Instead of bombarding traders with a chaotic, noisy stream of blinking numbers, Delta models market data as **versioned state snapshots**. When returning to your watchlist, Delta computes an institutional **structured diff** against your last-seen baseline—synthesizing quantitative price shifts, volume surges, technical indicator crossovers, breaking catalyst events, and feed quality audits into actionable intelligence.

---

## 🌟 Key Architecture & Features

1. **Versioned Snapshot & Structured Diff Engine**:
   - Computes $State(t_{\text{now}}) - State(t_{\text{base}})$.
   - Quantifies price/percent deltas, volume surge multiples ($>1.5\times$), 14-period RSI boundary shifts (entering Overbought $\ge 70$ or Oversold $\le 30$), and MACD histogram crossovers.
   - Computes a dynamic 0–100 **Attention Priority Score** and severity classification (`CRITICAL`, `MODERATE`, `LOW`, `UNCHANGED`).

2. **First-Class Cold-Start Fallback**:
   - If a new user visits with no prior session history, Delta gracefully generates a synthetic baseline against **Today's Market Open (09:30 AM)** or pre-market **Previous Day Close (04:00 PM)** without throwing errors.

3. **Data Quality & Degraded Visual Precision**:
   - Multi-tier freshness auditing: `REALTIME` ($<30\text{s}$), `DELAYED` ($30\text{s}-15\text{m}$), `STALE` ($>15\text{m}$).
   - Cross-exchange feed discrepancy detection (e.g. primary exchange vs. fallback feed diverging $>0.30\%$).
   - **No fake precision**: Degraded feeds visibly reflect uncertainty via approximation tildes (`~$212.4`), muted amber styling, dashed SVG sparklines (`strokeDasharray="3 3"`), and hoverable audit popovers.

4. **Time Travel Baseline Switcher (`TimeTravelBar`)**:
   - Seamlessly toggle the comparison baseline on the fly between:
     - **Last Visit / Checkpoint** (`LAST_SEEN`)
     - **Today's Market Open** (09:30 AM, `TODAY_OPEN`)
     - **Yesterday's Market Close** (04:00 PM, `PREVIOUS_CLOSE`)
   - Recomputes structured diffs instantly via `/api/diff/compare`.

5. **AI Diff Narrator (Google Gemini API)**:
   - Generates concise 1–2 sentence Wall Street analyst syntheses tailored to the structured diff payload.
   - **Strict Zero-Hallucination Envelope**: Passes strictly the quantified diff metrics and verified catalysts—never hallucinating external data.
   - **3-Second Timeout & Silent Fallback**: Enforces a strict 3,000ms timeout with silent, seamless fallback to the deterministic rule-based template. The UI never encounters a blank or error state.
   - Includes visual `✨ AI Analyst` / `📋 Rule-Based` tags and an interactive comparison mode.

6. **Multi-Trader Profiles & Local Persistence**:
   - Built-in trader profiles (`alice_quant`, `bob_macro`, `crypto_whale`, or custom ID) with persistent snapshot histories saved across sessions.

7. **Interactive Chaos & Simulation Toolbar**:
   - One-click buttons to simulate market micro-ticks, inject catalyst events, trigger stale data degradation on TSLA, or test cross-feed divergence on NVDA.

---

## ⚙️ Prerequisites

- **Node.js**: `v18.0.0` or higher (`v20 LTS` or `v22` recommended).
- **npm**: `v9.0.0` or higher (bundled with Node.js).
- **OS**: Windows, macOS, or Linux.

> [!NOTE]
> **Market Data is 100% Synthetic & Standalone**:
> The core market feed and simulation run entirely offline with zero external financial API keys required.
> An API key is **only** required for the optional AI Diff Narrator feature. If omitted, the app runs normally using its built-in deterministic rule-based generator.

---

## 🚀 Quick Start (Single Command)

### 1. Install Dependencies
From the project root folder:
```bash
npm run install:all
```
*(Installs dependencies across root, `backend/`, and `frontend/`)*

### 2. (Optional) Configure Gemini API Key
To enable the live AI Diff Narrator, create `backend/.env` (a template is provided in `backend/.env.example`):
```bash
cp backend/.env.example backend/.env
```
Add your key to `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_TIMEOUT_MS=3000
```
*(If left blank, the app silently uses the deterministic analyst template with zero latency)*

### 3. Start the Development Server
```bash
npm run dev
```

### 4. Open in Browser
Navigate to:
```
http://localhost:5173
```

---

## 🛠️ Alternative Setup (Running Separately)

If you prefer to run the backend and frontend in separate terminal windows:

### Terminal 1: Backend
```bash
cd backend
npm install
npm run dev
```
*Backend runs on `http://localhost:5000`*

### Terminal 2: Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`*

---

## 🧪 Running Automated Tests

Delta includes an extensive suite of 38 unit and integration tests covering cold-start fallback branches, feed divergence detection, staleness degradation, structured diff math, and AI narrator fallback resilience.

To run the test suite:
```bash
npm test
```
*(Or `npm test --prefix backend`)*

---

## 🔌 Default Ports & Environment Variables

| Component | Default Port | Config Variable | Notes |
| :--- | :--- | :--- | :--- |
| **Backend API** | `5000` | `PORT` | Express REST API (`http://localhost:5000`) |
| **Frontend UI** | `5173` | `PORT` | Vite React dev server (`http://localhost:5173`) |
| **CORS Origin** | — | `CORS_ORIGIN` | Default: `http://localhost:5173` |
| **AI Narrator** | — | `GEMINI_API_KEY` | Optional. Google Gemini API key |
| **AI Model** | — | `GEMINI_MODEL` | Default: `gemini-2.5-flash` |
| **AI Timeout** | — | `GEMINI_TIMEOUT_MS` | Default: `3000` (milliseconds) |

---

## 📋 Evaluation & Judging Walkthrough

To experience the full functionality of Delta during evaluation:

1. **Cold-Start Experience**:
   - Open [http://localhost:5173](http://localhost:5173). Notice the purple **Cold-Start Active** hero banner establishing a synthetic baseline from **Today's Market Open (09:30 AM)**.
2. **Commit Checkpoint**:
   - Click **"Commit Checkpoint"** in the top right of the hero banner. Notice all price deltas reset to zero ($0.00$), establishing your new baseline snapshot.
3. **Simulate Market Micro-Ticks**:
   - Click **"Simulate Tick"** in the top simulation bar. Watch prices shift, sparklines update, and technical indicator chips (e.g. RSI) dynamically react.
4. **Test Stale Degradation (TSLA)**:
   - Click **"Test Stale Degradation (TSLA)"**.
   - Observe the TSLA row degrade: price becomes `~$212.4` in amber italics, % delta pill displays dashed styling, the sparkline turns into a dashed slate curve, and the status chip displays `⏱ Stale (28m ago)`.
5. **Test Feed Divergence (NVDA)**:
   - Click **"Test Feed Divergence (NVDA)"**.
   - Observe the `⚠️ Feeds Diverge ±1.45%` badge appear on NVDA. Hover or click on the badge to inspect the cross-exchange audit popover.
6. **AI Diff Narrator & Comparison**:
   - Click any stock row (e.g. NVDA or TSLA) to expand its structured diff breakdown.
   - View the synthesized **Structured Diff Synthesis** narrative. Click **"Compare AI vs Rule-Based"** to see how the LLM synthesizes complex indicators into institutional commentary compared to the deterministic template.
7. **Switch Trader Profile**:
   - Click the profile button in the top right (e.g. `Alice (Quantitative Trader)`) and switch to `Bob (Global Macro)` or `Charlie (Digital Assets)` to see independent persisted watchlist state.

---

## 📦 Project Structure

```
Delta/
├── package.json               # Root monorepo workspace & concurrently scripts
├── .gitignore                 # Excludes node_modules, .env, and local database files
├── README.md                  # Complete project documentation & setup guide
├── backend/
│   ├── .env.example           # Environment template for Gemini API & server ports
│   ├── package.json           # Express backend dependencies & test scripts
│   ├── tsconfig.json          # TypeScript compiler configuration
│   └── src/
│       ├── config.ts          # Server, freshness thresholds, and Gemini settings
│       ├── server.ts          # Express entrypoint with CORS & routes
│       ├── types/             # TickerState, WatchlistSnapshot, TickerDiff, DataSourceConfidence
│       ├── data/              # Mock tickers, definitions, and catalysts
│       ├── services/
│       │   ├── marketDataService.ts   # In-memory synthetic feed with 4s random-walk
│       │   ├── snapshotService.ts     # Checkpoints, persistence & cold-start baselines
│       │   ├── diffEngine.ts          # Quantitative math, priority scoring & takeaway logic
│       │   ├── aiNarratorService.ts   # Gemini API integration with 3s timeout & fallback
│       │   └── watchlistService.ts    # User watchlist CRUD & symbol state
│       ├── routes/            # REST API route handlers
│       └── tests/             # Comprehensive 38-test unit suite
└── frontend/
    ├── .env.example           # Frontend environment template
    ├── package.json           # React 18, Vite, Lucide icons dependencies
    ├── vite.config.ts         # Vite proxy configuration for localhost:5000
    ├── index.html             # HTML5 template with Inter & JetBrains Mono fonts
    └── src/
        ├── index.css          # Dark-mode financial terminal design system tokens
        ├── App.tsx            # Main application container
        ├── types/             # Frontend TypeScript models
        ├── services/api.ts    # Typed API client
        ├── hooks/             # Reactive polling hooks (useWatchlist, useDiffReport)
        └── components/
            ├── layout/        # Header, Identity Switcher Modal, Simulation Controls
            ├── diff/          # DiffSummaryHero, FreshnessIndicator, Confidence Popover
            ├── watchlist/     # WatchlistTable, AddStockModal, Sparkline
            └── common/        # Reusable UI components
```

---

## 📄 License
MIT License. Built for the Hackathon.
