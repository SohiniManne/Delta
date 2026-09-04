import React, { useState } from 'react';
import { User, X, Check, ArrowRight } from 'lucide-react';

interface UserIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onSelectUser: (userId: string) => void;
}

const SAMPLE_PROFILES = [
  { id: 'alice_quant', name: 'Alice (Quantitative Trader)', desc: 'High-frequency momentum watchlist' },
  { id: 'bob_macro', name: 'Bob (Global Macro)', desc: 'Large-cap tech & macroeconomic hedges' },
  { id: 'crypto_whale', name: 'Charlie (Digital Assets)', desc: 'Crypto & high-beta growth assets' },
];

export const UserIdentityModal: React.FC<UserIdentityModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  onSelectUser,
}) => {
  const [customInput, setCustomInput] = useState('');

  if (!isOpen) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (clean) {
      onSelectUser(clean);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} style={{ color: 'var(--accent-cyan)' }} />
              <h3>Trader Identity / Profile</h3>
            </div>
            <p>Each profile maintains isolated versioned snapshots & diff baselines</p>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Preset Profiles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Quick Switch Preset Profiles:
            </span>
            {SAMPLE_PROFILES.map((prof) => {
              const isSelected = currentUserId === prof.id;
              return (
                <div
                  key={prof.id}
                  onClick={() => {
                    onSelectUser(prof.id);
                    onClose();
                  }}
                  className="search-result-row"
                  style={{
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                    background: isSelected ? 'rgba(0, 229, 255, 0.08)' : 'var(--bg-surface)',
                  }}
                >
                  <div className="result-info">
                    <span className="result-symbol" style={{ color: isSelected ? 'var(--accent-cyan)' : '#FFFFFF' }}>
                      {prof.name}
                    </span>
                    <span className="result-name mono" style={{ fontSize: '11px' }}>ID: {prof.id}</span>
                    <span className="result-sector">{prof.desc}</span>
                  </div>
                  {isSelected && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-cyan)', fontSize: '12px', fontWeight: 700 }}>
                      <Check size={14} /> Active
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Custom User ID Input Form */}
          <form onSubmit={handleCustomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Or Enter Custom Trader ID:
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="e.g. hedgefund_corp_1"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                className="modal-search-input"
                style={{ paddingLeft: '12px' }}
              />
              <button
                type="submit"
                className="btn-add-result"
                style={{ padding: '0 16px', whiteSpace: 'nowrap' }}
                disabled={!customInput.trim()}
              >
                <span>Switch</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
