import React, { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from './components/Navbar';
import SqlEditor from './components/SqlEditor';
import StepNavigator from './components/StepNavigator';
import StepVisualizer from './components/StepVisualizer';
import TableDisplay from './components/TableDisplay';
import GroupBreakdown from './components/GroupBreakdown';
import SchemaViewer from './components/SchemaViewer';
import DataUploader from './components/DataUploader';
import AdminDashboard from './components/AdminDashboard';
import DatasetManager from './components/DatasetManager';
import { fetchTables, fetchExamples, visualizeQuery, createManualTable } from './services/api';
import { getAllTablesFromIDB, cleanExpiredTables } from './services/indexedDb';
import { DEFAULT_PRESETS } from './sampleQueries';
import { 
  Sparkles, 
  Terminal, 
  Layers, 
  Database, 
  Code2, 
  HelpCircle,
  Zap,
  CheckCircle2,
  Clock,
  Check
} from 'lucide-react';

export default function App() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('employees');
  const [examples, setExamples] = useState(DEFAULT_PRESETS);
  const [query, setQuery] = useState(DEFAULT_PRESETS[0].query);
  const [loading, setLoading] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [error, setError] = useState(null);
  const [lastExecutedTime, setLastExecutedTime] = useState(null);
  
  // Execution Results
  const [visualization, setVisualization] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showFilteredRows, setShowFilteredRows] = useState(true);
  const [activeTab, setActiveTab] = useState('table'); // 'table' | 'groups'

  // Modals
  const [isSchemaOpen, setIsSchemaOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isDatasetsOpen, setIsDatasetsOpen] = useState(false);
  const [uploadInitialTab, setUploadInitialTab] = useState('file'); // 'file' | 'manual' | 'ocr'

  // Initial Load with 7-Day Auto-Cleanup and IndexedDB Rehydration
  useEffect(() => {
    const loadInitialData = async () => {
      // 1. Run 7-Day Auto-Cleanup for stale unpinned tables
      try {
        await cleanExpiredTables(7);
      } catch (e) {
        console.warn('Auto-cleanup check note:', e);
      }

      // 2. Rehydrate custom tables from IndexedDB into backend memory
      try {
        const idbTables = await getAllTablesFromIDB();
        if (idbTables && idbTables.length > 0) {
          for (const t of idbTables) {
            if (t.table_name && t.rows) {
              const cols = t.schema?.columns || Object.keys(t.rows[0] || {}).map(k => ({ name: k, type: 'VARCHAR' }));
              await createManualTable(t.table_name, cols, t.rows).catch(() => {});
            }
          }
        }
      } catch (e) {
        console.warn('IDB rehydration note:', e);
      }

      // 2. Fetch all tables from backend
      try {
        const fetchedTables = await fetchTables();
        if (fetchedTables && fetchedTables.length > 0) {
          setTables(fetchedTables);
        }
      } catch (err) {
        console.warn('Backend connection pending, using local fallbacks');
      }

      // 3. Fetch example queries
      try {
        const fetchedExamples = await fetchExamples();
        if (fetchedExamples && fetchedExamples.length > 0) {
          setExamples(fetchedExamples);
        }
      } catch (err) {
        // Fallback to DEFAULT_PRESETS
      }
    };
    loadInitialData();
  }, []);

  // Execute visualization
  const handleVisualize = useCallback(async (queryToRun = query, tableToUse = selectedTable) => {
    if (!queryToRun || !queryToRun.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await visualizeQuery(queryToRun, tableToUse);
      if (res.success) {
        setVisualization(res);
        setCurrentStepIndex(0);
        setError(null);
        setLastExecutedTime(res.execution_time_ms);
      } else {
        setError(res.error || 'Execution failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to connect to backend engine.');
    } finally {
      setLoading(false);
    }
  }, [query, selectedTable]);

  // Run on first load
  useEffect(() => {
    handleVisualize();
  }, []);

  // Auto-run with debounce when query changes if enabled
  const debounceTimer = useRef(null);
  useEffect(() => {
    if (!autoRun) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      handleVisualize(query, selectedTable);
    }, 600);
    return () => clearTimeout(debounceTimer.current);
  }, [query, autoRun, handleVisualize, selectedTable]);

  // Handle Example Query Selection
  const handleSelectExample = (exampleId) => {
    const ex = examples.find((e) => e.id === exampleId);
    if (ex) {
      setQuery(ex.query);
      if (ex.dataset) setSelectedTable(ex.dataset);
      handleVisualize(ex.query, ex.dataset || selectedTable);
    }
  };

  // Handle Dataset Change
  const handleSelectTable = (tableName) => {
    setSelectedTable(tableName);
    // Find query for this dataset if available
    const matchingEx = examples.find((e) => e.dataset === tableName);
    if (matchingEx) {
      setQuery(matchingEx.query);
      handleVisualize(matchingEx.query, tableName);
    } else {
      const defaultQ = `SELECT * FROM ${tableName} LIMIT 10;`;
      setQuery(defaultQ);
      handleVisualize(defaultQ, tableName);
    }
  };

  // Handle Column Insertion
  const handleInsertColumn = (colName) => {
    setQuery((prev) => `${prev} ${colName}`);
  };

  // Handle Custom Dataset Upload or Manual Creation
  const handleUploadSuccess = async (newTableName) => {
    try {
      const updatedTables = await fetchTables();
      setTables(updatedTables);
      setSelectedTable(newTableName);
      const defaultQ = `SELECT * FROM ${newTableName} LIMIT 10;`;
      setQuery(defaultQ);
      handleVisualize(defaultQ, newTableName);
    } catch (err) {
      console.error(err);
    }
  };

  const openUploadModal = (tab = 'file') => {
    setUploadInitialTab(tab);
    setIsUploadOpen(true);
  };

  const currentStep = visualization?.steps?.[currentStepIndex];

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        tables={tables}
        selectedTable={selectedTable}
        onSelectTable={handleSelectTable}
        examples={examples}
        onSelectExample={handleSelectExample}
        onVisualize={() => handleVisualize(query, selectedTable)}
        loading={loading}
        autoRun={autoRun}
        setAutoRun={setAutoRun}
        onOpenUpload={() => openUploadModal('file')}
        onOpenManualTable={() => openUploadModal('manual')}
        onOpenOcr={() => openUploadModal('ocr')}
        onOpenSchema={() => setIsSchemaOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenDatasets={() => setIsDatasetsOpen(true)}
        stepsCount={visualization?.steps?.length || 0}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto p-4 lg:p-6 space-y-6">
        {/* Top Split Area: SQL Editor + Table Schema Helper Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* SQL Editor (Left 5 cols on large screens) */}
          <div className="lg:col-span-5 h-[340px] flex flex-col">
            <SqlEditor
              query={query}
              setQuery={setQuery}
              onVisualize={(q) => handleVisualize(q || query, selectedTable)}
              loading={loading}
              error={error}
              activeStepClause={currentStep?.clause_sql}
            />
          </div>

          {/* Quick Context & Ast Execution Overview (Right 7 cols on large screens) */}
          <div className="lg:col-span-7 h-[340px] flex flex-col justify-between glass-panel rounded-2xl p-5 border border-white/10 shadow-2xl relative overflow-hidden">
            {/* Background Decorative Accent */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                    Execution Pipeline & AST Summary
                  </span>
                </div>
                {visualization && (
                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <Check className="w-3 h-3" />
                      {visualization.steps.length} Steps Ready
                    </span>
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {visualization.execution_time_ms}ms
                    </span>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                SQL is declarative, but the query engine executes clauses in an exact hierarchical
                sequence. Step through each phase below to see row filtering, bucket groupings, and
                aggregate calculations.
              </p>

              {/* AST Clause Chips */}
              {visualization?.ast_info && (
                <div className="flex flex-wrap gap-2 pt-1">
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-surface-100 text-xs border border-slate-200 dark:border-white/5">
                    <span className="text-slate-500">Source:</span>
                    <span className="text-cyan-600 dark:text-cyan-300 font-mono font-bold">
                      {visualization.ast_info.tables.join(', ') || selectedTable}
                    </span>
                  </div>
                  {visualization.ast_info.has_where && (
                    <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 text-xs font-semibold">
                      WHERE Active
                    </span>
                  )}
                  {visualization.ast_info.has_group_by && (
                    <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 text-xs font-semibold">
                      GROUP BY Active
                    </span>
                  )}
                  {visualization.ast_info.has_having && (
                    <span className="px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-500/20 text-xs font-semibold">
                      HAVING Active
                    </span>
                  )}
                  {visualization.ast_info.has_window && (
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 text-xs font-semibold">
                      Window OVER()
                    </span>
                  )}
                  {visualization.ast_info.has_order_by && (
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20 text-xs font-semibold">
                      ORDER BY Active
                    </span>
                  )}
                  {visualization.ast_info.has_limit && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/20 text-xs font-semibold">
                      LIMIT Slicing
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Quick Helper Tips */}
            <div className="relative z-10 grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/80 dark:border-white/5 text-[11px] font-medium">
              <div className="flex items-center gap-1.5 bg-emerald-50/80 dark:bg-surface-100/60 p-2 rounded-lg border border-emerald-200/60 dark:border-white/5 text-emerald-800 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                <span>Passing row</span>
              </div>
              <div className="flex items-center gap-1.5 bg-rose-50/80 dark:bg-surface-100/60 p-2 rounded-lg border border-rose-200/60 dark:border-white/5 text-rose-800 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />
                <span>Filtered row</span>
              </div>
              <div className="flex items-center gap-1.5 bg-purple-50/80 dark:bg-surface-100/60 p-2 rounded-lg border border-purple-200/60 dark:border-white/5 text-purple-800 dark:text-slate-300">
                <span className="w-2 h-2 rounded-full bg-purple-500 ring-2 ring-purple-500/20" />
                <span>Group bucket</span>
              </div>
            </div>
          </div>
        </div>

        {/* Step Scrubber & Interactive Navigator */}
        {visualization && (
          <div className="animate-slide-up">
            <StepNavigator
              steps={visualization.steps}
              currentStepIndex={currentStepIndex}
              onSelectStep={setCurrentStepIndex}
              loading={loading}
            />
          </div>
        )}

        {/* Active Step Details & Dataframe Visualizer */}
        {currentStep && (
          <div className="space-y-4 animate-slide-up">
            {/* Step Explanation Banner */}
            <StepVisualizer
              currentStep={currentStep}
              showFilteredRows={showFilteredRows}
              setShowFilteredRows={setShowFilteredRows}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />

            {/* Tab View: Interactive Table Display or Group Bucket Cards */}
            {activeTab === 'table' ? (
              <TableDisplay
                columns={currentStep.columns}
                rows={currentStep.rows}
                stepId={currentStep.step_id}
                showFilteredRows={showFilteredRows}
              />
            ) : (
              <GroupBreakdown groups={currentStep.groups} />
            )}
          </div>
        )}
      </main>

      {/* Table Schema Modal */}
      <SchemaViewer
        isOpen={isSchemaOpen}
        onClose={() => setIsSchemaOpen(false)}
        tables={tables}
        selectedTable={selectedTable}
        onSelectTable={setSelectedTable}
        onInsertColumn={handleInsertColumn}
      />

      {/* Unified Data Manager Modal (Files/Excel/DBs, Manual Grid, Image OCR) */}
      <DataUploader
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        onSetQuery={(q) => {
          setQuery(q);
          handleVisualize(q, selectedTable);
        }}
        initialTab={uploadInitialTab}
      />

      {/* Admin AI Control Center Modal */}
      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onSettingsUpdated={() => {
          // Trigger any status updates if needed
        }}
      />

      {/* Browser IndexedDB Datasets Manager (7-Day Auto-Cleanup & Pinning) */}
      <DatasetManager
        isOpen={isDatasetsOpen}
        onClose={() => setIsDatasetsOpen(false)}
        onDatasetsChanged={async () => {
          try {
            const updated = await fetchTables();
            if (updated && updated.length > 0) {
              setTables(updated);
            }
          } catch (e) {
            console.error(e);
          }
        }}
      />
    </div>
  );
}
