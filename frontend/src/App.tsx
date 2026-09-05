import { useState, useEffect, useMemo } from 'react';
import { useWatchlist } from './hooks/useWatchlist';
import { useDiffReport } from './hooks/useDiffReport';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { TechnicalPanel } from './components/charts/TechnicalPanel';
import { SimulationControls } from './components/layout/SimulationControls';
import { DiffSummaryHero } from './components/diff/DiffSummaryHero';
import { TimeTravelBar } from './components/diff/TimeTravelBar';
import { WatchlistTable } from './components/watchlist/WatchlistTable';
import { AddStockModal } from './components/watchlist/AddStockModal';
import { UserIdentityModal } from './components/layout/UserIdentityModal';

const DEFAULT_USER_ID = 'alice_quant';

export function App() {
  const [userId, setUserId] = useState<string>(() => {
    return localStorage.getItem('delta_user_id') || DEFAULT_USER_ID;
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const {
    watchlists,
    activeWatchlistId,
    activeWatchlist,
    symbols,
    tickers,
    isLoading: isWatchlistLoading,
    error: watchlistError,
    isRemoving,
    switchWatchlist,
    createNewWatchlist,
    renameCurrentWatchlist,
    deleteCurrentWatchlist,
    loadWatchlist,
    addSymbol,
    removeSymbol,
  } = useWatchlist(userId);

  const {
    report,
    selectedBaseline,
    setSelectedBaseline,
    isLoading: isDiffLoading,
    isAcknowledging,
    error: diffError,
    lastUpdated,
    loadDiff,
    acknowledge,
  } = useDiffReport(userId, activeWatchlistId);

  // Synchronize selectedSymbol when report changes or active watchlist changes
  useEffect(() => {
    if (report?.diffs && report.diffs.length > 0) {
      if (!selectedSymbol || !report.diffs.some((d) => d.symbol === selectedSymbol)) {
        setSelectedSymbol(report.diffs[0].symbol);
      }
    } else if (symbols.length > 0) {
      if (!selectedSymbol || !symbols.includes(selectedSymbol)) {
        setSelectedSymbol(symbols[0]);
      }
    }
  }, [report, symbols, selectedSymbol]);

  const handleSelectUser = (newUserId: string) => {
    setUserId(newUserId);
    localStorage.setItem('delta_user_id', newUserId);
  };

  const handleRefreshAll = async () => {
    await Promise.all([loadWatchlist(), loadDiff(false)]);
  };

  const handleAddSymbol = async (symbol: string) => {
    await addSymbol(symbol);
    setSelectedSymbol(symbol);
    await loadDiff(false);
  };

  const handleRemoveSymbol = async (symbol: string) => {
    await removeSymbol(symbol);
    await loadDiff(false);
  };

  const selectedDiff = useMemo(() => {
    return report?.diffs.find((d) => d.symbol === selectedSymbol) || null;
  }, [report, selectedSymbol]);

  const selectedTickerState = useMemo(() => {
    return selectedSymbol ? tickers[selectedSymbol] || null : null;
  }, [tickers, selectedSymbol]);

  const isInitialLoading = isWatchlistLoading && isDiffLoading && !report;

  return (
    <div className="terminal-shell">
      {/* 1. Header with Trader Identity profile */}
      <Header
        onRefresh={handleRefreshAll}
        isRefreshing={isDiffLoading}
        lastUpdated={lastUpdated}
        userId={userId}
        onOpenUserModal={() => setIsUserModalOpen(true)}
      />

      {/* 2. Interactive Demo Simulation Controls */}
      <SimulationControls onRefresh={handleRefreshAll} />

      {/* Errors Banner */}
      {(watchlistError || diffError) && (
        <div className="modal-error-banner" style={{ margin: '0 16px 12px 16px' }}>
          {watchlistError || diffError}
        </div>
      )}

      {/* 3-Column Institutional Terminal Layout */}
      <div className="terminal-workspace-layout">
        {/* Column 1: Left Sidebar for Multi-Watchlist Navigation */}
        <Sidebar
          watchlists={watchlists}
          activeWatchlistId={activeWatchlistId}
          onSelectWatchlist={(id) => switchWatchlist(id)}
          onCreateWatchlist={async (name) => {
            const created = await createNewWatchlist(name);
            await loadDiff(false);
            return created;
          }}
          onRenameWatchlist={renameCurrentWatchlist}
          onDeleteWatchlist={deleteCurrentWatchlist}
        />

        {/* Column 2: Center Workspace (Hero, TimeTravel, Table) */}
        <main className="terminal-center-column">
          {/* Active Watchlist Header Banner */}
          <div className="watchlist-banner-header">
            <div className="banner-left">
              <span className="banner-tag">ACTIVE PORTFOLIO</span>
              <h2 className="banner-title">{activeWatchlist?.name || 'Watchlist'}</h2>
            </div>
            <div className="banner-right">
              <span className="banner-meta-badge mono">{symbols.length} Assets</span>
              <span className="banner-meta-badge text-cyan">User: {userId}</span>
            </div>
          </div>

          {/* Diff Summary Hero ("Since You Were Gone" / Cold-Start Welcome) */}
          {report && (
            <DiffSummaryHero
              report={report}
              onAcknowledge={acknowledge}
              isAcknowledging={isAcknowledging}
            />
          )}

          {/* Time Travel Bar (Baseline Switcher Dropdown) */}
          {report && (
            <TimeTravelBar
              selectedBaseline={selectedBaseline}
              onChangeBaseline={setSelectedBaseline}
              baseSnapshotName={report.baseSnapshot.name}
              baseSnapshotTimestamp={report.baseSnapshot.timestamp}
              isLoading={isDiffLoading}
            />
          )}

          {/* Watchlist Table */}
          {report ? (
            <WatchlistTable
              diffs={report.diffs}
              liveTickers={tickers}
              selectedSymbol={selectedSymbol}
              onSelectSymbol={(sym) => setSelectedSymbol(sym)}
              onRemoveSymbol={handleRemoveSymbol}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              isRemoving={isRemoving}
            />
          ) : isInitialLoading ? (
            <div className="watchlist-section-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Computing structured market diffs...
            </div>
          ) : null}
        </main>

        {/* Column 3: Right Technicals & Charts Panel */}
        <TechnicalPanel
          diff={selectedDiff}
          tickerState={selectedTickerState}
        />
      </div>

      {/* Add Stock Modal */}
      <AddStockModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddSymbol={handleAddSymbol}
        existingSymbols={symbols}
      />

      {/* User Identity Switcher Modal */}
      <UserIdentityModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        currentUserId={userId}
        onSelectUser={handleSelectUser}
      />
    </div>
  );
}

export default App;
