/**
 * DashboardCard Component
 *
 * Owner-facing business intelligence dashboard displaying SWOT analysis,
 * executive summary, and interactive tour preview.
 *
 * Spec: client/src/components/chat/gemini_2_5_flash_react_instructions/tour_guide/business_intelligence_suite.md
 */

import React, { useState, useEffect } from 'react';
import { Play, Map as MapIcon, Monitor, TrendingUp, AlertCircle, Lightbulb, ShieldAlert, Save, Globe } from 'lucide-react';
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
  placeId?: string; // Required for saving public amenities
}

interface SwotSection {
  title: string;
  items: string[];
  icon: React.ReactNode;
  colorClass: string;
}

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

  // Load existing public amenities on mount
  useEffect(() => {
    if (placeId) {
      fetch(`/api/business/${placeId}/owner-data`)
        .then((res) => res.json())
        .then((ownerData) => {
          if (ownerData.publicAmenities && Array.isArray(ownerData.publicAmenities)) {
            setPublicAmenitySet(new Set(ownerData.publicAmenities));
          }
        })
        .catch((err) => console.error('[DashboardCard] Failed to load owner data:', err));
    }
  }, [placeId]);

  const handleToggleAmenity = (amenity: string) => {
    setPublicAmenitySet((prev) => {
      const next = new Set(prev);
      if (next.has(amenity)) {
        next.delete(amenity);
      } else {
        next.add(amenity);
      }
      return next;
    });
  };

  const handleSavePublicAmenities = async () => {
    if (!placeId) {
      console.error('[DashboardCard] placeId required to save public amenities');
      return;
    }

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const response = await fetch(`/api/business/${placeId}/owner-data`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicAmenities: Array.from(publicAmenitySet),
        }),
      });

      if (response.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('[DashboardCard] Failed to save public amenities:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerSpeech = (text: string) => {
    if (onTriggerSpeech) {
      onTriggerSpeech(text);
    } else {
      console.log('[DashboardCard] AI Narrating:', text);
      // Fallback: could emit an event or use a global voice client
    }
  };

  const sections: SwotSection[] = [
    {
      title: 'Strengths',
      items: data.owner_insights.strengths,
      icon: <TrendingUp size={18} />,
      colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
    },
    {
      title: 'Weaknesses',
      items: data.owner_insights.blind_spots,
      icon: <AlertCircle size={18} />,
      colorClass: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
    },
    {
      title: 'Opportunities',
      items: data.owner_insights.action_plan,
      icon: <Lightbulb size={18} />,
      colorClass: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
    },
    {
      title: 'Threats',
      items: ['Market Volatility', 'New Local Competitor'], // Could be dynamic from data
      icon: <ShieldAlert size={18} />,
      colorClass: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800',
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto p-4 space-y-6">
      {/* Desktop Recommendation Banner (Mobile Only) */}
      <div className="md:hidden flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400">
        <Monitor size={16} />
        <span>
          For detailed reporting and deeper insights, we recommend using a <b>Desktop display</b>.
        </span>
      </div>

      {/* Interactive Tour Preview Banner */}
      {(tourSpec || tourYamlUrl) && (
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 dark:bg-slate-950 text-white p-8 shadow-2xl border border-slate-800">
          <div className="relative z-10 space-y-4 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-widest">
              <MapIcon size={14} />
              Experience Preview
            </div>
            <h2 className="text-3xl font-bold">Your Cinematic Concierge Tour</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              See exactly how our AI presents your business to travelers. This tour demonstrates
              the 3D touchdown and local narration hooks generated from your reviews.
            </p>

            <button
              onClick={() => setIsTourActive(true)}
              disabled={isTourActive}
              className="flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-full font-bold hover:bg-blue-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play size={18} fill="currentColor" />
              {isTourActive ? 'Tour in Progress...' : 'Start Interactive Tour'}
            </button>
          </div>

          {/* Decorative background visual */}
          <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-blue-600/20 to-transparent pointer-events-none" />
        </div>
      )}

      {/* Executive Summary Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
        <h2 className="text-2xl font-bold mb-2">Executive Brand Soul</h2>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          {data.executive_summary}
        </p>
      </div>

      {/* Share with Public - Amenities Toggle */}
      {placeId && data.amenity_list && data.amenity_list.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Globe size={20} className="text-blue-500" />
              <h2 className="text-xl font-bold">Share with Public</h2>
            </div>
            <button
              onClick={handleSavePublicAmenities}
              disabled={isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isSaving
                  ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
                  : saveStatus === 'success'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  : saveStatus === 'error'
                  ? 'bg-rose-500 hover:bg-rose-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save'}
            </button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Select which amenities you want to display on your public traveler-facing card:
          </p>
          <div className="space-y-2">
            {data.amenity_list.map((amenity) => (
              <label
                key={amenity}
                className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={publicAmenitySet.has(amenity)}
                  onChange={() => handleToggleAmenity(amenity)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">{amenity}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* SWOT Matrix (Responsive Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => (
          <div
            key={section.title}
            className={`p-5 rounded-xl border ${section.colorClass} transition-all hover:shadow-md`}
          >
            <div className="flex items-center gap-2 mb-3">
              {section.icon}
              <h3 className="font-bold uppercase tracking-wider text-sm">{section.title}</h3>
            </div>
            <ul className="space-y-2">
              {section.items.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm leading-snug">
                  <span className="opacity-50">•</span> {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Tour Runner Logic (Hidden) */}
      {isTourActive && (tourSpec || tourYamlUrl) && (
        <TourRunner
          tourSpec={tourSpec}
          yamlUrl={tourYamlUrl}
          onTriggerSpeech={handleTriggerSpeech}
          onTourComplete={() => setIsTourActive(false)}
        />
      )}
    </div>
  );
};
