import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  Trash2, 
  Pin, 
  PinOff, 
  RefreshCw, 
  Clock, 
  HardDrive, 
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { 
  getAllTablesFromIDB, 
  deleteTableFromIDB, 
  togglePinTable, 
  clearAllTablesFromIDB, 
  cleanExpiredTables 
} from '../services/indexedDb';

export default function DatasetManager({ isOpen, onClose, onDatasetsChanged }) {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [notification, setNotification] = useState(null);

  const loadDatasets = async () => {
    setLoading(true);
    try {
      const data = await getAllTablesFromIDB();
      setDatasets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDatasets();
    }
  }, [isOpen]);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDelete = async (tableName) => {
    try {
      await deleteTableFromIDB(tableName);
      await loadDatasets();
      showNotification(`Deleted table "${tableName}" from IndexedDB.`);
      if (onDatasetsChanged) onDatasetsChanged();
    } catch (e) {
      alert(`Failed to delete table: ${e.message}`);
    }
  };

  const handleTogglePin = async (tableName, currentPinned) => {
    try {
      await togglePinTable(tableName, !currentPinned);
      await loadDatasets();
      showNotification(!currentPinned ? `Pinned "${tableName}" (Kept Forever)` : `Unpinned "${tableName}" (7-Day Expiry active)`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL custom datasets stored in your browser?')) {
      return;
    }
    setClearing(true);
    try {
      await clearAllTablesFromIDB();
      await loadDatasets();
      showNotification('All datasets cleared from IndexedDB.');
      if (onDatasetsChanged) onDatasetsChanged();
    } catch (e) {
      alert(`Clear failed: ${e.message}`);
    } finally {
      setClearing(false);
    }
  };

  const handleRunCleanupNow = async () => {
    setLoading(true);
    try {
      const purged = await cleanExpiredTables(7);
      await loadDatasets();
      if (purged.length > 0) {
        showNotification(`Cleaned up ${purged.length} expired dataset(s).`);
        if (onDatasetsChanged) onDatasetsChanged();
      } else {
        showNotification('No expired datasets found. Storage is clean!');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (tbl) => {
    if (tbl.is_pinned) return 'Permanent';
    const timestamp = new Date(tbl.updated_at || tbl.created_at).getTime();
    const ageMs = Date.now() - timestamp;
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
    const remainingMs = maxAgeMs - ageMs;
    const days = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Expiring today';
    return `${days}d left`;
  };

  const getSourceBadge = (source) => {
    switch (source) {
      case 'excel':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Excel Workbook</span>;
      case 'sqlite':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">SQLite DB</span>;
      case 'ocr':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">AI OCR Scan</span>;
      case 'csv':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">CSV File</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Manual Grid</span>;
    }
  };

  if (!isOpen) return null;

  const totalRows = datasets.reduce((sum, d) => sum + (d.row_count || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-dropdown w-full max-w-3xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-surface-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent-primary/20 text-accent-primary border border-accent-primary/30">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Browser Storage & Datasets Manager
              </h2>
              <p className="text-xs text-text-muted">
                Manage persistent IndexedDB tables with automatic 7-day hygiene
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Info Banner */}
        <div className="px-6 py-3 bg-white/5 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-text-secondary">
          <div className="flex items-center gap-4">
            <span><strong className="text-white">{datasets.length}</strong> Stored Tables</span>
            <span><strong className="text-accent-primary">{totalRows.toLocaleString()}</strong> Total Rows</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> 7-Day Auto-Cleanup Active
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunCleanupNow}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-surface-100 hover:bg-surface-300 border border-white/10 text-white flex items-center gap-1.5 transition"
              title="Purge unpinned tables older than 7 days"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Run Cleanup
            </button>
            {datasets.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={clearing}
                className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Notification Alert */}
        {notification && (
          <div className="px-6 py-2 bg-accent-primary/20 border-b border-accent-primary/30 text-accent-primary text-xs font-medium flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Datasets List */}
        <div className="p-6 overflow-y-auto max-h-[55vh] space-y-3">
          {loading ? (
            <div className="py-12 text-center text-text-muted text-sm flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-accent-primary" />
              Loading datasets from IndexedDB...
            </div>
          ) : datasets.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-sm flex flex-col items-center gap-3">
              <Database className="w-10 h-10 text-text-muted/40" />
              <div>
                <p className="font-semibold text-text-secondary">No custom datasets stored yet.</p>
                <p className="text-xs text-text-muted mt-1">
                  Upload an Excel workbook, SQLite database, or scan an image to store tables offline.
                </p>
              </div>
            </div>
          ) : (
            datasets.map((tbl) => {
              const remaining = getDaysRemaining(tbl);
              const isPinned = tbl.is_pinned;

              return (
                <div
                  key={tbl.table_name}
                  className="p-4 rounded-xl bg-surface-200/80 border border-white/10 hover:border-white/20 transition flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2.5 rounded-xl ${isPinned ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-surface-100 text-text-secondary border border-white/5'}`}>
                      <Database className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-white text-sm truncate">
                          {tbl.table_name}
                        </span>
                        {getSourceBadge(tbl.source)}
                        {isPinned && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            <Pin className="w-2.5 h-2.5" /> Pinned
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                        <span>{tbl.row_count} rows</span>
                        <span>•</span>
                        <span>{tbl.schema?.columns?.length || 0} columns</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-text-secondary">
                          <Clock className="w-3 h-3" />
                          {isPinned ? 'Kept forever' : `Auto-cleanup: ${remaining}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleTogglePin(tbl.table_name, isPinned)}
                      className={`p-2 rounded-lg border transition text-xs flex items-center gap-1.5 ${
                        isPinned 
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30' 
                          : 'bg-surface-100 text-text-muted border-white/10 hover:text-white hover:bg-surface-300'
                      }`}
                      title={isPinned ? 'Unpin (enable 7-day auto-cleanup)' : 'Pin (keep forever in browser)'}
                    >
                      {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{isPinned ? 'Unpin' : 'Keep Forever'}</span>
                    </button>

                    <button
                      onClick={() => handleDelete(tbl.table_name)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-300 transition"
                      title="Delete this table from IndexedDB"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-surface-200 flex items-center justify-between text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Unpinned tables are safely purged after 7 days of inactivity.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-100 hover:bg-surface-300 border border-white/10 text-white font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
