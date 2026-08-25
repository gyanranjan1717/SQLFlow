import React from 'react';
import { 
  Database, 
  Play, 
  Sparkles, 
  Upload, 
  Code2, 
  ChevronDown, 
  RefreshCw, 
  Zap,
  BookOpen,
  Grid,
  Scan,
  CheckCircle2,
  Shield,
  HardDrive,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({
  tables,
  selectedTable,
  onSelectTable,
  examples,
  onSelectExample,
  onVisualize,
  loading,
  autoRun,
  setAutoRun,
  onOpenUpload,
  onOpenManualTable,
  onOpenOcr,
  onOpenSchema,
  onOpenAdmin,
  onOpenDatasets,
  stepsCount
}) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0b0f1b]/85 backdrop-blur-xl px-4 lg:px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3 max-w-[1920px] mx-auto">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 text-white font-bold">
            <Database className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-800 to-cyan-600 dark:from-white dark:via-slate-200 dark:to-cyan-400">
                SQLFlow
              </h1>
              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                Execution Visualizer
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Deconstruct SQL into 10 Logical Processing Steps
            </p>
          </div>
        </div>

        {/* Controls: Datasets, Presets, and Tools */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Dataset Selector */}
          <div className="relative">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
              Active Dataset
            </label>
            <div className="relative flex items-center">
              <select
                value={selectedTable}
                onChange={(e) => onSelectTable(e.target.value)}
                className="appearance-none bg-surface-100/90 text-slate-200 text-xs font-medium pl-8 pr-8 py-2 rounded-lg border border-white/10 hover:border-cyan-500/40 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer shadow-inner"
              >
                {tables.map((t) => (
                  <option key={t.table_name} value={t.table_name} className="bg-surface-200 text-slate-100">
                    {t.table_name} ({t.row_count} rows)
                  </option>
                ))}
              </select>
              <Database className="w-3.5 h-3.5 text-cyan-400 absolute left-2.5 pointer-events-none" />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Example Queries Dropdown */}
          <div className="relative">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
              Example Queries
            </label>
            <div className="relative flex items-center">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    onSelectExample(e.target.value);
                    e.target.value = "";
                  }
                }}
                defaultValue=""
                className="appearance-none bg-surface-100/90 text-slate-200 text-xs font-medium pl-8 pr-8 py-2 rounded-lg border border-white/10 hover:border-purple-500/40 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all cursor-pointer shadow-inner"
              >
                <option value="" disabled className="bg-surface-200 text-slate-400">
                  Select Example Query...
                </option>
                {examples.map((ex) => (
                  <option key={ex.id} value={ex.id} className="bg-surface-200 text-slate-100">
                    [{ex.level}] {ex.title}
                  </option>
                ))}
              </select>
              <BookOpen className="w-3.5 h-3.5 text-purple-400 absolute left-2.5 pointer-events-none" />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Import / Upload Files & DBs */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 mt-4 sm:mt-0 rounded-lg bg-surface-100/80 hover:bg-surface-50 text-slate-300 hover:text-white border border-white/10 hover:border-cyan-500/30 transition-all"
            title="Upload Excel, SQLite .db, SQL DDL, or CSV"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import DB / Excel</span>
          </button>

          {/* Manual Table Grid */}
          <button
            onClick={onOpenManualTable}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 mt-4 sm:mt-0 rounded-lg bg-surface-100/80 hover:bg-surface-50 text-slate-300 hover:text-white border border-white/10 hover:border-purple-500/30 transition-all"
            title="Create table manually via spreadsheet grid"
          >
            <Grid className="w-3.5 h-3.5 text-purple-400" />
            <span>Manual Table</span>
          </button>

          {/* Scan Image (AI / OCR) */}
          <button
            onClick={onOpenOcr}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 mt-4 sm:mt-0 rounded-lg bg-surface-100/80 hover:bg-surface-50 text-slate-300 hover:text-white border border-white/10 hover:border-emerald-500/30 transition-all"
            title="Scan table or SQL query from notebook photo / image"
          >
            <Scan className="w-3.5 h-3.5 text-emerald-400" />
            <span>Scan Image</span>
          </button>

          {/* Schema Inspector */}
          <button
            onClick={onOpenSchema}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 mt-4 sm:mt-0 rounded-lg bg-surface-100/80 hover:bg-surface-50 text-slate-300 hover:text-white border border-white/10 hover:border-white/20 transition-all"
            title="Inspect Table Schema & Columns"
          >
            <Code2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Schema</span>
          </button>

          {/* Datasets / IndexedDB Storage */}
          <button
            onClick={onOpenDatasets}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 mt-4 sm:mt-0 rounded-lg bg-surface-100/80 hover:bg-surface-50 text-slate-300 hover:text-white border border-white/10 hover:border-cyan-500/30 transition-all"
            title="Manage Saved Datasets in IndexedDB (7-Day Expiry & Pinning)"
          >
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Storage</span>
          </button>

          {/* Admin Panel Button */}
          <button
            onClick={onOpenAdmin}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-2 mt-4 sm:mt-0 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:border-purple-400 transition-all shadow-sm"
            title="Admin AI Models & OCR Settings"
          >
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">Admin</span>
          </button>

          {/* Theme Switcher: Light / Dark / System */}
          <div className="flex items-center p-0.5 rounded-lg bg-surface-100/90 border border-white/10 mt-4 sm:mt-0 shadow-inner">
            <button
              onClick={() => setTheme('light')}
              className={`p-1.5 rounded-md text-xs transition-all ${
                theme === 'light'
                  ? 'bg-amber-400 text-slate-900 shadow-sm font-bold'
                  : 'text-text-muted hover:text-white'
              }`}
              title="Light Mode"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-1.5 rounded-md text-xs transition-all ${
                theme === 'dark'
                  ? 'bg-cyan-500 text-slate-900 shadow-sm font-bold'
                  : 'text-text-muted hover:text-white'
              }`}
              title="Dark Mode"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`p-1.5 rounded-md text-xs transition-all ${
                theme === 'system'
                  ? 'bg-purple-500 text-white shadow-sm font-bold'
                  : 'text-text-muted hover:text-white'
              }`}
              title={`System Mode (${resolvedTheme === 'dark' ? 'Dark' : 'Light'})`}
            >
              <Laptop className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Auto-run Toggle */}
          <label className="flex items-center gap-2 cursor-pointer mt-4 sm:mt-0 px-2.5 py-2 rounded-lg bg-surface-100/50 border border-white/5 text-xs text-slate-300 select-none hover:bg-surface-100 transition-all">
            <input
              type="checkbox"
              checked={autoRun}
              onChange={(e) => setAutoRun(e.target.checked)}
              className="rounded bg-surface-300 border-white/20 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-[11px] font-medium">Auto-Run</span>
          </label>

          {/* Visualize CTA */}
          <button
            onClick={onVisualize}
            disabled={loading}
            className={`flex items-center gap-2 font-bold text-xs px-4 py-2 mt-4 sm:mt-0 rounded-lg transition-all shadow-lg select-none ${
              loading
                ? 'bg-cyan-600/50 text-cyan-200 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-95'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                <span>Visualize</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
