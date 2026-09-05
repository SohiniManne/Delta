import React from 'react';
import { Server, RefreshCw, Radio, Zap } from 'lucide-react';

interface ServerWakeupScreenProps {
  retryAttempt: number;
  retryCountdown: number;
  onRetry: () => void;
  isRetrying: boolean;
  error?: string | null;
}

export const ServerWakeupScreen: React.FC<ServerWakeupScreenProps> = ({
  retryAttempt,
  retryCountdown,
  onRetry,
  isRetrying,
  error,
}) => {
  const maxCountdown = 8;
  const progressPercent = Math.max(0, Math.min(100, ((maxCountdown - retryCountdown) / maxCountdown) * 100));

  return (
    <div className="server-wakeup-container">
      <div className="server-wakeup-card">
        {/* Animated Radar Pulse Box */}
        <div className="server-wakeup-icon-box">
          <div className="wakeup-pulse-ring" />
          <div className="wakeup-pulse-ring-delayed" />
          <div className="wakeup-icon-core">
            <Server size={32} className={isRetrying ? 'animate-spin' : ''} />
          </div>
        </div>

        <div className="server-wakeup-badge">
          <Radio size={13} className="animate-pulse text-cyan" />
          <span>CONNECTING TO GATEWAY</span>
        </div>

        <h2 className="server-wakeup-title">Waking up the server...</h2>
        <p className="server-wakeup-desc">
          This can take up to a minute on first load while the free-tier backend spins up from sleep.
          Please hold while Delta initializes market feeds and snapshot databases.
        </p>

        {/* Dynamic Telemetry Checklist */}
        <div className="server-wakeup-steps">
          <div className="wakeup-step done">
            <span className="wakeup-step-indicator">✓</span>
            <span>Frontend Terminal Client Loaded</span>
          </div>
          <div className={`wakeup-step ${isRetrying ? 'active' : ''}`}>
            <span className="wakeup-step-indicator">
              {isRetrying ? <RefreshCw size={10} className="animate-spin" /> : '2'}
            </span>
            <span>Handshaking with Express REST Gateway & Snapshot DB</span>
          </div>
          <div className="wakeup-step">
            <span className="wakeup-step-indicator">3</span>
            <span>Syncing Indian Equities (NSE/BSE) & Structured Diff Engine</span>
          </div>
        </div>

        {/* Auto-Retry Progress Bar */}
        <div className="server-wakeup-countdown-bar">
          <div
            className="server-wakeup-countdown-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Footer with Attempt Counter and Instant Retry CTA */}
        <div className="server-wakeup-footer">
          <div className="server-wakeup-meta">
            <Zap size={13} className="text-cyan" />
            <span>
              {isRetrying
                ? 'Connecting now...'
                : `Auto-retrying in ${retryCountdown}s (Attempt #${Math.max(1, retryAttempt)})`}
            </span>
          </div>

          <button
            type="button"
            className="server-wakeup-btn"
            onClick={onRetry}
            disabled={isRetrying}
          >
            <RefreshCw size={13} className={isRetrying ? 'animate-spin' : ''} />
            <span>{isRetrying ? 'Connecting...' : 'Retry Now'}</span>
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: '14px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Last response: {error}
          </div>
        )}
      </div>
    </div>
  );
};
