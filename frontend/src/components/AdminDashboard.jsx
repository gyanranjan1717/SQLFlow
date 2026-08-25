import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Key, 
  Sparkles, 
  RefreshCw, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Sliders, 
  Cpu, 
  FileText, 
  Play, 
  ArrowLeft,
  Eye,
  EyeOff,
  Database,
  Image as ImageIcon,
  Zap,
  X
} from 'lucide-react';
import { 
  verifyAdminPin, 
  fetchAdminSettings, 
  updateAdminSettings, 
  fetchLiveModels,
  extractTableFromImage
} from '../services/api';

export default function AdminDashboard({
  isOpen,
  onClose,
  onSettingsUpdated
}) {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState(null);
  const [pinLoading, setPinLoading] = useState(false);

  // Settings & Models State
  const [settings, setSettings] = useState(null);
  const [liveModels, setLiveModels] = useState(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Form State
  const [activeProvider, setActiveProvider] = useState('gemini');
  const [geminiModel, setGeminiModel] = useState('gemini-1.5-flash');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [temperature, setTemperature] = useState(0.1);
  const [customTablePrompt, setCustomTablePrompt] = useState('');
  const [customQueryPrompt, setCustomQueryPrompt] = useState('');
  const [newPin, setNewPin] = useState('');
  const [modelSearch, setModelSearch] = useState('');

  // Playground Test State
  const [testImage, setTestImage] = useState(null);
  const [testPreview, setTestPreview] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);
  const [testLatency, setTestLatency] = useState(null);

  if (!isOpen) return null;

  // Handle PIN Unlock
  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!pinInput.trim()) {
      setPinError('Please enter the Admin PIN.');
      return;
    }
    setPinLoading(true);
    setPinError(null);

    try {
      const res = await verifyAdminPin(pinInput.trim());
      if (res.success) {
        setIsAuthenticated(true);
        loadAdminData();
      }
    } catch (err) {
      setPinError(err.message || 'Invalid PIN.');
    } finally {
      setPinLoading(false);
    }
  };

  // Load Admin Settings and Live Models
  const loadAdminData = async () => {
    setLoadingModels(true);
    try {
      const [settingsRes, modelsRes] = await Promise.all([
        fetchAdminSettings(),
        fetchLiveModels()
      ]);

      setSettings(settingsRes);
      setLiveModels(modelsRes);

      setActiveProvider(settingsRes.active_provider || 'gemini');
      setGeminiModel(settingsRes.gemini_model || 'gemini-1.5-flash');
      setOpenaiModel(settingsRes.openai_model || 'gpt-4o-mini');
      setTemperature(settingsRes.temperature ?? 0.1);
      setCustomTablePrompt(settingsRes.custom_table_prompt || '');
      setCustomQueryPrompt(settingsRes.custom_query_prompt || '');
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleRefreshModels = async () => {
    setLoadingModels(true);
    try {
      const res = await fetchLiveModels();
      setLiveModels(res);
    } catch (err) {
      console.error('Failed to refresh models:', err);
    } finally {
      setLoadingModels(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload = {
        active_provider: activeProvider,
        gemini_model: geminiModel,
        openai_model: openaiModel,
        temperature: parseFloat(temperature),
        custom_table_prompt: customTablePrompt,
        custom_query_prompt: customQueryPrompt,
        admin_pin: newPin.trim() || undefined
      };

      const res = await updateAdminSettings(payload);
      if (res.success) {
        setSaveSuccess(true);
        if (newPin.trim()) setNewPin('');
        if (onSettingsUpdated) onSettingsUpdated();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      setSaveError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Playground Test Run
  const handleTestImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTestImage(file);
      setTestPreview(URL.createObjectURL(file));
      setTestResult(null);
      setTestError(null);
    }
  };

  const handleRunPlayground = async () => {
    if (!testImage) return;
    setTestLoading(true);
    setTestError(null);
    setTestResult(null);
    const start = performance.now();

    try {
      const res = await extractTableFromImage(testImage);
      const elapsed = Math.round(performance.now() - start);
      setTestLatency(elapsed);
      setTestResult(res);
    } catch (err) {
      setTestError(err.message || 'Playground OCR test failed');
    } finally {
      setTestLoading(false);
    }
  };

  // Filtered model options
  const currentGeminiList = (liveModels?.gemini_models || []).filter(m => 
    !modelSearch.trim() || 
    m.id.toLowerCase().includes(modelSearch.toLowerCase()) || 
    m.name.toLowerCase().includes(modelSearch.toLowerCase())
  );

  const currentOpenaiList = (liveModels?.openai_models || []).filter(m => 
    !modelSearch.trim() || 
    m.id.toLowerCase().includes(modelSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div className="glass-dropdown w-full max-w-5xl rounded-3xl border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Admin Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0e1424]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-100 tracking-tight">
                  Admin AI Control Center
                </h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Security Guarded
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manage AI OCR providers, fetch live models from Google & OpenAI, and tune vision prompts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-surface-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PIN AUTHENTICATION GUARD MODAL */}
        {!isAuthenticated ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center space-y-6 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-surface-100 border border-white/10 flex items-center justify-center text-purple-400 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-extrabold text-slate-100">
                Enter Admin Access PIN
              </h4>
              <p className="text-xs text-slate-400">
                This panel manages sensitive AI model keys and parameters. Enter your PIN to continue (default: <span className="font-mono text-cyan-300">admin123</span>).
              </p>
            </div>

            <form onSubmit={handleUnlock} className="w-full space-y-4">
              <div className="relative flex items-center">
                <Key className="w-4 h-4 text-purple-400 absolute left-3.5 pointer-events-none" />
                <input
                  type={showPin ? 'text' : 'password'}
                  placeholder="Enter PIN..."
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  autoFocus
                  className="w-full bg-surface-100 text-center font-mono text-sm text-slate-100 pl-10 pr-10 py-3 rounded-xl border border-white/15 focus:border-purple-500 focus:outline-none tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 text-slate-400 hover:text-white"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {pinError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={pinLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {pinLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Unlock Admin Panel</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* AUTHENTICATED ADMIN DASHBOARD BODY */
          <div className="p-6 overflow-y-auto space-y-6">
            
            {/* Top API Keys Detection Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-card p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Google Gemini API Key
                  </span>
                  {settings?.api_keys_status?.gemini_set ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Authenticated
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                      Missing in .env
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs text-slate-400 bg-surface-100/60 px-3 py-1.5 rounded-lg border border-white/5 truncate">
                  {settings?.api_keys_status?.gemini_masked || 'Not Configured'}
                </div>
              </div>

              <div className="glass-card p-4 rounded-2xl border border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    OpenAI API Key
                  </span>
                  {settings?.api_keys_status?.openai_set ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Authenticated
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                      Missing in .env
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs text-slate-400 bg-surface-100/60 px-3 py-1.5 rounded-lg border border-white/5 truncate">
                  {settings?.api_keys_status?.openai_masked || 'Not Configured'}
                </div>
              </div>
            </div>

            {/* Provider Switcher */}
            <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    <span>Active AI Provider & Vision Model</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Select which AI engine handles Table OCR and SQL extraction
                  </p>
                </div>

                <button
                  onClick={handleRefreshModels}
                  disabled={loadingModels}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-surface-100 hover:bg-surface-50 text-cyan-300 border border-cyan-500/30 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingModels ? 'animate-spin' : ''}`} />
                  <span>Refresh Live Models from API</span>
                </button>
              </div>

              {/* Provider Selection Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveProvider('gemini')}
                  className={`p-4 rounded-xl border text-left transition-all relative ${
                    activeProvider === 'gemini'
                      ? 'bg-cyan-500/15 border-cyan-400/60 ring-2 ring-cyan-500/20 shadow-lg'
                      : 'bg-surface-100/60 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-sm text-cyan-300">Google Gemini</span>
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    High speed multi-modal (Gemini 1.5/2.0 Flash & Pro)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveProvider('openai')}
                  className={`p-4 rounded-xl border text-left transition-all relative ${
                    activeProvider === 'openai'
                      ? 'bg-emerald-500/15 border-emerald-400/60 ring-2 ring-emerald-500/20 shadow-lg'
                      : 'bg-surface-100/60 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-sm text-emerald-300">OpenAI GPT</span>
                    <Zap className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    GPT-4o and GPT-4o-mini multimodal reasoning
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveProvider('local')}
                  className={`p-4 rounded-xl border text-left transition-all relative ${
                    activeProvider === 'local'
                      ? 'bg-purple-500/15 border-purple-400/60 ring-2 ring-purple-500/20 shadow-lg'
                      : 'bg-surface-100/60 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-sm text-purple-300">Local Heuristic</span>
                    <Database className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Offline template without cloud API calls
                  </p>
                </button>
              </div>

              {/* Dynamic Live Model Dropdown */}
              {activeProvider === 'gemini' && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">
                      Select Gemini Model ({currentGeminiList.length} models available):
                    </label>
                    <input
                      type="text"
                      placeholder="Search models (e.g. flash, pro)..."
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      className="bg-surface-100 text-xs px-2.5 py-1 rounded-lg border border-white/10 text-slate-200 w-52 focus:outline-none"
                    />
                  </div>

                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full bg-surface-100 text-xs font-mono text-cyan-300 px-3.5 py-2.5 rounded-xl border border-white/15 focus:border-cyan-500 focus:outline-none"
                  >
                    {currentGeminiList.map((m) => (
                      <option key={m.id} value={m.id} className="bg-surface-200 text-slate-100">
                        {m.id} — {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeProvider === 'openai' && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">
                      Select OpenAI Model ({currentOpenaiList.length} models available):
                    </label>
                    <input
                      type="text"
                      placeholder="Search models (e.g. 4o, mini)..."
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      className="bg-surface-100 text-xs px-2.5 py-1 rounded-lg border border-white/10 text-slate-200 w-52 focus:outline-none"
                    />
                  </div>

                  <select
                    value={openaiModel}
                    onChange={(e) => setOpenaiModel(e.target.value)}
                    className="w-full bg-surface-100 text-xs font-mono text-emerald-300 px-3.5 py-2.5 rounded-xl border border-white/15 focus:border-emerald-500 focus:outline-none"
                  >
                    {currentOpenaiList.map((m) => (
                      <option key={m.id} value={m.id} className="bg-surface-200 text-slate-100">
                        {m.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Temperature & Prompt Configuration */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Sliders & PIN */}
              <div className="lg:col-span-5 space-y-4">
                {/* Temperature Slider */}
                <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Temperature:</span>
                    </label>
                    <span className="font-mono text-cyan-300 font-bold text-xs">
                      {temperature}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500">
                    Lower values (0.0 - 0.2) ensure strict, deterministic JSON parsing for OCR tables.
                  </p>
                </div>

                {/* Change Admin PIN */}
                <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-2">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-purple-400" />
                    <span>Change Admin PIN:</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new PIN to update..."
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full bg-surface-100 text-xs px-3 py-2 rounded-xl border border-white/10 text-slate-200 focus:border-purple-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* System Prompt Customizer */}
              <div className="lg:col-span-7 glass-panel p-4 rounded-2xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Custom OCR Table Prompt</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomTablePrompt(settings?.custom_table_prompt || '')}
                    className="text-[10px] text-slate-400 hover:text-white underline"
                  >
                    Reset
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={customTablePrompt}
                  onChange={(e) => setCustomTablePrompt(e.target.value)}
                  className="w-full bg-[#090d16] font-mono text-xs text-slate-300 p-3 rounded-xl border border-white/10 focus:border-cyan-500 focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-2">
              <div>
                {saveSuccess && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-300 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Settings Saved & Applied to Backend Runtime!
                  </span>
                )}
                {saveError && (
                  <span className="text-xs text-rose-300 font-bold bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20">
                    {saveError}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-500/30 flex items-center gap-2 active:scale-95 transition-all"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save & Apply Settings</span>
                  </>
                )}
              </button>
            </div>

            {/* LIVE OCR PLAYGROUND & DEBUGGER */}
            <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-100 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span>Live OCR Test Playground</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Test the active model ({activeProvider === 'gemini' ? geminiModel : openaiModel}) with a real image
                  </p>
                </div>

                {testLatency && (
                  <span className="text-xs font-mono text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                    Latency: {testLatency}ms
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-5 space-y-3">
                  <div className="border-2 border-dashed border-white/15 rounded-xl p-4 text-center cursor-pointer bg-surface-100/40">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleTestImageChange}
                      className="hidden"
                      id="playground-file"
                    />
                    <label htmlFor="playground-file" className="cursor-pointer space-y-1 block">
                      {testPreview ? (
                        <img
                          src={testPreview}
                          alt="Test preview"
                          className="max-h-32 mx-auto rounded border border-white/10"
                        />
                      ) : (
                        <div className="py-4 text-xs text-slate-300">
                          <ImageIcon className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                          <span>Click to load test image</span>
                        </div>
                      )}
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunPlayground}
                    disabled={!testImage || testLoading}
                    className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 ${
                      !testImage || testLoading
                        ? 'bg-surface-100 text-slate-500 cursor-not-allowed'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-md'
                    }`}
                  >
                    {testLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Extracting via {activeProvider}...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-black" />
                        <span>Run Test Extraction</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Raw JSON Debug Output */}
                <div className="lg:col-span-7 bg-[#080c16] p-3 rounded-xl border border-white/10 max-h-52 overflow-auto font-mono text-[11px] text-emerald-300">
                  {testResult ? (
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  ) : testError ? (
                    <span className="text-rose-400">{testError}</span>
                  ) : (
                    <span className="text-slate-600 italic">
                      Raw extracted JSON payload will appear here after test run...
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
