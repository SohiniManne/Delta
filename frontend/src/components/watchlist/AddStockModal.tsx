import React, { useState, useEffect } from 'react';
import { SearchResult } from '../../types';
import { searchSymbols } from '../../services/api';
import { Search, X, Plus, Check } from 'lucide-react';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSymbol: (symbol: string) => Promise<void>;
  existingSymbols: string[];
}

export const AddStockModal: React.FC<AddStockModalProps> = ({
  isOpen,
  onClose,
  onAddSymbol,
  existingSymbols,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [addingSymbol, setAddingSymbol] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setErrorMessage(null);
      return;
    }
    // Initial fetch of popular symbols
    setIsLoading(true);
    searchSymbols('')
      .then((res) => setResults(res))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen) {
        setIsLoading(true);
        searchSymbols(query)
          .then((res) => setResults(res))
          .finally(() => setIsLoading(false));
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const handleAdd = async (symbol: string) => {
    try {
      setAddingSymbol(symbol);
      setErrorMessage(null);
      await onAddSymbol(symbol);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add symbol');
    } finally {
      setAddingSymbol(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h3>Add Asset to Watchlist</h3>
            <p>Track live snapshot states and structured version diffs</p>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="modal-search-box">
          <Search size={16} className="modal-search-icon" />
          <input
            type="text"
            placeholder="Search by symbol or company name (e.g. AMD, Meta, Crypto)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="modal-search-input"
          />
        </div>

        {errorMessage && <div className="modal-error-banner">{errorMessage}</div>}

        {/* Results List */}
        <div className="modal-results-list">
          {isLoading ? (
            <div className="modal-loading-state">Searching market feeds...</div>
          ) : results.length === 0 ? (
            <div className="modal-empty-state">No matching tickers found.</div>
          ) : (
            results.map((item) => {
              const isAlreadyAdded = existingSymbols.includes(item.symbol.toUpperCase());
              return (
                <div key={item.symbol} className="search-result-row">
                  <div className="result-info">
                    <span className="result-symbol mono">{item.symbol}</span>
                    <span className="result-name">{item.name}</span>
                    <span className="result-sector">{item.sector}</span>
                  </div>
                  <div className="result-action">
                    <span className="result-price mono">${item.price.toFixed(2)}</span>
                    <button
                      type="button"
                      className={`btn-add-result ${isAlreadyAdded ? 'added' : ''}`}
                      onClick={() => !isAlreadyAdded && handleAdd(item.symbol)}
                      disabled={isAlreadyAdded || addingSymbol === item.symbol}
                    >
                      {isAlreadyAdded ? (
                        <>
                          <Check size={13} />
                          <span>Tracked</span>
                        </>
                      ) : addingSymbol === item.symbol ? (
                        <span>Adding...</span>
                      ) : (
                        <>
                          <Plus size={13} />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
