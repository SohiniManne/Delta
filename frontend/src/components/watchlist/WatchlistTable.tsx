import React, { useState } from 'react';
import { TickerDiff, TickerState } from '../../types';
import { Sparkline } from '../common/Sparkline';
import { FreshnessIndicator } from '../diff/FreshnessIndicator';
import {
  formatINR,
  formatDeltaINR,
  formatPercentDelta,
} from '../../utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Zap,
  Sparkles,
  FileText,
} from 'lucide-react';

interface WatchlistTableProps {
  diffs: TickerDiff[];
  liveTickers?: Record<string, TickerState>;
  selectedSymbol?: string | null;
  onSelectSymbol?: (symbol: string) => void;
  onRemoveSymbol: (symbol: string) => Promise<void>;
  onOpenAddModal: () => void;
  isRemoving?: string | null;
}

export const WatchlistTable: React.FC<WatchlistTableProps> = ({
  diffs,
  liveTickers = {},
  selectedSymbol,
  onSelectSymbol,
  onRemoveSymbol,
  onOpenAddModal,
  isRemoving,
}) => {
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [showCompareSymbol, setShowCompareSymbol] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCompare = (symbol: string) => {
    setShowCompareSymbol(showCompareSymbol === symbol ? null : symbol);
  };

  const filteredDiffs = diffs.filter(
    (d) =>
      d.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRowClick = (symbol: string) => {
    if (onSelectSymbol) {
      onSelectSymbol(symbol);
    }
  };

  const toggleExpand = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    setExpandedSymbol(expandedSymbol === symbol ? null : symbol);
    if (onSelectSymbol) {
      onSelectSymbol(symbol);
    }
  };

  return (
    <div className="watchlist-section-card compact-terminal-card">
      {/* Table Header Controls */}
      <div className="watchlist-controls-bar">
        <div className="controls-left">
          <div className="controls-title-stack">
            <h3 className="section-heading">MARKET DIFF MATRIX</h3>
            <span className="section-subtext">Real-time delta telemetry vs. checkpoint baseline</span>
          </div>
          <span className="ticker-count-badge">{diffs.length} Tracked</span>
        </div>

        <div className="controls-right">
          <input
            type="text"
            placeholder="Filter symbols..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="button" className="btn-add-stock" onClick={onOpenAddModal}>
            <Plus size={14} />
            <span>Add Symbol</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="table-responsive">
        <table className="watchlist-table compact-table">
          <thead>
            <tr>
              <th className="th-asset">Asset</th>
              <th className="th-price">Live Price</th>
              <th className="th-base">Base Price</th>
              <th className="th-delta">₹Δ (Shift)</th>
              <th className="th-delta-pct">% Delta</th>
              <th className="th-sparkline">Trend</th>
              <th className="th-signals">Technical Signals</th>
              <th className="th-freshness">Data Feed</th>
              <th className="th-actions"></th>
            </tr>
          </thead>
          <tbody>
            {filteredDiffs.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-row">
                  No matching assets found in watchlist.
                </td>
              </tr>
            ) : (
              filteredDiffs.map((item) => {
                const live = liveTickers[item.symbol];
                const isExpanded = expandedSymbol === item.symbol;
                const isSelected = selectedSymbol === item.symbol;
                const isPositive = item.percentDelta >= 0;

                const confidence = item.confidence || live?.confidence || {
                  level: 'HIGH',
                  isDivergent: false,
                  primaryProvider: 'Finnhub Market Stream',
                  asOf: Date.now(),
                };
                const dataAgeMs = item.dataAgeMs || live?.dataAgeMs || 0;
                const isStale = item.targetFreshness === 'STALE' || (live?.freshness === 'STALE');
                const isDivergent = confidence.isDivergent;
                const isDegraded = item.isDegraded || isStale || isDivergent;

                // Price display with approximation tilde for degraded precision
                const displayPrice = isDegraded
                  ? `~${formatINR(item.targetPrice, isDivergent ? 1 : 2)}`
                  : formatINR(item.targetPrice);

                const displayDelta = formatDeltaINR(item.priceDelta, isDegraded);
                const displayPercent = formatPercentDelta(item.percentDelta, isDegraded);

                return (
                  <React.Fragment key={item.symbol}>
                    <tr
                      className={`table-row ${isExpanded ? 'row-expanded' : ''} ${
                        isSelected ? 'row-selected' : ''
                      } ${isDegraded ? 'row-degraded' : ''} ${isStale ? 'row-stale' : ''}`}
                      onClick={() => handleRowClick(item.symbol)}
                    >
                      {/* 1. Asset Info */}
                      <td className="td-asset">
                        <div className="asset-cell">
                          <span className="asset-symbol mono">{item.symbol}</span>
                          <span className="asset-name">{item.name}</span>
                        </div>
                      </td>

                      {/* 2. Live Price (Degraded styling if stale/divergent) */}
                      <td className="td-price mono">
                        <div className={`price-cell ${isDegraded ? 'price-degraded' : ''}`}>
                          <span className="price-val">{displayPrice}</span>
                          {isDegraded && (
                            <span className="approx-note" title={isStale ? "Stale Quote (~)" : "Source Discrepancy (~)"}>
                              {isStale ? '~ stale' : '~ approx'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Base Checkpoint Price */}
                      <td className="td-base mono">
                        <span className="base-price-val">{formatINR(item.basePrice)}</span>
                      </td>

                      {/* 4. Shift Delta */}
                      <td className="td-delta mono">
                        <span className={`delta-val ${isPositive ? 'positive' : 'negative'} ${isDegraded ? 'degraded-text' : ''}`}>
                          {displayDelta}
                        </span>
                      </td>

                      {/* 5. % Delta Pill */}
                      <td className="td-delta-pct">
                        <div
                          className={`delta-pill ${
                            isStale
                              ? 'pill-stale'
                              : isPositive
                              ? 'pill-positive'
                              : 'pill-negative'
                          }`}
                        >
                          {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          <span className="mono">{displayPercent}</span>
                        </div>
                      </td>

                      {/* 6. Sparkline (Dashed if stale/degraded) */}
                      <td className="td-sparkline">
                        <Sparkline
                          data={item.sparkline}
                          width={85}
                          height={22}
                          isDegraded={isDegraded}
                          freshness={isStale ? 'STALE' : item.targetFreshness}
                          percentDelta={item.percentDelta}
                        />
                      </td>

                      {/* 7. Technical Signals */}
                      <td className="td-signals">
                        <div className="signals-group">
                          {/* Live RSI Reading */}
                          {live && (
                            <span
                              className={`signal-chip ${
                                live.rsi14 >= 70
                                  ? 'chip-danger'
                                  : live.rsi14 <= 30
                                  ? 'chip-warning'
                                  : 'chip-neutral'
                              }`}
                              title={`14-period RSI: ${live.rsi14}`}
                            >
                              RSI {live.rsi14.toFixed(0)}
                              {live.rsi14 >= 70 && ' (OB)'}
                              {live.rsi14 <= 30 && ' (OS)'}
                            </span>
                          )}

                          {/* MACD Cross Badge */}
                          {item.indicatorShifts.macdCross === 'BULLISH_CROSS' && (
                            <span className="signal-chip chip-success" title="Bullish MACD crossover formed since baseline">
                              MACD Bull
                            </span>
                          )}
                          {item.indicatorShifts.macdCross === 'BEARISH_CROSS' && (
                            <span className="signal-chip chip-danger" title="Bearish MACD cross formed since baseline">
                              MACD Bear
                            </span>
                          )}

                          {/* Volume Surge Badge */}
                          {item.volumeRatio > 1.2 && (
                            <span className="signal-chip chip-volume" title={`${item.volumeRatio}x average trading volume`}>
                              {item.volumeRatio.toFixed(1)}x Vol
                            </span>
                          )}

                          {/* Catalyst Badge */}
                          {item.newCatalysts.length > 0 && (
                            <span className="signal-chip chip-catalyst" title={`${item.newCatalysts.length} breaking catalyst events between snapshots`}>
                              <Zap size={10} />
                              {item.newCatalysts.length} News
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 8. Freshness & Quality Badge */}
                      <td className="td-freshness">
                        <FreshnessIndicator
                          freshness={isStale ? 'STALE' : item.targetFreshness}
                          dataAgeMs={dataAgeMs}
                          confidence={confidence}
                          primaryPrice={item.targetPrice}
                        />
                      </td>

                      {/* 9. Action Buttons */}
                      <td className="td-actions">
                        <div className="actions-cell">
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={(e) => toggleExpand(e, item.symbol)}
                            title="Expand structured diff details"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          <button
                            type="button"
                            className="btn-icon btn-icon-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveSymbol(item.symbol);
                            }}
                            disabled={isRemoving === item.symbol}
                            title={`Remove ${item.symbol} from watchlist`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Detail Row: NLP Takeaway & Breaking Catalysts */}
                    {isExpanded && (
                      <tr className="expanded-row">
                        <td colSpan={9} className="expanded-cell">
                          <div className="expanded-content-card">
                            {/* NLP Takeaway Banner with AI / Templated Badge */}
                            <div className={`takeaway-banner ${item.isAiNarrated ? 'takeaway-banner-ai' : 'takeaway-banner-templated'}`}>
                              <div className="takeaway-banner-top">
                                <div className="takeaway-title-row">
                                  {item.isAiNarrated ? (
                                    <span className="narrator-badge ai-narrator-badge" title="Synthesized by Gemini AI Diff Narrator strictly from structured snapshot deltas">
                                      <Sparkles size={11} className="sparkle-icon" />
                                      <span>AI Analyst</span>
                                    </span>
                                  ) : (
                                    <span className="narrator-badge rule-based-badge" title="Deterministic rule-based summary (fallback baseline)">
                                      <FileText size={11} />
                                      <span>Rule-Based</span>
                                    </span>
                                  )}
                                  <span className="takeaway-heading">Structured Diff Synthesis</span>
                                </div>

                                {item.templatedTakeaway && item.keyTakeaway !== item.templatedTakeaway && (
                                  <button
                                    type="button"
                                    className="btn-compare-takeaways"
                                    onClick={() => toggleCompare(item.symbol)}
                                    title="Compare AI narrative vs deterministic rule-based template"
                                  >
                                    {showCompareSymbol === item.symbol ? 'Hide Comparison' : 'Compare AI vs Rule-Based'}
                                  </button>
                                )}
                              </div>

                              <div className="takeaway-text-main">
                                <p className="takeaway-content-p">{item.keyTakeaway}</p>

                                {showCompareSymbol === item.symbol && item.templatedTakeaway && (
                                  <div className="takeaway-comparison-card">
                                    <div className="comp-row comp-ai">
                                      <span className="comp-tag tag-ai">✨ AI Enhanced</span>
                                      <p className="comp-p">{item.keyTakeaway}</p>
                                    </div>
                                    <div className="comp-row comp-rule">
                                      <span className="comp-tag tag-rule">📋 Templated Fallback</span>
                                      <p className="comp-p">{item.templatedTakeaway}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Catalysts List */}
                            {item.newCatalysts.length > 0 && (
                              <div className="catalysts-section">
                                <div className="catalysts-header">
                                  <Zap size={12} />
                                  <span>Catalysts Occurring Between Snapshots:</span>
                                </div>
                                <div className="catalyst-items-grid">
                                  {item.newCatalysts.map((cat) => (
                                    <div key={cat.id} className="catalyst-item-card">
                                      <div className="cat-top">
                                        <span className={`cat-impact impact-${cat.impact.toLowerCase()}`}>
                                          {cat.impact}
                                        </span>
                                        <span className="cat-source">{cat.source}</span>
                                        <span className="cat-time">
                                          {new Date(cat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                      <div className="cat-headline">{cat.headline}</div>
                                      <div className="cat-summary">{cat.summary}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
