import React, { useState } from 'react';
import {
  simulateTick,
  simulateStaleness,
  simulateDivergence,
  resetSimulation,
} from '../../services/api';
import { Play, AlertTriangle, Clock, RefreshCw, Sparkles } from 'lucide-react';

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
    <div className="simulation-toolbar">
      <div className="simulation-title-group">
        <Sparkles size={14} className="sim-icon" />
        <span className="sim-title">Demo Controls:</span>
      </div>

      <div className="simulation-buttons-group">
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

        <button
          type="button"
          className="btn-sim btn-sim-warning"
          onClick={() => handleAction('stale', () => simulateStaleness('TSLA', 28))}
          disabled={isRunning !== null}
          title="Make TSLA 28m stale to demo visual degradation, tilde notation & dashed sparkline"
        >
          <Clock size={12} className={isRunning === 'stale' ? 'spin' : ''} />
          <span>Test Stale Degradation (TSLA)</span>
        </button>

        <button
          type="button"
          className="btn-sim btn-sim-danger"
          onClick={() => handleAction('diverge', () => simulateDivergence('NVDA', 1.45))}
          disabled={isRunning !== null}
          title="Simulate 1.45% feed spread between exchanges on NVDA to trigger divergence alert"
        >
          <AlertTriangle size={12} className={isRunning === 'diverge' ? 'spin' : ''} />
          <span>Test Feed Divergence (NVDA)</span>
        </button>

        <button
          type="button"
          className="btn-sim btn-sim-reset"
          onClick={() =>
            handleAction('reset', async () => {
              await resetSimulation('TSLA');
              await resetSimulation('NVDA');
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
