import React, { useState } from 'react';
import { UserWatchlist } from '../../types';
import {
  ListFilter,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
} from 'lucide-react';

interface SidebarProps {
  watchlists: UserWatchlist[];
  activeWatchlistId: string;
  onSelectWatchlist: (id: string) => void;
  onCreateWatchlist: (name: string) => Promise<any>;
  onRenameWatchlist: (id: string, newName: string) => Promise<any>;
  onDeleteWatchlist: (id: string) => Promise<any>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  watchlists,
  activeWatchlistId,
  onSelectWatchlist,
  onCreateWatchlist,
  onRenameWatchlist,
  onDeleteWatchlist,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStartCreate = () => {
    setIsCreating(true);
    setNewWatchlistName('');
    setErrorMsg(null);
  };

  const handleSaveCreate = async () => {
    if (!newWatchlistName.trim()) return;
    try {
      setErrorMsg(null);
      await onCreateWatchlist(newWatchlistName.trim());
      setIsCreating(false);
      setNewWatchlistName('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create');
    }
  };

  const handleStartRename = (e: React.MouseEvent, wl: UserWatchlist) => {
    e.stopPropagation();
    setEditingId(wl.id);
    setEditingName(wl.name);
    setErrorMsg(null);
  };

  const handleSaveRename = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!editingName.trim()) return;
    try {
      setErrorMsg(null);
      await onRenameWatchlist(id, editingName.trim());
      setEditingId(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to rename');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (watchlists.length <= 1) {
      alert('Cannot delete the only watchlist.');
      return;
    }
    if (confirm('Are you sure you want to delete this watchlist and its checkpoints?')) {
      try {
        await onDeleteWatchlist(id);
      } catch (err: any) {
        alert(err.message || 'Failed to delete');
      }
    }
  };

  return (
    <aside className="terminal-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <div className="sidebar-heading">
            <ListFilter size={14} className="accent-icon" />
            <span>PORTFOLIOS</span>
          </div>
          <button
            type="button"
            className="sidebar-add-btn"
            onClick={handleStartCreate}
            title="Create new named watchlist"
          >
            <Plus size={13} />
            <span>New</span>
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="sidebar-inline-form">
          <input
            type="text"
            className="sidebar-inline-input"
            placeholder="Watchlist Name..."
            value={newWatchlistName}
            onChange={(e) => setNewWatchlistName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveCreate();
              if (e.key === 'Escape') setIsCreating(false);
            }}
          />
          <div className="sidebar-inline-actions">
            <button
              type="button"
              className="btn-icon-check"
              onClick={handleSaveCreate}
              title="Save"
            >
              <Check size={13} />
            </button>
            <button
              type="button"
              className="btn-icon-cancel"
              onClick={() => setIsCreating(false)}
              title="Cancel"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {errorMsg && <div className="sidebar-error-text">{errorMsg}</div>}

      <div className="sidebar-list">
        {watchlists.map((wl) => {
          const isActive = wl.id === activeWatchlistId;
          const isEditing = editingId === wl.id;

          return (
            <div
              key={wl.id}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => !isEditing && onSelectWatchlist(wl.id)}
            >
              <div className="sidebar-item-content">
                <div className="sidebar-item-indicator" />
                {isEditing ? (
                  <div className="sidebar-inline-form" style={{ padding: 0, margin: 0, width: '100%' }}>
                    <input
                      type="text"
                      className="sidebar-inline-input"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(e as any, wl.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                    <div className="sidebar-inline-actions">
                      <button
                        type="button"
                        className="btn-icon-check"
                        onClick={(e) => handleSaveRename(e, wl.id)}
                      >
                        <Check size={12} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon-cancel"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(null);
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="sidebar-item-main">
                      <span className="sidebar-item-name" title={wl.name}>
                        {wl.name}
                      </span>
                      <span className="sidebar-item-badge">
                        {wl.symbols?.length || 0}
                      </span>
                    </div>

                    <div className="sidebar-item-actions">
                      <button
                        type="button"
                        className="sidebar-action-btn"
                        onClick={(e) => handleStartRename(e, wl)}
                        title="Rename watchlist"
                      >
                        <Edit2 size={11} />
                      </button>
                      {watchlists.length > 1 && (
                        <button
                          type="button"
                          className="sidebar-action-btn delete"
                          onClick={(e) => handleDelete(e, wl.id)}
                          title="Delete watchlist"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-stat-row">
          <span className="sidebar-stat-label">ENGINE MODE</span>
          <span className="sidebar-stat-val text-cyan">DIFFERENTIAL</span>
        </div>
        <div className="sidebar-stat-row">
          <span className="sidebar-stat-label">ACTIVE WATCHLISTS</span>
          <span className="sidebar-stat-val mono">{watchlists.length}</span>
        </div>
      </div>
    </aside>
  );
};
