import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  Database, 
  Grid, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Sparkles, 
  Code,
  Scan,
  Edit3,
  Layers
} from 'lucide-react';
import { 
  uploadDatasets, 
  createManualTable, 
  extractTableFromImage, 
  extractQueryFromImage 
} from '../services/api';
import { saveTableToIDB } from '../services/indexedDb';

export default function DataUploader({
  isOpen,
  onClose,
  onUploadSuccess,
  onSetQuery,
  initialTab = 'file'
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'file' | 'manual' | 'ocr'

  // Tab 1: File & DB Upload state
  const [tableName, setTableName] = useState('');
  const [files, setFiles] = useState([]);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState(null);

  // Tab 2: Manual Table Grid state
  const [manualTableName, setManualTableName] = useState('custom_dataset');
  const [manualColumns, setManualColumns] = useState([
    { name: 'id', type: 'INTEGER' },
    { name: 'item_name', type: 'VARCHAR' },
    { name: 'category', type: 'VARCHAR' },
    { name: 'price', type: 'FLOAT' }
  ]);
  const [manualRows, setManualRows] = useState([
    { id: 1, item_name: 'Product Alpha', category: 'Tech', price: 99.99 },
    { id: 2, item_name: 'Product Beta', category: 'Office', price: 29.50 },
    { id: 3, item_name: 'Product Gamma', category: 'Tech', price: 149.00 }
  ]);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState(null);

  // Tab 3: Image OCR & Confirmation Grid state
  const [ocrMode, setOcrMode] = useState('table'); // 'table' | 'query'
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState(null);
  const [ocrResultTable, setOcrResultTable] = useState(null);
  const [ocrResultQuery, setOcrResultQuery] = useState(null);

  if (!isOpen) return null;

  // --------------------------------------------------------------------------
  // Tab 1: File & DB Upload Handler
  // --------------------------------------------------------------------------
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      setFileError('Please select at least one file to upload.');
      return;
    }
    setFileLoading(true);
    setFileError(null);

    try {
      const res = await uploadDatasets(files, tableName.trim() || null);
      if (res.success && res.tables_imported?.length > 0) {
        // Persist each imported table into IndexedDB
        for (const tbl of res.tables_imported) {
          try {
            await saveTableToIDB(
              tbl.table_name,
              tbl.schema,
              tbl.rows || [],
              files[0]?.name?.endsWith('.xlsx') ? 'excel' : (files[0]?.name?.endsWith('.db') ? 'sqlite' : 'csv')
            );
          } catch (e) {
            console.warn('IDB write note:', e);
          }
        }
        onUploadSuccess(res.primary_table);
        onClose();
      }
    } catch (err) {
      setFileError(err.message || 'Upload failed.');
    } finally {
      setFileLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Tab 2: Manual Table Grid Handlers
  // --------------------------------------------------------------------------
  const addColumn = () => {
    const newColName = `col_${manualColumns.length + 1}`;
    setManualColumns([...manualColumns, { name: newColName, type: 'VARCHAR' }]);
    setManualRows(manualRows.map(r => ({ ...r, [newColName]: '' })));
  };

  const removeColumn = (colIndex) => {
    if (manualColumns.length <= 1) return;
    const colToRemove = manualColumns[colIndex].name;
    setManualColumns(manualColumns.filter((_, idx) => idx !== colIndex));
    setManualRows(manualRows.map(r => {
      const newR = { ...r };
      delete newR[colToRemove];
      return newR;
    }));
  };

  const updateColumnName = (index, newName) => {
    const oldName = manualColumns[index].name;
    const updated = [...manualColumns];
    updated[index].name = newName;
    setManualColumns(updated);
    setManualRows(manualRows.map(r => {
      const newR = { ...r, [newName]: r[oldName] };
      if (oldName !== newName) delete newR[oldName];
      return newR;
    }));
  };

  const updateColumnType = (index, newType) => {
    const updated = [...manualColumns];
    updated[index].type = newType;
    setManualColumns(updated);
  };

  const addRow = () => {
    const newRow = {};
    manualColumns.forEach(c => {
      newRow[c.name] = c.type === 'INTEGER' ? manualRows.length + 1 : '';
    });
    setManualRows([...manualRows, newRow]);
  };

  const removeRow = (rowIndex) => {
    if (manualRows.length <= 1) return;
    setManualRows(manualRows.filter((_, idx) => idx !== rowIndex));
  };

  const updateCellValue = (rowIndex, colName, value) => {
    const updated = [...manualRows];
    updated[rowIndex][colName] = value;
    setManualRows(updated);
  };

  const handleManualTableSubmit = async (e) => {
    e.preventDefault();
    if (!manualTableName.trim()) {
      setManualError('Please provide a table name.');
      return;
    }
    setManualLoading(true);
    setManualError(null);

    try {
      const res = await createManualTable(manualTableName.trim(), manualColumns, manualRows);
      if (res.success) {
        // Save to IndexedDB
        await saveTableToIDB(
          res.table_name,
          res.schema,
          manualRows,
          'manual'
        );
        onUploadSuccess(res.table_name);
        onClose();
      }
    } catch (err) {
      setManualError(err.message || 'Failed to create table.');
    } finally {
      setManualLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Tab 3: OCR & Image Extraction Handlers
  // --------------------------------------------------------------------------
  const handleImageFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setImageFile(f);
      setImagePreviewUrl(URL.createObjectURL(f));
      setOcrResultTable(null);
      setOcrResultQuery(null);
      setOcrError(null);
    }
  };

  const handleOcrScan = async () => {
    if (!imageFile) {
      setOcrError('Please select an image file first.');
      return;
    }
    setOcrLoading(true);
    setOcrError(null);

    try {
      if (ocrMode === 'table') {
        const res = await extractTableFromImage(imageFile);
        if (res.success && res.data) {
          setOcrResultTable({
            table_name: res.data.table_name || 'scanned_table',
            columns: res.data.columns || [{ name: 'id', type: 'INTEGER' }, { name: 'name', type: 'VARCHAR' }],
            rows: res.data.rows || [{ id: 1, name: 'Sample' }]
          });
        }
      } else {
        const res = await extractQueryFromImage(imageFile);
        if (res.success && res.query) {
          setOcrResultQuery(res.query);
        }
      }
    } catch (err) {
      setOcrError(err.message || 'Failed to extract data from image.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleConfirmOcrTable = async () => {
    if (!ocrResultTable) return;
    setOcrLoading(true);
    try {
      const res = await createManualTable(
        ocrResultTable.table_name,
        ocrResultTable.columns,
        ocrResultTable.rows
      );
      if (res.success) {
        // Save to IndexedDB
        await saveTableToIDB(
          res.table_name,
          res.schema,
          ocrResultTable.rows,
          'ocr'
        );
        onUploadSuccess(res.table_name);
        onClose();
      }
    } catch (err) {
      setOcrError(err.message || 'Failed to save confirmed table.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleConfirmOcrQuery = () => {
    if (ocrResultQuery && onSetQuery) {
      onSetQuery(ocrResultQuery);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="glass-dropdown w-full max-w-4xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-surface-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-100">
                Data Manager & Table Creator
              </h3>
              <p className="text-xs text-slate-400">
                Import Excel/DBs, create spreadsheets manually, or scan notebook photos with AI
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

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-white/5 bg-surface-100/50 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('file')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all ${
              activeTab === 'file'
                ? 'border-cyan-400 text-cyan-300 bg-surface-200/90'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Files & Databases (.xlsx, .db, .sql, .csv)</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all ${
              activeTab === 'manual'
                ? 'border-purple-400 text-purple-300 bg-surface-200/90'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Manual Spreadsheet Grid</span>
          </button>

          <button
            onClick={() => setActiveTab('ocr')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition-all ${
              activeTab === 'ocr'
                ? 'border-emerald-400 text-emerald-300 bg-surface-200/90'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Scan from Image (AI / OCR)</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* ============================================================= */}
          {/* TAB 1: FILE & DATABASE IMPORT                                 */}
          {/* ============================================================= */}
          {activeTab === 'file' && (
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Primary Table Alias (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. sales_q1, customers"
                    value={tableName}
                    onChange={(e) => setTableName(e.target.value)}
                    className="w-full bg-surface-100 text-xs text-slate-100 px-3.5 py-2.5 rounded-xl border border-white/10 focus:border-cyan-500 focus:outline-none font-mono"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    Auto-names sheets in Excel or tables in SQLite files
                  </span>
                </div>

                <div className="bg-surface-100/50 p-3 rounded-xl border border-white/5 text-xs text-slate-300 space-y-1">
                  <span className="font-bold text-cyan-300 text-[11px] block uppercase tracking-wider">
                    Supported Multi-Table Formats:
                  </span>
                  <ul className="text-[11px] text-slate-400 space-y-0.5 list-disc list-inside">
                    <li><strong className="text-slate-200">Excel (.xlsx, .xls)</strong>: Ingests all sheets as separate tables</li>
                    <li><strong className="text-slate-200">SQLite (.db, .sqlite)</strong>: Reads full schema & tables</li>
                    <li><strong className="text-slate-200">SQL DDL (.sql)</strong>: Executes table creations</li>
                    <li><strong className="text-slate-200">CSV & JSON (.csv, .json)</strong></li>
                  </ul>
                </div>
              </div>

              {/* File Dropzone */}
              <div className="border-2 border-dashed border-white/15 hover:border-cyan-500/50 rounded-xl p-8 text-center cursor-pointer transition-colors bg-surface-100/30">
                <input
                  type="file"
                  multiple
                  accept=".csv, .json, .xlsx, .xls, .db, .sqlite, .sqlite3, .sql"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  className="hidden"
                  id="multi-file-upload"
                />
                <label htmlFor="multi-file-upload" className="cursor-pointer space-y-2 block">
                  <Upload className="w-10 h-10 text-cyan-400 mx-auto animate-pulse-subtle" />
                  <div className="text-xs text-slate-200 font-medium">
                    {files.length > 0 ? (
                      <div className="space-y-1">
                        <span className="text-cyan-300 font-mono font-bold block">
                          {files.length} file(s) selected:
                        </span>
                        <div className="flex flex-wrap justify-center gap-1">
                          {files.map((f, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-surface-200 text-slate-300">
                              {f.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span>Click or drag Excel workbooks, SQLite .db, SQL scripts, or CSVs</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">Supports single or multi-file uploads</p>
                </label>
              </div>

              {fileError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={fileLoading || files.length === 0}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                  fileLoading || files.length === 0
                    ? 'bg-surface-100 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25'
                }`}
              >
                {fileLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Parsing Tables & Schemas...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Upload & Load into Database</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ============================================================= */}
          {/* TAB 2: MANUAL TABLE SPREADSHEET GRID                          */}
          {/* ============================================================= */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualTableSubmit} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <label className="text-xs font-semibold text-slate-300 whitespace-nowrap">
                    Table Name:
                  </label>
                  <input
                    type="text"
                    value={manualTableName}
                    onChange={(e) => setManualTableName(e.target.value)}
                    className="bg-surface-100 text-xs font-mono text-cyan-300 px-3 py-1.5 rounded-lg border border-white/10 focus:border-purple-500 focus:outline-none w-full"
                    placeholder="e.g. students_marks"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={addColumn}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-50 text-slate-300 text-xs font-medium border border-white/10"
                  >
                    <Plus className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Add Column</span>
                  </button>
                  <button
                    type="button"
                    onClick={addRow}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-100 hover:bg-surface-50 text-slate-300 text-xs font-medium border border-white/10"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Add Row</span>
                  </button>
                </div>
              </div>

              {/* Editable Spreadsheet Grid Container */}
              <div className="rounded-xl border border-white/10 overflow-x-auto bg-[#090d16] max-h-72">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-surface-200 border-b border-white/10 text-slate-300">
                    <tr>
                      <th className="py-2 px-2 w-10 text-center font-bold text-[10px] text-slate-500">
                        #
                      </th>
                      {manualColumns.map((col, idx) => (
                        <th key={idx} className="py-2 px-3 min-w-[140px]">
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={col.name}
                              onChange={(e) => updateColumnName(idx, e.target.value)}
                              className="bg-surface-100 text-xs font-bold text-slate-100 px-2 py-1 rounded border border-white/10 w-full focus:border-cyan-400 focus:outline-none font-mono"
                            />
                            <div className="flex items-center justify-between gap-1">
                              <select
                                value={col.type}
                                onChange={(e) => updateColumnType(idx, e.target.value)}
                                className="bg-surface-300 text-[10px] text-cyan-300 px-1 py-0.5 rounded border border-white/5 focus:outline-none"
                              >
                                <option value="INTEGER">INTEGER</option>
                                <option value="FLOAT">FLOAT</option>
                                <option value="VARCHAR">VARCHAR</option>
                                <option value="BOOLEAN">BOOLEAN</option>
                              </select>
                              {manualColumns.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeColumn(idx)}
                                  className="text-slate-500 hover:text-rose-400 p-0.5"
                                  title="Delete Column"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </th>
                      ))}
                      <th className="py-2 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {manualRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-surface-100/40 transition-colors">
                        <td className="py-1.5 px-2 text-center text-slate-500 text-[10px]">
                          {rIdx + 1}
                        </td>
                        {manualColumns.map((col) => (
                          <td key={col.name} className="py-1 px-2">
                            <input
                              type="text"
                              value={row[col.name] !== undefined ? row[col.name] : ''}
                              onChange={(e) => updateCellValue(rIdx, col.name, e.target.value)}
                              placeholder="NULL"
                              className="w-full bg-surface-100/60 focus:bg-surface-100 text-slate-200 text-xs px-2 py-1 rounded border border-transparent focus:border-cyan-500/50 focus:outline-none transition-colors"
                            />
                          </td>
                        ))}
                        <td className="py-1.5 px-2 text-center">
                          {manualRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRow(rIdx)}
                              className="text-slate-600 hover:text-rose-400 p-1"
                              title="Delete Row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {manualError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{manualError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={manualLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
              >
                {manualLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Registering Dataset...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Table & Start Querying</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ============================================================= */}
          {/* TAB 3: IMAGE OCR & CONFIRMATION GRID                          */}
          {/* ============================================================= */}
          {activeTab === 'ocr' && (
            <div className="space-y-4">
              {/* Scan Mode Config */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-100/50 p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">Scan Target:</span>
                  <div className="flex items-center bg-surface-200 rounded-lg p-1 border border-white/5 text-xs">
                    <button
                      type="button"
                      onClick={() => setOcrMode('table')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        ocrMode === 'table'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Table Structure
                    </button>
                    <button
                      type="button"
                      onClick={() => setOcrMode('query')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        ocrMode === 'query'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      SQL Query Code
                    </button>
                  </div>
                </div>

                {/* AI Vision Status Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>AI Vision Engine Connected</span>
                </div>
              </div>

              {/* Upload Image Box */}
              {!ocrResultTable && !ocrResultQuery && (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-white/15 hover:border-emerald-500/50 rounded-xl p-8 text-center cursor-pointer transition-colors bg-surface-100/30">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                      id="image-ocr-upload"
                    />
                    <label htmlFor="image-ocr-upload" className="cursor-pointer space-y-2 block">
                      {imagePreviewUrl ? (
                        <div className="space-y-2">
                          <img
                            src={imagePreviewUrl}
                            alt="Uploaded preview"
                            className="max-h-40 mx-auto rounded-lg border border-white/10 shadow-lg"
                          />
                          <span className="text-emerald-300 text-xs font-mono font-semibold block">
                            {imageFile?.name} (Click to change)
                          </span>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="w-10 h-10 text-emerald-400 mx-auto animate-pulse-subtle" />
                          <div className="text-xs text-slate-200 font-medium">
                            Click or drop a photo of a table (notebook, whiteboard, or textbook)
                          </div>
                          <p className="text-[11px] text-slate-500">Supports JPG, PNG, WEBP, screenshots</p>
                        </>
                      )}
                    </label>
                  </div>

                  {ocrError && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{ocrError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleOcrScan}
                    disabled={!imageFile || ocrLoading}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                      !imageFile || ocrLoading
                        ? 'bg-surface-100 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/25'
                    }`}
                  >
                    {ocrLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Scanning & Extracting Structure...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Scan & Review Confirmation Grid</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* SIDE-BY-SIDE CONFIRMATION & EDIT GRID (TABLE MODE) */}
              {ocrResultTable && (
                <div className="space-y-4 animate-slide-up">
                  <div className="flex items-center justify-between bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-200">
                        Image Processed! Review & correct any OCR values below:
                      </span>
                    </div>
                    <button
                      onClick={() => setOcrResultTable(null)}
                      className="text-xs text-slate-400 hover:text-white underline"
                    >
                      Re-Scan Another Image
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Left: Original Image Preview */}
                    {imagePreviewUrl && (
                      <div className="lg:col-span-4 bg-surface-200 p-3 rounded-xl border border-white/5 space-y-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Original Photo / Screenshot
                        </span>
                        <div className="max-h-64 overflow-auto rounded-lg border border-white/10 bg-black/40">
                          <img
                            src={imagePreviewUrl}
                            alt="Original"
                            className="w-full h-auto object-contain"
                          />
                        </div>
                      </div>
                    )}

                    {/* Right: Confirmation & Correction Spreadsheet */}
                    <div className={`${imagePreviewUrl ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-3`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Extracted Name:</span>
                          <input
                            type="text"
                            value={ocrResultTable.table_name}
                            onChange={(e) => setOcrResultTable({ ...ocrResultTable, table_name: e.target.value })}
                            className="bg-surface-100 text-xs font-mono text-emerald-300 px-2 py-1 rounded border border-white/10"
                          />
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Click cells to fix OCR misreads
                        </span>
                      </div>

                      {/* Editable Grid */}
                      <div className="rounded-xl border border-white/10 overflow-x-auto bg-[#090d16] max-h-56">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead className="bg-surface-200 text-slate-300 border-b border-white/10">
                            <tr>
                              {ocrResultTable.columns.map((c, i) => (
                                <th key={i} className="py-1.5 px-2.5">
                                  <input
                                    type="text"
                                    value={c.name}
                                    onChange={(e) => {
                                      const updated = [...ocrResultTable.columns];
                                      updated[i].name = e.target.value;
                                      setOcrResultTable({ ...ocrResultTable, columns: updated });
                                    }}
                                    className="bg-surface-100 text-xs font-mono font-bold text-slate-100 px-1.5 py-0.5 rounded border border-white/10 w-full"
                                  />
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 font-mono">
                            {ocrResultTable.rows.map((r, rIdx) => (
                              <tr key={rIdx} className="hover:bg-surface-100/40">
                                {ocrResultTable.columns.map((c) => (
                                  <td key={c.name} className="py-1 px-1.5">
                                    <input
                                      type="text"
                                      value={r[c.name] ?? ''}
                                      onChange={(e) => {
                                        const updatedRows = [...ocrResultTable.rows];
                                        updatedRows[rIdx][c.name] = e.target.value;
                                        setOcrResultTable({ ...ocrResultTable, rows: updatedRows });
                                      }}
                                      className="w-full bg-surface-100/50 text-slate-200 text-xs px-2 py-1 rounded border border-transparent focus:border-emerald-400 focus:outline-none"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirmOcrTable}
                        disabled={ocrLoading}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm & Load into Database</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* CONFIRMATION FOR SQL QUERY MODE */}
              {ocrResultQuery && (
                <div className="space-y-3 animate-slide-up">
                  <div className="bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/20 text-xs text-cyan-200">
                    Extracted SQL Query from image. Review or edit before sending to editor:
                  </div>
                  <textarea
                    rows={6}
                    value={ocrResultQuery}
                    onChange={(e) => setOcrResultQuery(e.target.value)}
                    className="w-full bg-[#090d16] font-mono text-xs text-cyan-300 p-3 rounded-xl border border-white/10 focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleConfirmOcrQuery}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
                  >
                    <Code className="w-4 h-4" />
                    <span>Insert Query into Monaco Editor</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
