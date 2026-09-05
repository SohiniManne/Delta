# 🔺 DELTA — Smart Market Watchlist
> **Modeling Watchlist State as Versioned Snapshots & Structured Diffs**

Delta reimagines the modern market watchlist. Instead of bombarding traders with a chaotic, noisy stream of blinking numbers, Delta models market data as **versioned state snapshots**. When returning to your watchlist, Delta computes an institutional **structured diff** against your last-seen baseline—synthesizing quantitative price shifts, volume surges, technical indicator crossovers, breaking catalyst events, and feed quality audits into actionable intelligence.

---

## 🏛️ System Architecture

```mermaid
flowchart TB
    subgraph Client["🖥️ Frontend Trading Terminal (React + Vite + TypeScript)"]
        direction TB
        Sidebar["📁 Multi-Watchlist Sidebar<br/>(Portfolio Switcher & CRUD)"]
        Hero["📊 DiffSummaryHero<br/>(Net Drift, Top Mover, Catalysts)"]
        TimeTravel["⏱️ TimeTravelBar<br/>(Baseline Switcher & Checkpoints)"]
        Table["📋 WatchlistTable<br/>(₹ Prices, Deltas, Signals, Tildes ~)"]
        ExpandedCard["🔍 Expanded Diff Cards<br/>(AI Analyst / Rule-Based Badges)"]
        TechPanel["📈 TechnicalPanel<br/>(SVG Price Trajectory vs. Baseline)"]
        ChaosBar["⚡ Simulation Controls<br/>(Ticks, Stale, Divergence, Shocks)"]
    end

    subgraph API["🌐 REST API Gateway (Express 4)"]
        direction TB
        WlRoutes["/api/watchlist/*"]
        DiffRoutes["/api/diff/*"]
        SnapRoutes["/api/snapshots/*"]
        MarketRoutes["/api/market/*"]
    end

    subgraph Services["⚙️ Backend Core Services & Engines"]
        direction TB
        WlService["WatchlistService<br/>• User & Watchlist Isolation<br/>• CRUD & Multi-Portfolio"]
        SnapService["SnapshotService<br/>• 09:15 AM Market Open Baseline<br/>• 03:30 PM Prev Close Fallback<br/>• User Commit Checkpoints"]
        DiffEngine["DiffEngine<br/>• Quantitative Delta Math (Δ Price, Δ %)<br/>• Volume Surge & RSI/MACD Shifts<br/>• 0–100 Priority Scoring & Severity"]
        MarketService["MarketDataService<br/>• Synthetic Random Walk Feed<br/>• Freshness Auditing (Realtime / Stale)<br/>• Feed Divergence Detection (NSE vs BSE)<br/>• Breaking Catalysts Pipeline"]
        AiService["AiNarratorService<br/>• Google Gemini API Integration<br/>• 3-Second Timeout Guard<br/>• Strict Zero-Hallucination Envelope<br/>• Silent Rule-Based Fallback"]
    end

    subgraph External["🤖 AI Model & Persistence Layer"]
        Gemini["Google Gemini API<br/>(gemini-2.5-flash)"]
        DB[("💾 Local JSON Persistence<br/>• watchlists_db.json<br/>• snapshots_db.json")]
        MockData["📊 Mock Indian Feeds & Catalysts<br/>• NSE/BSE Tickers (RELIANCE, TCS, INFY)<br/>• Indian News (Moneycontrol, ET, Mint)"]
    end

    %% Frontend to API
    Client <-->|HTTP / Polling Feeds| API

    %% API to Services
    WlRoutes --> WlService
    DiffRoutes --> DiffEngine
    SnapRoutes --> SnapService
    MarketRoutes --> MarketService

    %% Service Connections
    DiffEngine <--> SnapService
    DiffEngine <--> MarketService
    DiffEngine --> AiService
    AiService -->|Async Synthesis (3s Limit)| Gemini
    WlService <--> DB
    SnapService <--> DB
    MarketService <--> MockData
```

---

## 🌟 Key Architecture & Features

1. **Versioned Snapshot & Structured Diff Engine**:
   - Computes $\text{State}(t_{\text{now}}) - \text{State}(t_{\text{base}})$.
   - Quantifies exact price shifts in **₹ INR**, volume surge multiples ($>1.5\times$), 14-period RSI boundary shifts (entering Overbought $\ge 70$ or Oversold $\le 30$), and MACD histogram crossovers.
   - Computes a dynamic 0–100 **Attention Priority Score** and severity classification (`CRITICAL`, `MODERATE`, `LOW`, `UNCHANGED`).

2. **First-Class Cold-Start Fallback (Indian Market Hours)**:
   - If a user visits with no prior session history, Delta generates a synthetic baseline against **Today's Market Open (09:15 AM IST)** or pre-market **Previous Day Close (03:30 PM IST)** without throwing errors.

3. **Data Quality & Degraded Visual Precision**:
   - Multi-tier freshness auditing: `REALTIME` ($<30\text{s}$), `DELAYED` ($30\text{s}-15\text{m}$), `STALE` ($>15\text{m}$).
   - Cross-exchange feed discrepancy detection (e.g. primary exchange vs. fallback feed diverging $>0.30\%$).
   - **No fake precision**: Degraded feeds visibly reflect uncertainty via approximation tildes (`~₹2,136.47`), muted amber styling, dashed SVG sparklines (`strokeDasharray="3 3"`), and hoverable audit popovers.

4. **Multi-Portfolio Sidebar & Isolation**:
   - Users can create, switch between, and manage multiple named watchlists (`Tech Momentum`, `Global Macro & Large Cap`, `Digital Assets & Crypto`).
   - Every watchlist maintains its own isolated snapshot history and baseline commits.

