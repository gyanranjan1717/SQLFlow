import React, { useState } from 'react';
import { 
  Check, 
  X, 
  AlertCircle, 
  Search, 
  Layers, 
  Tag, 
  Scissors,
  HelpCircle
} from 'lucide-react';

export default function TableDisplay({
  columns,
  rows,
  stepId,
  showFilteredRows
}) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!columns || columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 glass-panel rounded-2xl border border-white/5">
        <p className="text-sm">No tabular data available for this step.</p>
      </div>
    );
  }

  // Filter rows based on search and showFilteredRows setting
  const visibleRows = rows.filter((r) => {
    const status = r.__status || 'active';
    if (!showFilteredRows && (status === 'filtered' || status === 'duplicate' || status === 'truncated')) {
      return false;
    }
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return columns.some((col) => {
      const val = r[col];
      return val !== null && val !== undefined && String(val).toLowerCase().includes(term);
    });
  });

  return (
    <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col">
      {/* Table Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-200/90 border-b border-white/5 gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300">
            Records: <span className="text-cyan-400 font-bold">{visibleRows.length}</span> of {rows.length}
          </span>
        </div>

        {/* Quick Search */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search records in this step..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-surface-100/90 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-lg border border-white/10 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-48 sm:w-64 transition-all"
          />
        </div>
      </div>

      {/* Interactive Table Container */}
      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-[#0e1322] border-b border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-md">
            <tr>
              {/* Row Index / Status Column */}
              <th className="py-3 px-3 w-14 text-center font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                #
              </th>
              <th className="py-3 px-3 w-28 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                Status
              </th>

              {/* Data Columns */}
              {columns.map((col) => (
                <th
                  key={col}
                  className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px] whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col}</span>
                  </div>
                </th>
              ))}

              {/* Evaluation Explanation Column */}
              <th className="py-3 px-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                Step Evaluation / Note
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200/60 dark:divide-white/5 font-mono">
            {visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 3}
                  className="py-8 text-center text-slate-400 text-xs italic"
                >
                  No matching rows found.
                </td>
              </tr>
            ) : (
              visibleRows.map((row, idx) => {
                const status = row.__status || 'active';
                const evalText = row.__eval || row.__note || '';
                const groupId = row.__group_id;
                const groupColor = row.__group_color || '#38bdf8';
                const isFiltered = status === 'filtered';
                const isDuplicate = status === 'duplicate';
                const isTruncated = status === 'truncated';

                let rowClass = 'hover:bg-slate-50 dark:hover:bg-surface-100/40 transition-colors';
                if (status === 'passed') rowClass = 'table-row-passed';
                if (isFiltered) rowClass = 'table-row-filtered';
                if (isDuplicate) rowClass = 'table-row-duplicate';
                if (isTruncated) rowClass = 'table-row-truncated';

                return (
                  <tr
                    key={row.__row_id || idx}
                    className={`table-row-enter ${rowClass}`}
                    style={
                      groupColor && !isFiltered
                        ? {
                            backgroundColor: `${groupColor}12`,
                            borderLeft: `3px solid ${groupColor}`
                          }
                        : undefined
                    }
                  >
                    {/* Row Index */}
                    <td className="py-2.5 px-3 text-center text-slate-500 text-[11px]">
                      {row.__row_id || idx + 1}
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {status === 'passed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <Check className="w-3 h-3" />
                          Passed
                        </span>
                      )}
                      {status === 'filtered' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          <X className="w-3 h-3" />
                          Filtered
                        </span>
                      )}
                      {status === 'duplicate' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          <AlertCircle className="w-3 h-3" />
                          Duplicate
                        </span>
                      )}
                      {status === 'truncated' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-300 border border-slate-500/30">
                          <Scissors className="w-3 h-3" />
                          Truncated
                        </span>
                      )}
                      {status === 'active' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          Active
                        </span>
                      )}
                    </td>

                    {/* Data Cells */}
                    {columns.map((col) => {
                      const val = row[col];
                      const isNull = val === null || val === undefined;

                      return (
                        <td
                          key={col}
                          className={`py-2.5 px-4 whitespace-nowrap ${
                            status === 'filtered' ? 'line-through text-slate-500' : 'text-slate-200'
                          }`}
                        >
                          {isNull ? (
                            <span className="text-slate-600 italic text-[11px]">NULL</span>
                          ) : typeof val === 'number' ? (
                            <span className="text-cyan-300 font-semibold">{val}</span>
                          ) : typeof val === 'boolean' ? (
                            <span className={val ? 'text-emerald-400' : 'text-rose-400'}>
                              {String(val)}
                            </span>
                          ) : (
                            <span>{String(val)}</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Step Evaluation Notes */}
                    <td className="py-2.5 px-4 text-xs font-sans">
                      <div className="flex items-center gap-2">
                        {groupId && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold"
                            style={{
                              backgroundColor: `${groupColor}20`,
                              borderColor: `${groupColor}50`,
                              color: groupColor,
                              borderWidth: '1px'
                            }}
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {row.__group_key || groupId}
                          </span>
                        )}
                        {evalText && (
                          <span className={`text-[11px] font-medium ${
                            status === 'filtered' ? 'text-rose-400' : 'text-slate-300'
                          }`}>
                            {evalText}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
