import React, { useMemo } from 'react';
import { TickerDiff, TickerState } from '../../types';
import {
  formatINR,
  formatDeltaINR,
  formatPercentDelta,
  formatMarketCapINR,
} from '../../utils/formatters';
import {
  Activity,
  Zap,
  BarChart3,
  ShieldCheck,
  Clock,
  Info,
} from 'lucide-react';

interface TechnicalPanelProps {
  diff: TickerDiff | null;
  tickerState: TickerState | null;
}

export const TechnicalPanel: React.FC<TechnicalPanelProps> = ({
  diff,
  tickerState,
}) => {
  if (!diff && !tickerState) {
    return (
      <aside className="technical-panel empty-state">
        <div className="technical-panel-empty">
          <Activity size={32} className="text-muted spin-slow" />
          <h4>SELECT AN INSTRUMENT</h4>
          <p>Click any row in the market matrix to launch real-time technical diff telemetry, indicator meters, and price trajectory charts.</p>
        </div>
      </aside>
    );
  }

  const symbol = diff?.symbol || tickerState?.symbol || 'UNKNOWN';
  const name = diff?.name || tickerState?.name || symbol;
  const currentPrice = diff ? diff.targetPrice : (tickerState?.price || 0);
  const basePrice = diff ? diff.basePrice : (tickerState?.open || currentPrice);
  const priceDelta = diff ? diff.priceDelta : (currentPrice - basePrice);
  const percentDelta = diff ? diff.percentDelta : (basePrice ? (priceDelta / basePrice) * 100 : 0);
  const isPositive = priceDelta >= 0;

  const rawSparkline = diff?.sparkline || tickerState?.sparkline || [];
  const rsi = tickerState?.rsi14 ?? (diff ? 50 + diff.indicatorShifts.rsiChange : 50);
  const macd = tickerState?.macd || { value: 1.25, signal: 0.85, histogram: 0.40 };
  const catalysts = diff?.newCatalysts || tickerState?.activeCatalysts || [];
  const confidence = diff?.confidence || tickerState?.confidence;
  const freshness = diff?.targetFreshness || tickerState?.freshness || 'REALTIME';

  // Construct a robust, visually rich 20-point trajectory from basePrice to currentPrice
  const trajectoryPoints = useMemo(() => {
    if (rawSparkline && rawSparkline.length >= 10) {
      return rawSparkline;
    }
    // Synthesize realistic 20-point curve if sparkline has too few points
    const pts: number[] = [];
    const count = 20;
    const dayHigh = tickerState?.high || Math.max(basePrice, currentPrice) * 1.008;
    const dayLow = tickerState?.low || Math.min(basePrice, currentPrice) * 0.992;
    const spread = dayHigh - dayLow || currentPrice * 0.01;

    for (let i = 0; i < count; i++) {
      const progress = i / (count - 1);
      const linear = basePrice + (currentPrice - basePrice) * progress;
      // Controlled sine wave variation + micro noise
      const curve = Math.sin(progress * Math.PI) * (spread * 0.25 * (isPositive ? 1 : -0.5));
      const val = linear + curve;
      pts.push(parseFloat(val.toFixed(2)));
    }
    pts[0] = basePrice;
    pts[count - 1] = currentPrice;
    return pts;
  }, [rawSparkline, basePrice, currentPrice, tickerState, isPositive]);

  // SVG dimensions for main price chart
  const chartW = 340;
  const chartH = 125;
  const padding = 14;

  const minP = Math.min(...trajectoryPoints, basePrice, currentPrice);
  const maxP = Math.max(...trajectoryPoints, basePrice, currentPrice);
  const buffer = (maxP - minP) * 0.1 || (currentPrice * 0.005) || 1;
  const plotMin = minP - buffer;
  const plotMax = maxP + buffer;
  const plotRange = plotMax - plotMin || 1;

  const coords = trajectoryPoints.map((val, idx) => {
    const x = padding + (idx / Math.max(1, trajectoryPoints.length - 1)) * (chartW - padding * 2);
    const y = chartH - padding - ((val - plotMin) / plotRange) * (chartH - padding * 2);
    return { x: parseFloat(x.toFixed(1)), y: parseFloat(y.toFixed(1)) };
  });

  const polylineStr = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const polygonStr = `${padding},${chartH - padding} ${polylineStr} ${chartW - padding},${chartH - padding}`;

  const baseY = chartH - padding - ((basePrice - plotMin) / plotRange) * (chartH - padding * 2);
  const currentY = chartH - padding - ((currentPrice - plotMin) / plotRange) * (chartH - padding * 2);

  const themeColor = isPositive ? '#10B981' : '#F43F5E';
  const gradId = `tech-grad-${symbol.replace(/[^a-zA-Z0-9]/g, '')}`;

  const rsiClamped = Math.max(0, Math.min(100, rsi));

  return (
    <aside className="technical-panel">
      {/* Panel Header */}
      <div className="tech-panel-header">
        <div className="tech-header-left">
          <div className="tech-symbol-badge">
            <span className="tech-symbol">{symbol}</span>
            <span className="tech-name">{name}</span>
          </div>
        </div>
        <div className="tech-header-right">
          <div className="tech-price-stack">
            <span className="tech-current-price">{formatINR(currentPrice)}</span>
            <span className={`tech-price-delta ${isPositive ? 'positive' : 'negative'}`}>
              {formatDeltaINR(priceDelta)} ({formatPercentDelta(percentDelta)})
            </span>
          </div>
        </div>
      </div>

      <div className="tech-panel-body">
        {/* Baseline Telemetry Strip */}
        <div className="tech-baseline-strip">
          <div className="tech-strip-item">
            <span className="tech-strip-label">BASELINE REF</span>
            <span className="tech-strip-val mono">{formatINR(basePrice)}</span>
          </div>
          <div className="tech-strip-item">
            <span className="tech-strip-label">VOLUME RATIO</span>
            <span className={`tech-strip-val mono ${(diff?.volumeRatio || 1) > 1.2 ? 'text-amber' : ''}`}>
              {(diff?.volumeRatio || 1.0).toFixed(2)}x
            </span>
          </div>
          <div className="tech-strip-item">
            <span className="tech-strip-label">SEVERITY</span>
            <span className={`tech-strip-val severity-tag ${diff?.severity?.toLowerCase() || 'unchanged'}`}>
              {diff?.severity || 'LIVE'}
            </span>
          </div>
        </div>

        {/* 1. Main Price & Baseline Chart */}
        <div className="tech-chart-card">
          <div className="tech-card-title-row">
            <div className="tech-card-title">
              <BarChart3 size={13} className="accent-icon" />
              <span>PRICE TRAJECTORY vs. BASELINE</span>
            </div>
            <span className="tech-chart-legend">
              <span className="legend-dot baseline-dot" /> Baseline (Ref)
              <span className="legend-dot live-dot" /> Live ({isPositive ? '+Gain' : '-Loss'})
            </span>
          </div>

          <div className="tech-svg-container">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="tech-chart-svg"
              style={{ width: '100%', height: '100%', display: 'block' }}
            >
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={themeColor} stopOpacity="0.30" />
                  <stop offset="100%" stopColor={themeColor} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={padding} y1={chartH * 0.25} x2={chartW - padding} y2={chartH * 0.25} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <line x1={padding} y1={chartH * 0.50} x2={chartW - padding} y2={chartH * 0.50} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
              <line x1={padding} y1={chartH * 0.75} x2={chartW - padding} y2={chartH * 0.75} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

              {/* Baseline Reference Line (Dashed) */}
              <line
                x1={padding}
                y1={baseY}
                x2={chartW - padding}
                y2={baseY}
                stroke="#94A3B8"
                strokeDasharray="4 4"
                strokeWidth="1.4"
                opacity="0.75"
              />

              {/* Gradient Shaded Area */}
              <polygon points={polygonStr} fill={`url(#${gradId})`} />

              {/* Price Line Curve */}
              <polyline
                points={polylineStr}
                fill="none"
                stroke={themeColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Baseline Start Dot */}
              <circle cx={padding} cy={baseY} r="3" fill="#94A3B8" opacity="0.8" />

              {/* End Point Glow Indicator */}
              <circle
                cx={chartW - padding}
                cy={currentY}
                r="4.5"
                fill={themeColor}
                className="pulse-circle"
              />
            </svg>
          </div>

          <div className="tech-chart-scales">
            <span>Low: {formatINR(minP)}</span>
            <span>Base: {formatINR(basePrice)}</span>
            <span>High: {formatINR(maxP)}</span>
          </div>
        </div>

        {/* 2. Indicators: RSI (14) & MACD */}
        <div className="tech-indicators-grid">
          {/* RSI Panel */}
          <div className="tech-subchart-card">
            <div className="tech-card-title-row">
              <div className="tech-card-title">
                <span>RSI (14)</span>
              </div>
              <span className={`rsi-val-badge ${rsi >= 70 ? 'overbought' : rsi <= 30 ? 'oversold' : 'normal'}`}>
                {rsi.toFixed(1)} {rsi >= 70 ? 'OB' : rsi <= 30 ? 'OS' : 'NEU'}
              </span>
            </div>
            <div className="rsi-meter-container">
              <div className="rsi-meter-track">
                {/* 30-70 safe zone */}
                <div className="rsi-safe-zone" style={{ left: '30%', width: '40%' }} />
                {/* Indicator marker */}
                <div
                  className="rsi-marker"
                  style={{
                    left: `${rsiClamped}%`,
                    backgroundColor: rsi >= 70 ? 'var(--accent-rose)' : rsi <= 30 ? 'var(--accent-emerald)' : 'var(--accent-cyan)',
                  }}
                />
              </div>
              <div className="rsi-scale-labels">
                <span>0</span>
                <span>30 (Oversold)</span>
                <span>70 (Overbought)</span>
                <span>100</span>
              </div>
            </div>
          </div>

          {/* MACD Panel */}
          <div className="tech-subchart-card">
            <div className="tech-card-title-row">
              <div className="tech-card-title">
                <span>MACD (12, 26, 9)</span>
              </div>
              <span className={`macd-val-badge ${macd.histogram >= 0 ? 'bullish' : 'bearish'}`}>
                {macd.histogram >= 0 ? '+' : ''}{macd.histogram.toFixed(2)}
              </span>
            </div>
            <div className="macd-metrics-row">
              <div className="macd-metric">
                <span className="label">MACD:</span>
                <span className="val mono">{macd.value.toFixed(2)}</span>
              </div>
              <div className="macd-metric">
                <span className="label">Signal:</span>
                <span className="val mono">{macd.signal.toFixed(2)}</span>
              </div>
              <div className="macd-metric">
                <span className="label">Hist:</span>
                <span className={`val mono ${macd.histogram >= 0 ? 'text-emerald' : 'text-rose'}`}>
                  {macd.histogram.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Fundamental & Microstructure Matrix */}
        <div className="tech-stats-matrix">
          <div className="stat-box">
            <span className="stat-label">DAY HIGH</span>
            <span className="stat-value mono">
              {formatINR(tickerState?.high || currentPrice * 1.008)}
            </span>
          </div>
          <div className="stat-box">
            <span className="stat-label">DAY LOW</span>
            <span className="stat-value mono">
              {formatINR(tickerState?.low || currentPrice * 0.992)}
            </span>
          </div>
          <div className="stat-box">
            <span className="stat-label">MARKET CAP</span>
            <span className="stat-value mono">
              {formatMarketCapINR(tickerState?.marketCap)}
            </span>
          </div>
          <div className="stat-box">
            <span className="stat-label">P/E RATIO</span>
            <span className="stat-value mono">
              {tickerState?.peRatio ? tickerState.peRatio.toFixed(1) : '—'}
            </span>
          </div>
        </div>

        {/* 4. Breaking Catalysts & Narrative */}
        <div className="tech-catalyst-section">
          <div className="tech-card-title-row">
            <div className="tech-card-title">
              <Zap size={12} className="accent-icon" />
              <span>ACTIVE CATALYSTS & EVENTS ({catalysts.length})</span>
            </div>
          </div>

          {catalysts.length === 0 ? (
            <div className="no-catalysts-box">
              <Info size={13} />
              <span>No breaking catalysts recorded since baseline</span>
            </div>
          ) : (
            <div className="tech-catalyst-list">
              {catalysts.map((c) => (
                <div key={c.id} className={`tech-catalyst-card impact-${c.impact.toLowerCase()}`}>
                  <div className="catalyst-header-row">
                    <span className="catalyst-category-tag">{c.category}</span>
                    <span className={`catalyst-impact-tag ${c.impact.toLowerCase()}`}>
                      {c.impact}
                    </span>
                    <span className="catalyst-time">
                      {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="catalyst-headline">{c.headline}</div>
                  {c.summary && <div className="catalyst-summary">{c.summary}</div>}
                  <div className="catalyst-source">Source: {c.source}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Data Feed Health & Provider Info */}
        <div className="tech-feed-health">
          <div className="feed-health-row">
            <div className="feed-label">
              <ShieldCheck size={12} className={confidence?.isDivergent ? 'text-amber' : 'text-cyan'} />
              <span>Feed Provider</span>
            </div>
            <span className="feed-val">{confidence?.primaryProvider || 'NSE / BSE Official BBO'}</span>
          </div>
          <div className="feed-health-row">
            <div className="feed-label">
              <Clock size={12} />
              <span>Telemetry Freshness</span>
            </div>
            <span className={`feed-val freshness-${freshness.toLowerCase()}`}>
              {freshness} (Age: {diff?.dataAgeMs ? `${Math.round(diff.dataAgeMs / 1000)}s` : '0s'})
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};
