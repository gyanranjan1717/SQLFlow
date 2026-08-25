import React from 'react';
import { 
  X, 
  Database, 
  Table, 
  Key, 
  Hash, 
  Type, 
  Calendar, 
  CheckSquare, 
  Copy,
  PlusCircle
} from 'lucide-react';

export default function SchemaViewer({
  isOpen,
  onClose,
  tables,
  selectedTable,
  onSelectTable,
  onInsertColumn
}) {
  if (!isOpen) return null;

  const currentTableObj = tables.find((t) => t.table_name === selectedTable) || tables[0];

  const getColIcon = (type) => {
    if (type.includes('INT') || type.includes('FLOAT') || type.includes('NUM')) {
      return <Hash className="w-3.5 h-3.5 text-cyan-400" />;
    }
    if (type.includes('BOOL')) {
      return <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />;
    }
    if (type.includes('DATE') || type.includes('TIME')) {
      return <Calendar className="w-3.5 h-3.5 text-amber-400" />;
    }
    return <Type className="w-3.5 h-3.5 text-purple-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="glass-dropdown w-full max-w-3xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-surface-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-100">
                Database Schema & Datasets Inspector
              </h3>
              <p className="text-xs text-slate-400">
                Inspect available columns and data structures
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Table Selector Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {tables.map((t) => (
              <button
                key={t.table_name}
                onClick={() => onSelectTable(t.table_name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                  selectedTable === t.table_name
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                    : 'bg-surface-100 text-slate-400 hover:text-slate-200 border-white/5'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>{t.table_name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface-200 text-slate-400">
                  {t.row_count}
                </span>
              </button>
            ))}
          </div>

          {/* Active Table Details */}
          {currentTableObj && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface-100/60 border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-slate-100 text-sm font-mono flex items-center gap-2">
                    <span>{currentTableObj.table_name}</span>
                    <span className="text-[11px] font-sans font-medium text-slate-400">
                      ({currentTableObj.row_count} total rows)
                    </span>
                  </h4>
                </div>
                <p className="text-xs text-slate-300">{currentTableObj.description}</p>
              </div>

              {/* Columns Table */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Columns & Data Types
                </h5>
                <div className="rounded-xl border border-white/5 overflow-hidden bg-surface-200/80">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-surface-300 border-b border-white/5 text-slate-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">Column Name</th>
                        <th className="py-2.5 px-4">Data Type</th>
                        <th className="py-2.5 px-4 text-right">Quick Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {currentTableObj.columns.map((col) => (
                        <tr key={col.name} className="hover:bg-surface-100/50 transition-colors">
                          <td className="py-2 px-4 flex items-center gap-2 text-slate-200">
                            {getColIcon(col.type)}
                            <span className="font-semibold">{col.name}</span>
                          </td>
                          <td className="py-2 px-4 text-slate-400 text-[11px]">
                            <span className="px-2 py-0.5 rounded bg-surface-100 border border-white/5">
                              {col.type}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-right font-sans">
                            <button
                              onClick={() => {
                                onInsertColumn?.(col.name);
                                onClose();
                              }}
                              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                            >
                              <PlusCircle className="w-3 h-3" />
                              <span>Insert to Query</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sample Preview Rows */}
              {currentTableObj.sample_rows && currentTableObj.sample_rows.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Sample Data Preview (First {currentTableObj.sample_rows.length} rows)
                  </h5>
                  <div className="rounded-xl border border-white/5 overflow-x-auto bg-[#090d16] p-3 text-[11px] font-mono">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400 text-[10px]">
                          {currentTableObj.columns.map((c) => (
                            <th key={c.name} className="py-1.5 px-3 whitespace-nowrap">
                              {c.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {currentTableObj.sample_rows.map((r, i) => (
                          <tr key={i} className="hover:bg-surface-100/30">
                            {currentTableObj.columns.map((c) => (
                              <td key={c.name} className="py-1.5 px-3 text-slate-300 whitespace-nowrap">
                                {String(r[c.name] ?? 'NULL')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
