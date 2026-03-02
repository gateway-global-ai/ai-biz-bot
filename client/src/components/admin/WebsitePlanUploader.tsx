/**
 * WebsitePlanUploader.tsx
 * Intelligence Ingestion Module — Jason Standard
 * Paste or drop a ChatGPT "Website Plan" and the system parses it into
 * Sovereign Intelligence that powers the AI Voice Concierge.
 */
import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Sparkles, CheckCircle, AlertCircle, FileText, Wrench, X } from 'lucide-react';

type Stage = 'idle' | 'processing' | 'success' | 'error';

interface ParsedSummary {
  businessName: string;
  sovereignTruthsCount: number;
  toolsIdentified: string[];
  operationalKeys: string[];
}

interface WebsitePlanUploaderProps {
  /** Direct siteConfig UUID (used from MyAccount dashboard) */
  siteConfigId?: string;
  /** Platform UUID from platform_business_map (alternative) */
  platformId?: string;
  onSuccess?: (summary: ParsedSummary) => void;
}

const containerVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const successVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  exit:   { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

export default function WebsitePlanUploader({ siteConfigId, platformId, onSuccess }: WebsitePlanUploaderProps) {
  const [stage, setStage]       = useState<Stage>('idle');
  const [planText, setPlanText] = useState('');
  const [summary, setSummary]   = useState<ParsedSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setPlanText((e.target?.result as string) ?? '');
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md'))) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleIngest = async () => {
    if (!planText.trim() || planText.trim().length < 50) return;
    setStage('processing');
    setErrorMsg('');

    try {
      const res = await fetch('/api/ingest-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ siteConfigId, platformId, planText }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Ingestion failed');

      setSummary(json.summary);
      setStage('success');
      onSuccess?.(json.summary);

    } catch (err: any) {
      setErrorMsg(err.message ?? 'Something went wrong. Please try again.');
      setStage('error');
    }
  };

  const reset = () => {
    setStage('idle');
    setPlanText('');
    setSummary(null);
    setErrorMsg('');
  };

  const charCount = planText.length;
  const isReady   = charCount >= 50 && charCount <= 50_000 && stage === 'idle';

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="sovereign-glass rounded-[24px] p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/25">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base tracking-tight">Intelligence Ingestion</h3>
            <p className="text-slate-400 text-xs mt-0.5">Upload a ChatGPT Website Plan to power the Sovereign AI</p>
          </div>
        </div>
        {stage !== 'idle' && (
          <button onClick={reset} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">

        {/* ── IDLE / INPUT ─────────────────────────────────────────────────── */}
        {(stage === 'idle' || stage === 'error') && (
          <motion.div key="idle" variants={successVariants} initial="hidden" animate="visible" exit="exit" className="space-y-4">

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={[
                'flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200',
                isDragOver
                  ? 'border-indigo-500/60 bg-indigo-500/8'
                  : 'border-white/10 bg-white/2 hover:border-indigo-500/35 hover:bg-indigo-500/5',
              ].join(' ')}
            >
              <Upload className="w-5 h-5 text-slate-500" />
              <p className="text-slate-400 text-xs text-center">
                Drop a <span className="text-indigo-400">.txt</span> or{' '}
                <span className="text-indigo-400">.md</span> file, or{' '}
                <span className="text-indigo-300 underline">click to browse</span>
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,text/plain"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>

            {/* Text area */}
            <div className="relative">
              <textarea
                value={planText}
                onChange={(e) => setPlanText(e.target.value)}
                placeholder={'Paste your ChatGPT "Website Plan" here…\n\nTip: Include business laws, fee structures, contact numbers, and required lookup tools for maximum Sovereign Intelligence.'}
                className="w-full h-52 bg-white/3 border border-white/8 rounded-2xl p-4 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/40 focus:bg-indigo-500/4 resize-none transition-all duration-200 font-mono leading-relaxed"
              />
              <span className={[
                'absolute bottom-3 right-3 text-xs font-mono transition-colors',
                charCount > 50_000 ? 'text-rose-400' : charCount > 40_000 ? 'text-amber-400' : 'text-slate-600',
              ].join(' ')}>
                {charCount.toLocaleString()} / 50,000
              </span>
            </div>

            {/* Error banner */}
            {stage === 'error' && (
              <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* Ingest button */}
            <button
              onClick={handleIngest}
              disabled={!isReady}
              className={[
                'w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-white transition-all duration-200',
                isReady
                  ? 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 cursor-pointer'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed',
              ].join(' ')}
            >
              <Sparkles className="w-4 h-4" />
              Ingest Intelligence Plan
            </button>
          </motion.div>
        )}

        {/* ── PROCESSING ───────────────────────────────────────────────────── */}
        {stage === 'processing' && (
          <motion.div key="processing" variants={successVariants} initial="hidden" animate="visible" exit="exit"
            className="flex flex-col items-center gap-5 py-8"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-[24px] bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center animate-sovereign-pulse">
                <Sparkles className="w-7 h-7 text-indigo-400" />
              </div>
              <div className="absolute inset-0 rounded-[24px] border border-indigo-500/40 animate-ping opacity-30" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-white font-bold">Extracting Sovereign Intelligence…</p>
              <p className="text-slate-400 text-sm">Gemini is parsing your plan into the 1% Knowledge Library</p>
            </div>
            <div className="w-full max-w-xs h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full animate-[pulse_1.5s_ease-in-out_infinite] w-3/4" />
            </div>
          </motion.div>
        )}

        {/* ── SUCCESS ──────────────────────────────────────────────────────── */}
        {stage === 'success' && summary && (
          <motion.div key="success" variants={successVariants} initial="hidden" animate="visible" exit="exit"
            className="space-y-4"
          >
            {/* Business Identity card */}
            <div className="flex items-center gap-3 p-4 bg-emerald-500/8 border border-emerald-500/20 rounded-2xl">
              <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">{summary.businessName}</p>
                <p className="text-emerald-400 text-xs mt-0.5">Sovereign Identity Locked In</p>
              </div>
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-white/3 border border-white/8 rounded-2xl text-center">
                <p className="text-white font-bold text-2xl">{summary.sovereignTruthsCount}</p>
                <p className="text-slate-400 text-xs mt-0.5">Sovereign Truths</p>
              </div>
              <div className="p-3.5 bg-white/3 border border-white/8 rounded-2xl text-center">
                <p className="text-white font-bold text-2xl">{summary.toolsIdentified.length}</p>
                <p className="text-slate-400 text-xs mt-0.5">Live Tools</p>
              </div>
            </div>

            {/* Tools identified */}
            {summary.toolsIdentified.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <Wrench className="w-3.5 h-3.5" />
                  Tools Activated
                </div>
                <div className="flex flex-wrap gap-2">
                  {summary.toolsIdentified.map((tool) => (
                    <span key={tool} className="data-chip text-indigo-300 border-indigo-500/20">
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Operational data keys */}
            {summary.operationalKeys.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5" />
                  Operational Data
                </div>
                <div className="flex flex-wrap gap-2">
                  {summary.operationalKeys.map((key) => (
                    <span key={key} className="data-chip text-slate-300 border-white/10">
                      {key}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={reset}
              className="w-full py-3 rounded-xl border border-indigo-500/25 text-indigo-300 text-sm font-semibold hover:bg-indigo-500/8 transition-all duration-200"
            >
              Ingest Another Plan
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
}
