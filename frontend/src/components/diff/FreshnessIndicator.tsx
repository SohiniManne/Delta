import React, { useState } from 'react';
import { DataSourceConfidence, FreshnessLevel } from '../../types';
import { AlertTriangle, Clock } from 'lucide-react';

interface FreshnessIndicatorProps {
  freshness: FreshnessLevel;
  dataAgeMs: number;
  confidence?: DataSourceConfidence;
  primaryPrice?: number;
}

export const FreshnessIndicator: React.FC<FreshnessIndicatorProps> = ({
  freshness,
  dataAgeMs,
  confidence = {
    level: 'HIGH',
    isDivergent: false,
    primaryProvider: 'Finnhub Market Stream',
    asOf: Date.now(),
  },
  primaryPrice,
}) => {
  const [showPopover, setShowPopover] = useState(false);

  const formatAge = (ms: number): string => {
    const seconds = Math.max(1, Math.floor(ms / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const isStale = freshness === 'STALE';
  const isDelayed = freshness === 'DELAYED';
  const isDivergent = confidence.isDivergent;

  return (
    <div className="freshness-indicator-container" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* 1. Divergence Warning Badge (Highest Priority Alert) */}
      {isDivergent ? (
        <button
          type="button"
          className="badge-pill badge-divergence"
          onClick={() => setShowPopover(!showPopover)}
          onMouseEnter={() => setShowPopover(true)}
          onMouseLeave={() => setShowPopover(false)}
          title="Click to inspect feed discrepancy"
        >
          <AlertTriangle size={11} className="badge-icon alert-pulse" />
          <span>Feeds Diverge ±{confidence.divergencePercent?.toFixed(2)}%</span>
        </button>
      ) : isStale ? (
        /* 2. Stale Data Badge */
        <button
          type="button"
          className="badge-pill badge-stale"
          onClick={() => setShowPopover(!showPopover)}
          onMouseEnter={() => setShowPopover(true)}
          onMouseLeave={() => setShowPopover(false)}
        >
          <Clock size={11} className="badge-icon" />
          <span>Stale ({formatAge(dataAgeMs)})</span>
        </button>
      ) : isDelayed ? (
        /* 3. Delayed Badge */
        <span className="badge-pill badge-delayed" title={`Data updated ${formatAge(dataAgeMs)}`}>
          <Clock size={10} className="badge-icon" />
          <span>Delayed ({formatAge(dataAgeMs)})</span>
        </span>
      ) : (
        /* 4. Real-time Live Indicator */
        <span className="badge-pill badge-realtime" title="Verified Real-Time Market Stream">
          <span className="live-ping-dot" />
          <span>Real-time</span>
        </span>
      )}

      {/* Popover Breakdown on Hover / Click */}
      {showPopover && (
        <div className="confidence-popover-card">
          <div className="popover-header">
            <span className="popover-title">Data Feed Quality Audit</span>
            <span className={`confidence-tag tag-${confidence.level.toLowerCase()}`}>
              {confidence.level} Confidence
            </span>
          </div>

          <div className="popover-body">
            {isDivergent && (
              <div className="popover-alert-box">
                <AlertTriangle size={13} className="alert-icon" />
                <div>
                  <strong>Cross-Source Feed Discrepancy</strong>
                  <p>Primary and fallback exchanges differ by {confidence.divergencePercent?.toFixed(2)}%. Precision has been degraded to avoid false certainty.</p>
                </div>
              </div>
            )}

            {isStale && (
              <div className="popover-alert-box alert-stale-box">
                <Clock size={13} className="alert-icon" />
                <div>
                  <strong>Stale Quote Warning</strong>
                  <p>This quote is {formatAge(dataAgeMs)} old. Prices are rendered with approximation tildes (~).</p>
                </div>
              </div>
            )}

            <div className="feed-source-list">
              <div className="feed-row">
                <span className="feed-name">Primary Provider:</span>
                <span className="feed-val">{confidence.primaryProvider}</span>
              </div>
              {confidence.secondaryProvider && (
                <div className="feed-row">
                  <span className="feed-name">Fallback Provider:</span>
                  <span className="feed-val">{confidence.secondaryProvider}</span>
                </div>
              )}
              {primaryPrice && (
                <div className="feed-row">
                  <span className="feed-name">Reported Price:</span>
                  <span className="feed-val mono">${primaryPrice.toFixed(2)}</span>
                </div>
              )}
              <div className="feed-row">
                <span className="feed-name">Last Quote As Of:</span>
                <span className="feed-val">{new Date(confidence.asOf).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
