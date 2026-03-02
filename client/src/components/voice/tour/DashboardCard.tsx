/**
 * DashboardCard — Sovereign OS edition.
 * Owner-facing business intelligence dashboard: SWOT, executive summary, amenity toggles.
 * Jason Standard: glass panels, framer-motion, indigo accents, emerald verified badges.
 *
 * Spec: client/src/components/chat/gemini_2_5_flash_react_instructions/tour_guide/business_intelligence_suite.md
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Map as MapIcon, Monitor, TrendingUp, AlertCircle,
  Lightbulb, ShieldAlert, Save, Globe, Check,
} from 'lucide-react';
import { TourRunner, TourSpec } from './TourRunner';

export interface BusinessIntelligenceData {
  executive_summary: string;
  amenity_list: string[];
  cinematic_narrative: {
    take_off: string;
    cruise: string;
    landing: string;
  };
  owner_insights: {
    strengths: string[];
    blind_spots: string[];
    action_plan: string[];
  };
}

interface DashboardCardProps {
  data: BusinessIntelligenceData;
  tourSpec?: TourSpec;
  tourYamlUrl?: string;
  onTriggerSpeech?: (text: string) => void;
  placeId?: string;
}

interface SwotSection {
  title: string;
  items: string[];
  icon: React.ReactNode;
  glassClass: string;
  iconColor: string;
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

export const DashboardCard: React.FC<DashboardCardProps> = ({
  data,
  tourSpec,
  tourYamlUrl,
  onTriggerSpeech,
  placeId,
}) => {
  const [isTourActive, setIsTourActive] = useState(false);
  const [publicAmenitySet, setPublicAmenitySet] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (placeId) {
      fetch(`/api/business/${placeId}/owner-data`)
        .then((r) => r.json())
        .then((d) => {
          if (d.publicAmenities && Array.isArray(d.publicAmenities)) {
            setPublicAmenitySet(new Set(d.publicAmenities));
          }
        })
        .catch((err) => console.error('[DashboardCard] Failed to load owner data:', err));
    }
  }, [placeId]);

  const handleToggleAmenity = (amenity: string) => {
    setPublicAmenitySet((prev) => {
      const next = new Set(prev);
      if (next.has(amenity)) next.delete(amenity);
      else next.add(amenity);
      return next;
    });
  };

  const handleSavePublicAmenities = async () => {
    if (!placeId) return;
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const res = await fetch(`/api/business/${placeId}/owner-data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicAmenities: Array.from(publicAmenitySet) }),
      });
      if (res.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        throw new Error('Failed to save');
      }
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerSpeech = (text: string) => {
    if (onTriggerSpeech) onTriggerSpeech(text);
  };

  const sections: SwotSection[] = [
    {
      title: 'Strengths',
      items: data.owner_insights.strengths,
      icon: <TrendingUp size={16} />,
      glassClass: 'bg-emerald-950/40 border-emerald-500/20',
      iconColor: 'text-emerald-400',
    },
    {
      title: 'Blind Spots',
      items: data.owner_insights.blind_spots,
      icon: <AlertCircle size={16} />,
      glassClass: 'bg-amber-950/40 border-amber-500/20',
      iconColor: 'text-amber-400',
    },
    {
      title: 'Opportunities',
      items: data.owner_insights.action_plan,
      icon: <Lightbulb size={16} />,
      glassClass: 'bg-indigo-950/40 border-indigo-500/20',
      iconColor: 'text-indigo-400',
    },
    {
      title: 'Threats',
      items: ['Market Volatility', 'New Local Competitor'],
      icon: <ShieldAlert size={16} />,
      glassClass: 'bg-rose-950/40 border-rose-500/20',
      iconColor: 'text-rose-400',
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-5xl mx-auto p-4 space-y-5"
    >
      {/* Mobile advisory */}
      <motion.div
        variants={itemVariants}
        className="md:hidden flex items-center gap-3 p-3 rounded-[14px] bg-slate-800/40 border border-slate-700/30 text-xs text-slate-500"
      >
        <Monitor size={14} className="text-slate-500 shrink-0" />
        <span>For detailed reporting, use a <b className="text-slate-300">Desktop display</b>.</span>
      </motion.div>

      {/* Cinematic tour banner */}
      {(tourSpec || tourYamlUrl) && (
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-sui bg-slate-950 border border-indigo-500/20 shadow-2xl"
        >
          {/* Sovereign hero gradient */}
          <div className="absolute inset-0 bg-sovereign-hero pointer-events-none" />
          <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-indigo-600/15 to-transparent pointer-events-none" />

          <div className="relative z-10 p-8 space-y-4 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-widest">
              <MapIcon size={12} />
              Experience Preview
            </div>
            <h2 className="text-2xl font-bold text-white leading-tight">
              Your Cinematic Concierge Tour
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              See how our AI presents your business to travelers — 3D touchdown,
              local narration hooks, review-powered storytelling.
            </p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsTourActive(true)}
              disabled={isTourActive}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-[14px] font-semibold text-sm transition-colors shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={16} fill="currentColor" />
              {isTourActive ? 'Tour in Progress…' : 'Start Interactive Tour'}
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Executive Brand Soul */}
      <motion.div
        variants={itemVariants}
        className="rounded-sui bg-slate-900/50 backdrop-blur-xl border border-indigo-500/15 p-6 shadow-xl"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="badge-insight">Brand Soul</span>
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Executive Summary</h2>
        <p className="text-slate-300 leading-relaxed text-sm">{data.executive_summary}</p>
      </motion.div>

      {/* Amenity toggle panel */}
      {placeId && data.amenity_list?.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="rounded-sui bg-slate-900/50 backdrop-blur-xl border border-indigo-500/15 p-6 shadow-xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-indigo-400" />
              <h2 className="text-base font-bold text-white">Share with Public</h2>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleSavePublicAmenities}
              disabled={isSaving}
              className={[
                'flex items-center gap-2 px-4 py-2 rounded-[14px] text-sm font-semibold transition-all',
                isSaving
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : saveStatus === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : saveStatus === 'error'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20',
              ].join(' ')}
            >
              <Save size={14} />
              {isSaving ? 'Saving…' : saveStatus === 'success' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save'}
            </motion.button>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            Select amenities to display on your public traveler-facing card:
          </p>

          <div className="space-y-1.5">
            <AnimatePresence>
              {data.amenity_list.map((amenity) => (
                <motion.label
                  key={amenity}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={[
                    'flex items-center gap-3 p-3 rounded-[14px] border cursor-pointer transition-colors',
                    publicAmenitySet.has(amenity)
                      ? 'bg-indigo-950/40 border-indigo-500/30 text-slate-200'
                      : 'bg-slate-800/30 border-slate-700/30 text-slate-400 hover:border-indigo-500/20',
                  ].join(' ')}
                >
                  <div className={[
                    'w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0',
                    publicAmenitySet.has(amenity)
                      ? 'bg-indigo-600 border-indigo-500'
                      : 'bg-slate-800 border-slate-600',
                  ].join(' ')}>
                    {publicAmenitySet.has(amenity) && <Check size={10} className="text-white" />}
                    <input
                      type="checkbox"
                      checked={publicAmenitySet.has(amenity)}
                      onChange={() => handleToggleAmenity(amenity)}
                      className="sr-only"
                    />
                  </div>
                  <span className="text-sm">{amenity}</span>
                  {publicAmenitySet.has(amenity) && (
                    <span className="ml-auto badge-insight">Public</span>
                  )}
                </motion.label>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* SWOT Matrix */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sections.map((section, i) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.3, ease: 'easeOut' }}
            whileHover={{ scale: 1.02, y: -2, transition: { type: 'spring', stiffness: 300, damping: 22 } }}
            className={`p-5 rounded-sui border backdrop-blur-xl shadow-lg ${section.glassClass}`}
          >
            <div className={`flex items-center gap-2 mb-3 ${section.iconColor}`}>
              {section.icon}
              <h3 className="font-bold uppercase tracking-wider text-xs">{section.title}</h3>
            </div>
            <ul className="space-y-1.5">
              {section.items.map((item, j) => (
                <li key={j} className="flex gap-2 text-xs text-slate-300 leading-snug">
                  <span className={`${section.iconColor} opacity-60 mt-0.5`}>▸</span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </motion.div>

      {/* Tour runner */}
      {isTourActive && (tourSpec || tourYamlUrl) && (
        <TourRunner
          tourSpec={tourSpec}
          yamlUrl={tourYamlUrl}
          onTriggerSpeech={handleTriggerSpeech}
          onTourComplete={() => setIsTourActive(false)}
        />
      )}
    </motion.div>
  );
};
