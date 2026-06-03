"use client";

import { Loader2, AlertTriangle } from "lucide-react";

interface Props {
  progress: number;
  status: string;
  generatedChars: number;
  estimatedChars: number;
  startedAt: number;
}

export default function CourseForgeProgress({
  progress,
  status,
  generatedChars,
  estimatedChars,
  startedAt,
}: Props) {
  const elapsedMs =
    startedAt > 0
      ? Date.now() - startedAt
      : 0;

  const elapsedMinutes =
    Math.floor(elapsedMs / 60000);

  const elapsedSeconds =
    Math.floor((elapsedMs % 60000) / 1000);

  // =====================================================
  // DYNAMIC ETA
  // =====================================================

  const safeEstimatedChars =
    Math.max(
      generatedChars * 1.5,
      estimatedChars,
    );

  const charsPerSecond =
    elapsedMs > 0
      ? generatedChars /
        (elapsedMs / 1000)
      : 0;

  const remainingChars =
    Math.max(
      safeEstimatedChars -
        generatedChars,
      0,
    );

  const etaSecondsRaw =
    charsPerSecond > 0
      ? remainingChars /
        charsPerSecond
      : 0;

  const etaMinutes =
    Math.floor(
      etaSecondsRaw / 60,
    );

  const etaSeconds =
    Math.floor(
      etaSecondsRaw % 60,
    );

  // =====================================================
  // STAGES
  // =====================================================

  let stage = "Initializing";
  let stageIndex = 1;

  if (progress >= 25) {
    stage = "Analyzing Profile";
    stageIndex = 1;
  }

  if (progress >= 40) {
    stage = "Building Curriculum";
    stageIndex = 2;
  }

  if (progress >= 85) {
    stage = "Parsing Course";
    stageIndex = 3;
  }

  if (progress >= 92) {
    stage = "Saving Course";
    stageIndex = 4;
  }

  if (progress >= 100) {
    stage = "Complete";
    stageIndex = 4;
  }

  return (
    <div className="space-y-6 p-8 bg-slate-900/50 rounded-2xl border border-slate-800 animate-in fade-in zoom-in duration-500">

      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] text-slate-500 font-black uppercase">
            Stage {stageIndex}/4
          </p>

          <h3 className="text-cyan-400 font-black tracking-wider uppercase text-sm">
            {stage}
          </h3>

          <p className="text-[10px] text-slate-500 mt-1">
            {status}
          </p>
        </div>

        <span className="text-3xl font-black text-slate-600 tabular-nums">
          {Math.floor(progress)}%
        </span>
      </div>

      <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
        <div
          className="h-full bg-linear-to-r from-cyan-600 via-blue-500 to-purple-600 rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">

        <div className="p-3 rounded border border-slate-800 bg-slate-950/50">
          <p className="text-slate-500 uppercase mb-1">
            Elapsed
          </p>

          <p className="font-black text-slate-200 tabular-nums">
            {elapsedMinutes}m {elapsedSeconds}s
          </p>
        </div>

        <div className="p-3 rounded border border-slate-800 bg-slate-950/50">
          <p className="text-slate-500 uppercase mb-1">
            Estimated Left
          </p>

          <p className="font-black text-cyan-400 tabular-nums">
            {generatedChars > 50
              ? `${etaMinutes}m ${etaSeconds}s`
              : "--"}
          </p>
        </div>

      </div>

      <div className="p-3 rounded border border-slate-800 bg-slate-950/50">
        <p className="text-slate-500 text-[10px] uppercase mb-2">
          Generation Progress
        </p>

        <p className="font-black text-slate-200 text-sm tabular-nums">
          {generatedChars.toLocaleString()} chars
        </p>

        <p className="text-[10px] text-slate-500 mt-1">
          {Math.round(charsPerSecond)} chars/sec
        </p>
      </div>

      <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded">
        <AlertTriangle
          size={16}
          className="text-amber-400 shrink-0 mt-0.5"
        />

        <div>
          <p className="text-[10px] text-amber-300 font-black uppercase">
            Important
          </p>

          <p className="text-[10px] text-slate-400 leading-relaxed uppercase">
            Local generation speed depends mostly on model size,
            quantization, WebGPU support and browser performance.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-cyan-400 text-xs uppercase">
        <Loader2
          size={14}
          className="animate-spin"
        />

        Neural Forge Active
      </div>
    </div>
  );
}