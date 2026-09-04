import React from 'react';
import { RefreshCw, Layers, User } from 'lucide-react';

interface HeaderProps {
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  lastUpdated: number;
  userId: string;
  onOpenUserModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isRefreshing,
  lastUpdated,
  userId,
  onOpenUserModal,
}) => {
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
        <div className="system-status-chip">
          <span className="live-status-dot" />
          <span>Engine Active</span>
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
