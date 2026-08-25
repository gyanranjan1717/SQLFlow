import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Code, 
  Copy, 
  Check, 
  RotateCcw, 
  Sparkles, 
  AlertCircle,
  Terminal,
  RefreshCw
} from 'lucide-react';
import { formatSql } from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function SqlEditor({
  query,
  setQuery,
  onVisualize,
  loading,
  error,
  activeStepClause
}) {
  const [copied, setCopied] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const { resolvedTheme } = useTheme();

  // Keep references to avoid stale closures in Monaco keybindings
  const onVisualizeRef = useRef(onVisualize);
  onVisualizeRef.current = onVisualize;
  const queryRef = useRef(query);
  queryRef.current = query;

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Add keyboard shortcut: Ctrl+Enter to visualize current editor value
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      const currentVal = editor.getValue();
      onVisualizeRef.current(currentVal);
    });

    // Custom dark theme styling
    monaco.editor.defineTheme('sqlflow-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '38bdf8', fontStyle: 'bold' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'fbbf24' },
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'operator', foreground: 'f472b6' },
      ],
      colors: {
        'editor.background': '#0b0f1b',
        'editor.foreground': '#e2e8f0',
        'editor.lineHighlightBackground': '#161c3080',
        'editorCursor.foreground': '#38bdf8',
        'editorWhitespace.foreground': '#1e293b',
        'editorIndentGuide.background': '#1e2640',
        'editorIndentGuide.activeBackground': '#38bdf840',
        'editor.selectionBackground': '#38bdf830',
      }
    });

    // Custom light theme styling
    monaco.editor.defineTheme('sqlflow-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '0284c7', fontStyle: 'bold' },
        { token: 'string', foreground: '059669' },
        { token: 'number', foreground: 'd97706' },
        { token: 'comment', foreground: '94a3b8', fontStyle: 'italic' },
        { token: 'operator', foreground: 'db2777' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#0f172a',
        'editor.lineHighlightBackground': '#f1f5f9',
        'editorCursor.foreground': '#0284c7',
        'editorWhitespace.foreground': '#e2e8f0',
        'editorIndentGuide.background': '#e2e8f0',
        'editorIndentGuide.activeBackground': '#0284c740',
        'editor.selectionBackground': '#0284c720',
      }
    });

    monaco.editor.setTheme(resolvedTheme === 'light' ? 'sqlflow-light' : 'sqlflow-dark');
  };

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(resolvedTheme === 'light' ? 'sqlflow-light' : 'sqlflow-dark');
    }
  }, [resolvedTheme]);

  const handleCopy = () => {
    navigator.clipboard.writeText(query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormat = async () => {
    if (!query.trim() || formatting) return;
    setFormatting(true);
    try {
      const res = await formatSql(query);
      if (res.formatted_query) {
        setQuery(res.formatted_query);
      }
    } catch (err) {
      console.warn('Formatting fallback:', err);
    } finally {
      setFormatting(false);
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl glass-panel overflow-hidden border border-white/10 shadow-2xl">
      {/* Editor Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-200/80 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            SQL Query Input
          </span>
          <span className="text-[10px] text-cyan-300 font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 hidden sm:inline-block">
            Ctrl + Enter to Execute
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleFormat}
            disabled={formatting}
            className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg text-slate-300 hover:text-cyan-300 hover:bg-surface-100 transition-colors border border-white/5"
            title="Format and beautify SQL keywords and indentation"
          >
            {formatting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>Format SQL</span>
          </button>

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-surface-100 transition-colors"
            title="Copy Query"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Monaco Code Editor */}
      <div className="flex-1 min-h-[220px] relative">
        <Editor
          height="100%"
          language="sql"
          value={query}
          onChange={(val) => setQuery(val || '')}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 13,
            fontFamily: '"JetBrains Mono", monospace',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            padding: { top: 12, bottom: 12 },
            tabSize: 2,
            wordWrap: 'on',
            lineDecorationsWidth: 6,
            lineNumbersMinChars: 3,
            contextmenu: true,
            smoothScrolling: true,
          }}
          loading={
            <div className="flex items-center justify-center h-full text-xs text-slate-400">
              Loading Monaco SQL Editor...
            </div>
          }
        />
      </div>

      {/* Error Alert Bar if SQL parse error occurs */}
      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-rose-500/10 border-t border-rose-500/20 text-rose-300 text-xs animate-slide-up">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block text-rose-200">Execution / Syntax Error</span>
            <p className="text-[11px] text-rose-300/90 font-mono mt-0.5 whitespace-pre-wrap">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
