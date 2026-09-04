import { useState } from 'react';
import { useWatchlist } from './hooks/useWatchlist';
import { useDiffReport } from './hooks/useDiffReport';
import { Header } from './components/layout/Header';
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

  const {
    symbols,
    tickers,
    isLoading: isWatchlistLoading,
    error: watchlistError,
    isRemoving,
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
  } = useDiffReport(userId);

  const handleSelectUser = (newUserId: string) => {
    setUserId(newUserId);
    localStorage.setItem('delta_user_id', newUserId);
  };

  const handleRefreshAll = async () => {
    await Promise.all([loadWatchlist(), loadDiff(false)]);
  };

  const handleAddSymbol = async (symbol: string) => {
    await addSymbol(symbol);
    await loadDiff(false);
  };

  const handleRemoveSymbol = async (symbol: string) => {
    await removeSymbol(symbol);
    await loadDiff(false);
  };

  const isInitialLoading = isWatchlistLoading && isDiffLoading && !report;

  return (
    <div className="app-wrapper">
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
        <div className="modal-error-banner" style={{ margin: 0 }}>
          {watchlistError || diffError}
        </div>
      )}

      {/* 3. Diff Summary Hero ("Since You Were Gone" / Cold-Start Welcome) */}
      {report && (
        <DiffSummaryHero
          report={report}
          onAcknowledge={acknowledge}
          isAcknowledging={isAcknowledging}
        />
      )}

      {/* 4. Time Travel Bar (Baseline Switcher Dropdown) */}
      {report && (
        <TimeTravelBar
          selectedBaseline={selectedBaseline}
          onChangeBaseline={setSelectedBaseline}
          baseSnapshotName={report.baseSnapshot.name}
          baseSnapshotTimestamp={report.baseSnapshot.timestamp}
          isLoading={isDiffLoading}
        />
      )}

      {/* 5. Watchlist Table with Freshness & Degradation Indicators */}
      {report ? (
        <WatchlistTable
          diffs={report.diffs}
          liveTickers={tickers}
          onRemoveSymbol={handleRemoveSymbol}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          isRemoving={isRemoving}
        />
      ) : isInitialLoading ? (
        <div className="watchlist-section-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Computing structured market diffs...
        </div>
      ) : null}

      {/* 5. Add Stock Modal */}
      <AddStockModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddSymbol={handleAddSymbol}
        existingSymbols={symbols}
      />

      {/* 6. User Identity Switcher Modal */}
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
