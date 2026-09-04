import React from 'react';
import { DiffBaselineOption } from '../../hooks/useDiffReport';
import { History, ArrowRight } from 'lucide-react';

interface TimeTravelBarProps {
  selectedBaseline: DiffBaselineOption;
  onChangeBaseline: (baseline: DiffBaselineOption) => void;
  baseSnapshotName?: string;
  baseSnapshotTimestamp?: number;
  isLoading?: boolean;
}

export const TimeTravelBar: React.FC<TimeTravelBarProps> = ({
  selectedBaseline,
  onChangeBaseline,
  baseSnapshotName,
  baseSnapshotTimestamp,
  isLoading,
}) => {
  return (
    <div className="time-travel-bar">
      <div className="time-travel-left">
        <div className="time-travel-label-group">
          <History size={15} className="time-travel-icon" />
          <span className="time-travel-label">Diff Baseline:</span>
        </div>

        <select
          value={selectedBaseline}
          onChange={(e) => onChangeBaseline(e.target.value as DiffBaselineOption)}
          className="time-travel-select"
          disabled={isLoading}
          aria-label="Select Structured Diff Baseline"
        >
          <option value="LAST_SEEN">Last Visit / Checkpoint</option>
          <option value="TODAY_OPEN">Today's Market Open (09:30 AM)</option>
          <option value="PREVIOUS_CLOSE">Yesterday's Close (04:00 PM)</option>
        </select>
      </div>

      <div className="time-travel-right">
        {baseSnapshotName && (
          <div className="active-baseline-indicator" title="Current comparison baseline">
            <span className="baseline-tag">Active Baseline</span>
            <span className="baseline-name">{baseSnapshotName}</span>
            {baseSnapshotTimestamp && (
              <span className="baseline-time mono">
                ({new Date(baseSnapshotTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
              </span>
            )}
            <ArrowRight size={12} className="baseline-arrow" />
            <span className="baseline-target mono">Live State</span>
          </div>
        )}
      </div>
    </div>
  );
};
