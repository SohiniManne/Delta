import React, { useState } from 'react';
import {
  simulateTick,
  simulateStaleness,
  simulateDivergence,
  resetSimulation,
  simulateCorrelationBreak,
  simulateLiveDataMode,
} from '../../services/api';
import { Play, AlertTriangle, Clock, RefreshCw, Sparkles, Zap, Activity, ShieldAlert } from 'lucide-react';

interface SimulationControlsProps {
  onRefresh: () => Promise<void>;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({ onRefresh }) => {
  const [isRunning, setIsRunning] = useState<string | null>(null);

  const handleAction = async (name: string, action: () => Promise<void>) => {
    try {
      setIsRunning(name);
      await action();
      await onRefresh();
    } catch (err) {
      console.error('Simulation action error:', err);
    } finally {
      setIsRunning(null);
    }
  };

  return (
    <div className="simulation-toolbar" style={{ flexWrap: 'wrap', gap: '8px' }}>
      <div className="simulation-title-group">
        <Sparkles size={14} className="sim-icon" />
        <span className="sim-title">Demo Chaos &amp; Market Controls:</span>
      </div>

      <div className="simulation-buttons-group" style={{ flexWrap: 'wrap', gap: '6px' }}>
        {/* Correlation Break Trigger */}
        <button
          type="button"
          className="btn-sim"
          style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.45)', color: '#fca5a5' }}
          onClick={() => handleAction('corr-break', () => simulateCorrelationBreak('INFY', 'TCS', 5.3))}
          disabled={isRunning !== null}
          title="Simulate INFY +5.3% surge while correlated peer TCS is flat, triggering statistical Correlation Break event"
        >
          <Zap size={12} className={isRunning === 'corr-break' ? 'spin' : ''} />
          <span>⚡ Break INFY/TCS Correlation (+5.3%)</span>
        </button>

        {/* Live Market Data Modes */}
        <button
          type="button"
          className="btn-sim"
          style={{ background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.4)', color: '#34d399' }}
          onClick={() => handleAction('live-feed', () => simulateLiveDataMode('LIVE_STREAM'))}
          disabled={isRunning !== null}
          title="Force Live Data Stream mode (Yahoo Finance NSE)"
        >
          <Activity size={12} className={isRunning === 'live-feed' ? 'spin' : ''} />
          <span>📡 Live NSE Stream</span>
        </button>

        <button
          type="button"
          className="btn-sim"
          style={{ background: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24' }}
          onClick={() => handleAction('mkt-closed', () => simulateLiveDataMode('MARKET_CLOSED'))}
          disabled={isRunning !== null}
          title="Force Market Closed fallback mode"
        >
          <Clock size={12} className={isRunning === 'mkt-closed' ? 'spin' : ''} />
          <span>⏰ Fallback: Market Closed</span>
        </button>

        <button
          type="button"
          className="btn-sim"
          style={{ background: 'rgba(249, 115, 22, 0.15)', borderColor: 'rgba(249, 115, 22, 0.4)', color: '#fb923c' }}
          onClick={() => handleAction('rate-limit', () => simulateLiveDataMode('RATE_LIMITED'))}
          disabled={isRunning !== null}
          title="Force HTTP 429 Rate Limit transparent fallback"
        >
          <ShieldAlert size={12} className={isRunning === 'rate-limit' ? 'spin' : ''} />
          <span>⚠️ Fallback: Rate Limited (429)</span>
        </button>

        <button
          type="button"
          className="btn-sim"
          style={{ background: 'rgba(249, 115, 22, 0.15)', borderColor: 'rgba(249, 115, 22, 0.4)', color: '#fb923c' }}
          onClick={() => handleAction('timeout', () => simulateLiveDataMode('TIMEOUT'))}
          disabled={isRunning !== null}
          title="Force Feed Latency Timeout (>3,000ms) fallback"
        >
          <Clock size={12} className={isRunning === 'timeout' ? 'spin' : ''} />
          <span>⏱️ Fallback: Timeout (&gt;3s)</span>
        </button>

        {/* Normal Micro Tick */}
        <button
          type="button"
          className="btn-sim"
          onClick={() => handleAction('tick', simulateTick)}
          disabled={isRunning !== null}
          title="Trigger price tick across all watchlist symbols"
        >
          <Play size={12} className={isRunning === 'tick' ? 'spin' : ''} />
          <span>Simulate Tick</span>
        </button>

        {/* Stale Degradation */}
        <button
          type="button"
          className="btn-sim btn-sim-warning"
          onClick={() => handleAction('stale', () => simulateStaleness('INFY', 28))}
          disabled={isRunning !== null}
          title="Make INFY 28m stale to demo visual degradation, tilde notation & dashed sparkline"
        >
          <Clock size={12} className={isRunning === 'stale' ? 'spin' : ''} />
          <span>Test Stale Degradation (INFY)</span>
        </button>

        {/* Feed Divergence */}
        <button
          type="button"
          className="btn-sim btn-sim-danger"
          onClick={() => handleAction('diverge', () => simulateDivergence('RELIANCE', 1.45))}
          disabled={isRunning !== null}
          title="Simulate 1.45% feed spread between NSE & BSE on RELIANCE to trigger divergence alert"
        >
          <AlertTriangle size={12} className={isRunning === 'diverge' ? 'spin' : ''} />
          <span>Test Feed Spread (RELIANCE)</span>
        </button>

        {/* Reset All */}
        <button
          type="button"
          className="btn-sim btn-sim-reset"
          onClick={() =>
            handleAction('reset', async () => {
              await resetSimulation('INFY');
              await resetSimulation('RELIANCE');
              await simulateLiveDataMode(null);
            })
          }
          disabled={isRunning !== null}
          title="Reset all artificial test overrides"
        >
          <RefreshCw size={12} className={isRunning === 'reset' ? 'spin' : ''} />
          <span>Reset Feeds</span>
        </button>
      </div>
    </div>
  );
};
