import React, { useState } from 'react';
import { RefreshCw, Layers, User, Activity, Info, ShieldCheck, Clock } from 'lucide-react';
import { DataSourceStatus } from '../../types';

interface HeaderProps {
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  lastUpdated: number;
  userId: string;
  onOpenUserModal: () => void;
  dataSourceStatus?: DataSourceStatus;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isRefreshing,
  lastUpdated,
  userId,
  onOpenUserModal,
  dataSourceStatus,
}) => {
  const [showDataStatusPopover, setShowDataStatusPopover] = useState(false);

  const getBadgeStyle = () => {
    if (!dataSourceStatus) return { bg: 'rgba(34, 211, 238, 0.12)', border: 'rgba(34, 211, 238, 0.3)', color: 'var(--accent-cyan)' };
    if (dataSourceStatus.isLive) return { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.4)', color: '#34d399' };
    if (dataSourceStatus.reason === 'MARKET_CLOSED') return { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24' };
    if (dataSourceStatus.reason === 'RATE_LIMITED' || dataSourceStatus.reason === 'TIMEOUT') return { bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.4)', color: '#fb923c' };
    if (dataSourceStatus.reason === 'SOURCE_UNAVAILABLE') return { bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.4)', color: '#fda4af' };
    return { bg: 'rgba(34, 211, 238, 0.12)', border: 'rgba(34, 211, 238, 0.3)', color: 'var(--accent-cyan)' };
  };

  const badgeStyle = getBadgeStyle();

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="brand-logo-badge">
          <Layers size={20} className="brand-icon" />
          <div className="brand-text">
            <h1 className="brand-title">DELTA</h1>
            <span className="brand-subtitle">Smart Versioned Watchlist</span>
          </div>
        </div>

        {/* Live Data Feed Status Pill */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="system-status-chip"
            onClick={() => setShowDataStatusPopover(!showDataStatusPopover)}
            style={{
              background: badgeStyle.bg,
              borderColor: badgeStyle.border,
              color: badgeStyle.color,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Click for real-time market data feed transparency details"
          >
            <Activity size={12} className={dataSourceStatus?.isLive ? 'spin-slow' : ''} />
            <span style={{ fontWeight: 600 }}>{dataSourceStatus?.label || 'Deterministic Simulator'}</span>
            <Info size={11} style={{ opacity: 0.7 }} />
          </button>

          {/* Transparency Popover */}
          {showDataStatusPopover && (
            <div
              style={{
                position: 'absolute',
                top: '110%',
                left: 0,
                zIndex: 100,
                width: '340px',
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(16px)',
                border: '1px solid var(--border-accent)',
                borderRadius: '8px',
                padding: '14px',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
                fontSize: '12px',
                lineHeight: 1.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                  Market Data Feed Transparency
                </span>
                <button
                  type="button"
                  onClick={() => setShowDataStatusPopover(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '8px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: badgeStyle.color, fontWeight: 600 }}>
                  <ShieldCheck size={14} />
                  <span>{dataSourceStatus?.label || 'Deterministic Simulation Active'}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '11.5px' }}>
                  {dataSourceStatus?.description || 'High-frequency deterministic market simulation active.'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px', fontSize: '11px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '6px 8px', borderRadius: '4px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Market Session:</div>
                  <div style={{ fontWeight: 600, color: dataSourceStatus?.isMarketHours ? '#34d399' : '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={11} />
                    {dataSourceStatus?.isMarketHours ? 'NSE Open (09:15-15:30 IST)' : 'NSE Closed (After Hours)'}
                  </div>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '6px 8px', borderRadius: '4px' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Failover SLA:</div>
                  <div style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>Zero-Downtime Fallback</div>
                </div>
              </div>

              <div style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>
                Delta continuously reconciles live quotes with synthetic historical continuity. If upstream live feeds experience timeouts, rate limits, or market closures, the engine transparently preserves uninterrupted structured diffing.
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        {/* User Identity Chip */}
        <button
          type="button"
          className="btn-refresh-header"
          onClick={onOpenUserModal}
          style={{ borderColor: 'var(--border-accent)', color: 'var(--accent-cyan)' }}
          title="Click to switch trader profile / user ID"
        >
          <User size={13} />
          <span className="mono" style={{ fontWeight: 700 }}>{userId}</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>[Switch]</span>
        </button>

        <span className="last-sync-text">
          Synced: {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
        <button
          type="button"
          className="btn-refresh-header"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh live diff state"
        >
          <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>
    </header>
  );
};
