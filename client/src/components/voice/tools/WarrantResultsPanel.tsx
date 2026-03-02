import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, PhoneCall, Shield, Clock, FileText } from 'lucide-react';

interface WarrantEntry {
  name: string;
  charge: string;
  issueDate: string | null;
  warrantNumber: string;
  status: string;
}

interface SovereignOverlay {
  disclaimer: string;
  actionPlan: string;
  agencyContact: string;
  businessName?: string;
  ownerName?: string;
}

export interface WarrantResultsData {
  success: boolean;
  searchTerms: { first: string; last: string };
  matchCount: number;
  warrants: WarrantEntry[];
  sovereignOverlay: SovereignOverlay;
  error?: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.08, duration: 0.3, ease: 'easeOut' },
  }),
};

function WarrantCard({ warrant, index }: { warrant: WarrantEntry; index: number }) {
  const date = warrant.issueDate ? new Date(warrant.issueDate).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }) : 'Date unknown';

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl space-y-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span className="text-white font-semibold text-sm leading-snug">{warrant.charge}</span>
        </div>
        <span className="shrink-0 text-rose-400 text-xs font-bold px-2 py-0.5 bg-rose-500/15 border border-rose-500/25 rounded-full">
          {warrant.status}
        </span>
      </div>
      <div className="flex items-center gap-4 pl-6">
        <span className="flex items-center gap-1 text-slate-400 text-xs">
          <Clock className="w-3 h-3" />
          {date}
        </span>
        <span className="flex items-center gap-1 text-slate-500 text-xs font-mono">
          <FileText className="w-3 h-3" />
          {warrant.warrantNumber}
        </span>
      </div>
    </motion.div>
  );
}

export default function WarrantResultsPanel({ data }: { data: WarrantResultsData }) {
  const hasWarrants = data.success && data.matchCount > 0;
  const isError     = !data.success;
  const overlay     = data.sovereignOverlay;
  const callerName  = overlay.ownerName ?? 'our specialist';
  const bizName     = overlay.businessName ?? 'AAA Bail Services';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={[
        'relative rounded-[24px] overflow-hidden backdrop-blur-xl border shadow-2xl',
        hasWarrants
          ? 'bg-slate-900/85 border-rose-500/30'
          : isError
          ? 'bg-slate-900/70 border-amber-500/25'
          : 'bg-slate-900/70 border-emerald-500/25',
      ].join(' ')}
    >
      {/* Ambient background glow */}
      <div
        className={[
          'absolute -top-12 -right-12 w-48 h-48 rounded-full blur-[80px] opacity-20 pointer-events-none',
          hasWarrants ? 'bg-rose-600 animate-pulse' : isError ? 'bg-amber-500' : 'bg-emerald-500',
        ].join(' ')}
      />

      <div className="relative p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          {hasWarrants ? (
            <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/25">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>
          ) : isError ? (
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/25">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
          )}
          <div>
            <h2 className="text-white text-xl font-bold tracking-tight">
              {hasWarrants
                ? `${data.matchCount} Active Warrant${data.matchCount > 1 ? 's' : ''} Found`
                : isError
                ? 'Database Unavailable'
                : 'No Active Warrants'}
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">
              Search:{' '}
              <span className="font-mono text-white text-xs px-1.5 py-0.5 bg-white/5 rounded">
                {data.searchTerms.first} {data.searchTerms.last}
              </span>
            </p>
          </div>
        </div>

        {/* Warrant cards */}
        <AnimatePresence>
          {hasWarrants && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              {data.warrants.map((w, i) => (
                <WarrantCard key={i} warrant={w} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sovereign Fixer CTA */}
        <div
          className={[
            'p-5 rounded-2xl border space-y-4',
            hasWarrants
              ? 'bg-rose-500/8 border-rose-500/20'
              : isError
              ? 'bg-amber-500/8 border-amber-500/20'
              : 'bg-white/3 border-white/8',
          ].join(' ')}
        >
          <p className="text-slate-200 text-sm leading-relaxed">
            <strong className="text-white">Action Plan: </strong>
            {overlay.actionPlan}
          </p>

          <a
            href={`tel:${overlay.agencyContact}`}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-bold text-white transition-all duration-200 bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35"
          >
            <PhoneCall className="w-5 h-5" />
            Call {callerName} at {bizName}
          </a>

          {overlay.agencyContact && (
            <p className="text-center text-slate-500 text-xs font-mono">
              {overlay.agencyContact}
            </p>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-slate-600 text-xs text-center leading-relaxed">
          {overlay.disclaimer}
        </p>
      </div>
    </motion.div>
  );
}
