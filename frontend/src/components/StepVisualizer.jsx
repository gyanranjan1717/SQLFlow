import React from 'react';
import { 
  Sparkles, 
  HelpCircle, 
  Table2, 
  Boxes, 
  Layers, 
  Info, 
  CheckCircle2, 
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { STEP_CONFIGS } from '../sampleQueries';

export default function StepVisualizer({
  currentStep,
  showFilteredRows,
  setShowFilteredRows,
  activeTab,
  setActiveTab
}) {
  if (!currentStep) return null;

  const config = STEP_CONFIGS[currentStep.step_id] || {};
  const stats = currentStep.stats || { total_rows: 0, active_rows: 0, passed_rows: 0, filtered_rows: 0 };
  const hasGroups = currentStep.groups && currentStep.groups.length > 0;

  return (
    <div className="space-y-3">
      {/* Top Banner: Active Step Title, Clause Badge & Action Controls */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 shadow-xl space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-extrabold px-3 py-1 rounded-full border shadow-sm ${config.badgeClass || 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'}`}>
                Step {currentStep.step_number}: {currentStep.clause_name}
              </span>
              {!currentStep.is_active_in_query && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5">
                  Implicit / Pass-Through
                </span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
              {currentStep.title}
            </h3>
          </div>

          {/* Row Stats Metrics */}
          <div className="flex flex-wrap items-center gap-2 bg-surface-200/90 rounded-xl p-2 border border-white/5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-100 text-xs">
              <span className="text-slate-400 text-[11px]">Total:</span>
              <span className="font-bold text-slate-200">{stats.total_rows}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-[11px]">Active:</span>
              <span className="font-bold">{stats.active_rows}</span>
            </div>
            {stats.filtered_rows > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs">
                <XCircle className="w-3.5 h-3.5" />
                <span className="text-[11px]">Filtered:</span>
                <span className="font-bold">{stats.filtered_rows}</span>
              </div>
            )}
            {stats.group_count > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs">
                <Boxes className="w-3.5 h-3.5" />
                <span className="text-[11px]">Groups:</span>
                <span className="font-bold">{stats.group_count}</span>
              </div>
            )}
          </div>
        </div>

        {/* Natural Language Explanation */}
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-100/70 dark:bg-surface-100/50 p-3.5 rounded-xl border border-slate-200/80 dark:border-white/5 font-medium">
          {currentStep.description}
        </p>

        {/* Clause SQL Snippet */}
        <div className="flex items-center gap-2 font-mono text-xs bg-slate-900 dark:bg-[#090d16] px-3.5 py-2.5 rounded-xl border border-slate-800 dark:border-white/5 text-cyan-300 shadow-sm overflow-x-auto">
          <span className="text-cyan-500 font-bold select-none">$</span>
          <span className="whitespace-nowrap font-semibold">{currentStep.clause_sql}</span>
        </div>

        {/* Concept Tip Box */}
        {currentStep.concept_tip && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-sky-50 dark:bg-blue-500/5 border border-sky-200/80 dark:border-blue-500/15 text-sky-900 dark:text-blue-300 text-xs">
            <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-sky-700 dark:text-cyan-200 block text-[11px] uppercase tracking-wider mb-0.5">
                Why SQL Executes Here:
              </span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{currentStep.concept_tip}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tab Switcher & Filter Visibility Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        {/* Visualizer Tabs */}
        <div className="flex items-center gap-1 bg-surface-100/80 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'table'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            <span>Dataframe View</span>
          </button>

          {hasGroups && (
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'groups'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Group Buckets ({currentStep.groups.length})</span>
            </button>
          )}
        </div>

        {/* Toggle Show Filtered Rows */}
        <button
          onClick={() => setShowFilteredRows(!showFilteredRows)}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
            showFilteredRows
              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
              : 'bg-surface-100 text-slate-400 hover:text-white border-white/5'
          }`}
        >
          {showFilteredRows ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{showFilteredRows ? 'Showing Filtered Rows' : 'Hide Filtered Rows'}</span>
        </button>
      </div>
    </div>
  );
}
