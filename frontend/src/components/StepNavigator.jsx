import React, { useEffect, useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw,
  Database,
  Filter,
  Boxes,
  Calculator,
  FilterX,
  Layers,
  Columns,
  CopyCheck,
  ArrowUpDown,
  Scissors,
  CheckCircle2,
  MinusCircle
} from 'lucide-react';
import { STEP_CONFIGS } from '../sampleQueries';

const ICONS = {
  from_join: Database,
  where: Filter,
  group_by: Boxes,
  aggregates: Calculator,
  having: FilterX,
  windows: Layers,
  select: Columns,
  distinct: CopyCheck,
  order_by: ArrowUpDown,
  limit: Scissors,
};

export default function StepNavigator({
  steps,
  currentStepIndex,
  onSelectStep,
  loading
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1.5); // seconds per step

  // Playback loop
  useEffect(() => {
    let interval = null;
    if (isPlaying && steps && steps.length > 0) {
      interval = setInterval(() => {
        onSelectStep((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playSpeed * 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, steps, playSpeed, onSelectStep]);

  if (!steps || steps.length === 0) return null;

  const currentStep = steps[currentStepIndex] || steps[0];

  const handlePrev = () => {
    setIsPlaying(false);
    onSelectStep((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setIsPlaying(false);
    onSelectStep((prev) => Math.min(steps.length - 1, prev + 1));
  };

  const handleReset = () => {
    setIsPlaying(false);
    onSelectStep(0);
  };

  const togglePlay = () => {
    if (currentStepIndex >= steps.length - 1) {
      onSelectStep(0);
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="w-full glass-panel rounded-2xl p-4 sm:p-5 border border-white/10 shadow-2xl space-y-4">
      {/* Header & Playback Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold text-xs">
            {currentStepIndex + 1}/{steps.length}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Logical Pipeline Navigator</span>
              <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                Internal Processing Order
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Scrub back and forth to inspect intermediate states
            </p>
          </div>
        </div>

        {/* Playback Button Group */}
        <div className="flex items-center gap-2">
          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-surface-100/90 rounded-lg p-1 border border-white/5 text-[11px] text-slate-300">
            {[
              { label: '0.7s', val: 0.7 },
              { label: '1.5s', val: 1.5 },
              { label: '3.0s', val: 3.0 }
            ].map((s) => (
              <button
                key={s.val}
                onClick={() => setPlaySpeed(s.val)}
                className={`px-2 py-0.5 rounded font-medium transition-all ${
                  playSpeed === s.val
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-surface-100/90 rounded-lg p-1 border border-white/5">
            <button
              onClick={handleReset}
              className="p-1.5 rounded-md hover:bg-surface-50 text-slate-400 hover:text-white transition-colors"
              title="Reset to Step 1"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className={`p-1.5 rounded-md transition-colors ${
                currentStepIndex === 0
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'hover:bg-surface-50 text-slate-300 hover:text-white'
              }`}
              title="Previous Step"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={togglePlay}
              className="px-3 py-1.5 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
              title={isPlaying ? 'Pause Playback' : 'Autoplay Execution'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            <button
              onClick={handleNext}
              disabled={currentStepIndex === steps.length - 1}
              className={`p-1.5 rounded-md transition-colors ${
                currentStepIndex === steps.length - 1
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'hover:bg-surface-50 text-slate-300 hover:text-white'
              }`}
              title="Next Step"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 10 Step Interactive Nodes Pipeline */}
      <div className="relative pt-2 pb-1 overflow-x-auto">
        <div className="flex items-center min-w-[760px] justify-between relative px-2">
          {/* Background Connecting Line */}
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-200 dark:bg-surface-50 -translate-y-1/2 z-0" />
          {/* Active Progress Fill Line */}
          <div 
            className="absolute top-1/2 left-4 h-0.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-500 -translate-y-1/2 z-0 transition-all duration-300"
            style={{
              width: `${(currentStepIndex / (steps.length - 1)) * 95}%`
            }}
          />

          {steps.map((step, idx) => {
            const isCurrent = idx === currentStepIndex;
            const isPassed = idx < currentStepIndex;
            const StepIcon = ICONS[step.step_id] || Database;
            const isActiveInQuery = step.is_active_in_query;

            return (
              <button
                key={step.step_id}
                onClick={() => {
                  setIsPlaying(false);
                  onSelectStep(idx);
                }}
                className={`relative z-10 flex flex-col items-center group transition-all cursor-pointer select-none`}
              >
                {/* Node Circle */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isCurrent
                      ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white ring-4 ring-cyan-500/20 scale-110 shadow-lg shadow-cyan-500/40'
                      : isPassed
                      ? 'bg-cyan-50 dark:bg-surface-100 text-cyan-600 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/30 hover:border-cyan-500 shadow-sm'
                      : isActiveInQuery
                      ? 'bg-white dark:bg-surface-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-cyan-400 shadow-sm'
                      : 'bg-slate-100 dark:bg-surface-300/80 text-slate-400 dark:text-slate-500 border border-slate-200/80 dark:border-white/5 hover:border-slate-300'
                  }`}
                >
                  <StepIcon className="w-4 h-4" />
                </div>

                {/* Step Label */}
                <div className="text-center mt-2">
                  <span
                    className={`text-[11px] font-bold block transition-colors leading-tight ${
                      isCurrent
                        ? 'text-cyan-600 dark:text-cyan-300'
                        : isPassed
                        ? 'text-slate-800 dark:text-slate-300'
                        : isActiveInQuery
                        ? 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'
                        : 'text-slate-400 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400'
                    }`}
                  >
                    {step.clause_name}
                  </span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block">
                    Step {step.step_number}
                    {!isActiveInQuery && ' (pass)'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