5. **AI Diff Narrator (Google Gemini API)**:
   - Generates concise 1–2 sentence Wall Street / Dalal Street analyst syntheses tailored strictly to structured diff metrics and Indian catalysts.
   - **Strict Zero-Hallucination Envelope**: Passes strictly the quantified diff metrics and verified catalysts—never hallucinating external data.
   - **3-Second Timeout & Silent Fallback**: Enforces a strict 3,000ms timeout with silent, seamless fallback to deterministic rule-based templates. The UI never encounters a blank or error state.
   - Includes visual `✨ AI Analyst` / `📋 Rule-Based` tags and an interactive comparison mode.

6. **Interactive SVG Price Trajectory Chart**:
   - Live visual plotting of price trajectory curves against dashed baseline references with theme gradient fills, live tick indicator glow dots, and INR scale bounds.

7. **Indian Equities & INR Currency (`₹`)**:
   - Pre-configured with major Indian equities across NSE/BSE (`TCS`, `INFY`, `WIPRO`, `RELIANCE`, `HDFCBANK`, `ICICIBANK`, `ITC`, `SBIN`) and digital assets in INR.
   - Indian number formatting with Lakhs and Crores (`₹1,23,456.78`, `₹20.62 L Cr`).


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

Delta includes an extensive suite of **59 unit and integration tests** covering cold-start fallback branches (09:15 AM Open / 03:30 PM Close), feed divergence detection, staleness degradation, structured diff math in INR, AI narrator fallback resilience, and multi-watchlist CRUD with cross-portfolio isolation.

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
   - Open [http://localhost:5173](http://localhost:5173). Notice the purple **Cold-Start Active** hero banner establishing a synthetic baseline from **Today's Market Open (09:15 AM IST)** or **Previous Day Close (03:30 PM IST)**.
2. **Commit Checkpoint**:
   - Click **"Save Baseline Checkpoint"** in the hero banner. Notice all price deltas reset to zero (₹0.00), establishing your new baseline snapshot.
3. **Simulate Market Micro-Ticks**:
   - Click **"Simulate Tick"** in the top simulation bar. Watch prices shift in ₹, sparklines animate, and technical indicator chips (RSI / MACD) dynamically react.
4. **Test Stale Degradation (INFY)**:
   - Click **"Test Stale Degradation (INFY)"**.
   - Observe the INFY row degrade: price displays `~₹2,136.47 ~ stale` in amber italics, % delta pill displays dashed styling, the sparkline turns into a dashed slate curve, and the status chip displays `⏱ Stale (29m ago)`.
5. **Test Feed Divergence (RELIANCE)**:
   - Click **"Test Feed Divergence (RELIANCE)"**.
   - Observe the `⚠️ Feeds Diverge ±1.45%` badge appear on RELIANCE. Hover or click on the badge to inspect the cross-exchange audit popover.
6. **AI Diff Narrator & Comparison**:
   - Click any stock row (e.g. INFY or RELIANCE) to expand its structured diff breakdown.
   - View the synthesized **AI Analyst** narrative. Click **"Compare AI vs Rule-Based"** to see how the LLM synthesizes complex indicators and Indian catalysts into institutional commentary compared to the deterministic template.
7. **Multi-Portfolio Watchlist Sidebar**:
   - Use the persistent left sidebar to switch between `Tech Momentum`, `Global Macro & Large Cap`, and `Digital Assets & Crypto`, or click **+ New** to create and name a custom portfolio.
8. **Interactive Price Trajectory vs Baseline Chart**:
   - Inspect the right-side technical drawer to view dynamic SVG price trajectories plotted against dashed baseline references with emerald/rose area gradients and ₹ INR scale bounds.

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
│       ├── data/              # Mock Indian equities (NSE/BSE) & Indian catalysts (Moneycontrol/ET)
│       ├── services/
│       │   ├── marketDataService.ts   # In-memory synthetic feed with 4s random-walk
│       │   ├── snapshotService.ts     # Checkpoints, persistence & cold-start baselines
│       │   ├── diffEngine.ts          # Quantitative math, priority scoring & takeaway logic
│       │   ├── aiNarratorService.ts   # Gemini API integration with 3s timeout & fallback
│       │   └── watchlistService.ts    # Multi-watchlist CRUD & user isolation
│       ├── routes/            # REST API route handlers
│       └── tests/             # Comprehensive 59-test unit suite
└── frontend/
    ├── .env.example           # Frontend environment template
    ├── package.json           # React 18, Vite, Lucide icons dependencies
    ├── vite.config.ts         # Vite proxy configuration for localhost:5000
    ├── index.html             # HTML5 template with Inter & JetBrains Mono fonts
    └── src/
        ├── index.css          # Dark-mode financial terminal design system tokens
        ├── App.tsx            # Main application container
        ├── types/             # Frontend TypeScript models
        ├── utils/
        │   └── formatters.ts  # Indian currency (₹) & number formatting (Lakhs/Crores)
        ├── services/api.ts    # Typed API client
        ├── hooks/             # Reactive polling hooks (useWatchlist, useDiffReport)
        └── components/
            ├── layout/        # Header, Sidebar, Simulation Controls
            ├── charts/        # TechnicalPanel (SVG Price Trajectory vs. Baseline)
            ├── diff/          # DiffSummaryHero, FreshnessIndicator, Confidence Popover
            ├── watchlist/     # WatchlistTable, AddStockModal, Sparkline
            └── common/        # Reusable UI components
```

---

## 📄 License
MIT License. Built for the Hackathon.
