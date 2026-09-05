import React from 'react';
import { WatchlistDiffReport } from '../../types';
import { formatDeltaINR } from '../../utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  CheckCheck,
  Sparkles,
  ShieldAlert,
  Clock,
} from 'lucide-react';

interface DiffSummaryHeroProps {
  report: WatchlistDiffReport | null;
  onAcknowledge: () => Promise<void>;
  isAcknowledging: boolean;
}

export const DiffSummaryHero: React.FC<DiffSummaryHeroProps> = ({
  report,
  onAcknowledge,
  isAcknowledging,
}) => {
  if (!report) return null;

  const isColdStart = report.coldStart.isColdStart;
  const portfolioDelta = report.portfolioDeltaPercent;
  const isPositive = portfolioDelta >= 0;

  const formatTimestamp = (ts: number): string => {
    const diffHours = Math.round((Date.now() - ts) / (1000 * 60 * 60));
    if (diffHours < 1) {
      const diffMins = Math.round((Date.now() - ts) / (1000 * 60));
      return `${diffMins} mins ago`;
    }
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`diff-hero-container ${isColdStart ? 'cold-start-mode' : ''}`}>
      {/* Top Banner Row */}
      <div className="diff-hero-header">
        <div className="diff-hero-title-group">
          {isColdStart ? (
            <div className="hero-badge cold-start-badge">
              <Sparkles size={14} className="badge-icon" />
              <span>Initial Session Checkpoint</span>
            </div>
          ) : (
            <div className="hero-badge delta-badge">
              <Clock size={14} className="badge-icon" />
              <span>Diff vs. Baseline ({formatTimestamp(report.baseSnapshot.timestamp)})</span>
            </div>
          )}
          <h2 className="hero-main-title">
            {isColdStart ? "Welcome to Delta Watchlist" : "Since Your Last Visit"}
          </h2>
          <p className="hero-subtitle">
            {isColdStart
              ? (report.coldStart.message || "First session detected: Showing structured movements since Today's Market Open (09:30 AM).")
              : `Comparing live market prices against your checkpoint '${report.baseSnapshot.name}'.`}
          </p>
        </div>

        {/* Action Button: Commit / Catch Up */}
        <div className="diff-hero-action">
          <button
            type="button"
            className="btn-commit-checkpoint"
            onClick={onAcknowledge}
            disabled={isAcknowledging}
          >
            <CheckCheck size={16} className={isAcknowledging ? 'spin' : ''} />
            <span>{isAcknowledging ? 'Committing...' : isColdStart ? 'Save Baseline Checkpoint' : 'Catch Up & Mark Seen'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="diff-metrics-grid">
        {/* Metric 1: Net Portfolio Shift */}
        <div className="metric-card metric-portfolio">
          <div className="metric-label">Watchlist Net Drift</div>
          <div className={`metric-value ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
            <span className="mono">
              {isPositive ? `+${portfolioDelta.toFixed(2)}%` : `${portfolioDelta.toFixed(2)}%`}
            </span>
          </div>
          <div className="metric-subtext">
            Average movement across {report.diffs.length} watchlist assets
          </div>
        </div>

        {/* Metric 2: Top Gainer */}
        {report.topGainer && (
          <div className="metric-card">
            <div className="metric-label">Top Outperformer</div>
            <div className="metric-mover-row">
              <span className="mover-symbol">{report.topGainer.symbol}</span>
              <span className="mover-gain mono">+{report.topGainer.percentDelta.toFixed(2)}%</span>
            </div>
            <div className="metric-subtext truncate">
              {report.topGainer.newCatalysts.length > 0
                ? report.topGainer.newCatalysts[0].headline
                : `Advanced ${formatDeltaINR(report.topGainer.priceDelta)}`}
            </div>
          </div>
        )}

        {/* Metric 3: Top Loser */}
        {report.topLoser && (
          <div className="metric-card">
            <div className="metric-label">Largest Laggard</div>
            <div className="metric-mover-row">
              <span className="mover-symbol">{report.topLoser.symbol}</span>
              <span className="mover-loss mono">{report.topLoser.percentDelta.toFixed(2)}%</span>
            </div>
            <div className="metric-subtext truncate">
              {report.topLoser.newCatalysts.length > 0
                ? report.topLoser.newCatalysts[0].headline
                : `Declined ${formatDeltaINR(report.topLoser.priceDelta)}`}
            </div>
          </div>
        )}

        {/* Metric 4: Catalysts & Quality Health */}
        <div className="metric-card metric-catalysts">
          <div className="metric-label">Breaking Catalysts</div>
          <div className="metric-catalyst-value">
            <Zap size={18} className="zap-icon" />
            <span className="mono">{report.totalNewCatalysts} Events</span>
          </div>
          <div className="metric-subtext quality-subtext">
            {report.dataQualitySummary.divergenceCount > 0 || report.dataQualitySummary.staleCount > 0 ? (
              <span className="quality-warning">
                <ShieldAlert size={12} />
                {report.dataQualitySummary.divergenceCount} feed spreads, {report.dataQualitySummary.staleCount} stale
              </span>
            ) : (
              <span className="quality-good">
                All feeds verified real-time
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
