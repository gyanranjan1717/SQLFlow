import React, { useState } from 'react';
import { 
  Boxes, 
  ChevronDown, 
  ChevronRight, 
  Calculator, 
  CheckCircle2, 
  XCircle,
  Tag
} from 'lucide-react';

export default function GroupBreakdown({ groups }) {
  const [expandedGroups, setExpandedGroups] = useState({});

  if (!groups || groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 glass-panel rounded-2xl border border-white/5">
        <Boxes className="w-10 h-10 text-slate-600 mb-2" />
        <p className="text-sm font-semibold">No GROUP BY buckets in this step.</p>
        <p className="text-xs text-slate-500 mt-1">
          GROUP BY collapses rows with matching keys into discrete summary partitions.
        </p>
      </div>
    );
  }

  const toggleExpand = (groupId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Boxes className="w-4 h-4 text-purple-400" />
          <h4 className="text-sm font-bold text-slate-200">
            GROUP BY Summary Buckets ({groups.length})
          </h4>
        </div>
        <span className="text-xs text-slate-400">
          Click cards to expand nested raw records
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((g) => {
          const isExpanded = !!expandedGroups[g.group_id];
          const isPassed = g.status === 'passed';
          const aggregates = g.aggregates || {};
          const aggKeys = Object.keys(aggregates);

          return (
            <div
              key={g.group_id}
              className={`glass-card rounded-2xl border transition-all duration-200 overflow-hidden shadow-lg ${
                isPassed
                  ? 'border-purple-500/30 hover:border-purple-500/50'
                  : 'border-rose-500/30 opacity-75'
              }`}
            >
              {/* Group Card Header */}
              <div
                onClick={() => toggleExpand(g.group_id)}
                className="p-4 cursor-pointer hover:bg-surface-100/60 transition-colors flex items-start justify-between gap-3 border-b border-white/5"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Bucket #{g.group_id}
                    </span>
                    {isPassed ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Passed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3" /> Filtered by HAVING
                      </span>
                    )}
                  </div>
                  <h5 className="font-extrabold text-slate-100 text-sm flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-purple-400" />
                    <span>{g.group_key}</span>
                  </h5>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-1 rounded-lg bg-surface-100 text-slate-300 border border-white/5">
                    {g.row_count} {g.row_count === 1 ? 'row' : 'rows'}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Computed Aggregates Section */}
              {aggKeys.length > 0 && (
                <div className="p-3 bg-surface-200/50 space-y-2 border-b border-white/5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                    <Calculator className="w-3 h-3 text-pink-400" />
                    <span>Computed Aggregates:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {aggKeys.map((k) => (
                      <div
                        key={k}
                        className="bg-surface-100/80 p-2 rounded-lg border border-white/5 text-xs font-mono"
                      >
                        <span className="text-[10px] text-slate-400 block truncate">{k}</span>
                        <span className="font-bold text-cyan-300 text-sm">
                          {aggregates[k] !== null ? aggregates[k] : 'NULL'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Nested Raw Records when expanded */}
              {isExpanded && (
                <div className="p-3 bg-[#0b0f1b] max-h-48 overflow-y-auto font-mono text-[11px] divide-y divide-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2 font-sans">
                    Underlying Group Records:
                  </span>
                  {g.rows.map((r, idx) => (
                    <div key={idx} className="py-1.5 flex flex-wrap items-center gap-2 text-slate-300">
                      <span className="text-slate-500 text-[10px]">#{r.__row_id || idx + 1}</span>
                      {Object.entries(r)
                        .filter(([k]) => !k.startsWith('__'))
                        .slice(0, 4)
                        .map(([k, v]) => (
                          <span key={k} className="bg-surface-100 px-1.5 py-0.5 rounded text-[10px]">
                            <span className="text-slate-500">{k}:</span> {String(v)}
                          </span>
                        ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
