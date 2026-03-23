import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, Gift, Target, TrendingUp, CheckSquare,
  ChevronDown, ChevronRight, Sparkles, Loader2,
  Check, AlertCircle, RefreshCw, Copy, Lock, Rocket
} from 'lucide-react';

interface BrandGovernance {
  brandName?: string;
  brandSlogan?: string;
  brandLogoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  claim?: string;
  differentiator?: string;
  irresistibleOffer?: string;
  freeTrial?: { defined: boolean; description: string };
  guarantee?: { defined: boolean; description: string };
  targetMarket?: string;
  channelPartners?: string[];
  coreProducts?: string[];
  productUpsells?: string[];
  coreServices?: string[];
  serviceUpsells?: string[];
  completionScore?: number;
  ownerApproved?: boolean;
  approvedAt?: string;
  deepResearchPromptGenerated?: boolean;
  lastAutoPopulatedAt?: string;
}

interface Props {
  siteConfigId: string;
  plan?: string;
  voicePlanActive?: boolean;
}

const SECTIONS = [
  {
    id: 'brand_profile',
    label: 'Brand Profile',
    icon: Palette,
    description: 'Name, slogan, logo, and colors',
    fields: ['brandName', 'brandSlogan', 'brandLogoUrl', 'primaryColor', 'accentColor']
  },
  {
    id: 'offer_stack',
    label: 'Offer Stack',
    icon: Gift,
    description: 'Your irresistible offer, free trial, and guarantee',
    fields: ['irresistibleOffer', 'freeTrial', 'guarantee', 'claim', 'differentiator']
  },
  {
    id: 'market_strategy',
    label: 'Market Strategy',
    icon: Target,
    description: 'Target market and channel partners',
    fields: ['targetMarket', 'channelPartners']
  },
  {
    id: 'sales_funnels',
    label: 'Revenue',
    icon: TrendingUp,
    description: 'Core products, services, and upsells',
    fields: ['coreProducts', 'productUpsells', 'coreServices', 'serviceUpsells']
  },
  {
    id: 'preflight',
    label: 'Pre-Flight',
    icon: CheckSquare,
    description: 'Readiness check before going live',
    fields: []
  },
];

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-700">{label}</label>
      {multiline ? (
        <textarea
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-colors"
          rows={3}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          type="text"
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-colors"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function ToggleWithDescription({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: { defined: boolean; description: string };
  onChange: (v: { defined: boolean; description: string }) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700">{label}</label>
        <button
          type="button"
          onClick={() => onChange({ ...value, defined: !value.defined })}
          className={`relative w-9 h-5 rounded-full transition-colors ${value.defined ? 'bg-indigo-500' : 'bg-slate-200'}`}
        >
          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value.defined ? 'translate-x-4' : ''}`} />
        </button>
      </div>
      {value.defined && (
        <textarea
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-800 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-colors"
          rows={2}
          value={value.description}
          onChange={e => onChange({ ...value, description: e.target.value })}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function ArrayInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const trimmed = draft.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setDraft('');
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-700">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-colors"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder={placeholder}
        />
        <button type="button" onClick={add} className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-semibold">Add</button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 rounded-lg px-2 py-0.5">
              {item}
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-500">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function BrandGovernancePanel({ siteConfigId, plan, voicePlanActive }: Props) {
  const [brand, setBrand] = useState<BrandGovernance>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [autoPopulating, setAutoPopulating] = useState(false);
  const [deepResearchPrompt, setDeepResearchPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [preflightComplete, setPreflightComplete] = useState(false);
  const [openSection, setOpenSection] = useState<string>('brand_profile');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const isPaid = plan !== 'free' || voicePlanActive;

  useEffect(() => {
    fetch(`/api/site-configs/${siteConfigId}/brand`)
      .then(r => r.ok ? r.json() : { brand_governance: {}, preflightComplete: false })
      .then(data => {
        setBrand(data.brand_governance ?? {});
        setPreflightComplete(data.preflightComplete ?? false);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [siteConfigId]);

  const save = async (updates: Partial<BrandGovernance>) => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      const resp = await fetch(`/api/site-configs/${siteConfigId}/brand`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await resp.json();
      setBrand(data.brand_governance);
      setPreflightComplete(data.preflightComplete);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const autoPopulate = async () => {
    setAutoPopulating(true);
    try {
      const resp = await fetch(`/api/site-configs/${siteConfigId}/brand/generate`, { method: 'POST' });
      const data = await resp.json();
      if (data.brand_governance) {
        setBrand(data.brand_governance);
        setPreflightComplete(data.preflightComplete ?? false);
      }
    } catch {
      // silent
    } finally {
      setAutoPopulating(false);
    }
  };

  const generateDeepResearch = async () => {
    setGenerating(true);
    try {
      const resp = await fetch(`/api/site-configs/${siteConfigId}/brand/deep-research-prompt`, { method: 'POST' });
      const data = await resp.json();
      if (data.prompt) setDeepResearchPrompt(data.prompt);
    } catch {
      // silent
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = () => {
    save({ ...brand, ownerApproved: true });
  };

  const completionScore = brand.completionScore ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-indigo-500" />
          <div>
            <h2 className="text-sm font-bold text-slate-800">Brand Governance</h2>
            <p className="text-xs text-slate-500">Define your brand before deploying any agent</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={autoPopulate}
            disabled={autoPopulating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            {autoPopulating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Auto-Populate
          </button>
        </div>
      </div>

      {/* Completion Score Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">Brand Completion</span>
          <span className={`font-bold ${completionScore >= 80 ? 'text-emerald-600' : completionScore >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
            {completionScore}%
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionScore}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`h-full rounded-full ${completionScore >= 80 ? 'bg-emerald-500' : completionScore >= 40 ? 'bg-amber-500' : 'bg-red-400'}`}
          />
        </div>
        <p className="text-xs text-slate-500">
          {completionScore >= 80
            ? '✓ Ready for Pre-Flight approval'
            : completionScore >= 40
            ? `${Math.ceil((80 - completionScore) / 6.67)} more fields needed to unlock Pre-Flight`
            : 'Complete at least 12 of 15 fields to go live'}
        </p>
      </div>

      {/* Sections */}
      {SECTIONS.map(section => (
        <div key={section.id} className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenSection(openSection === section.id ? '' : section.id)}
            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <section.icon size={14} className="text-indigo-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800">{section.label}</p>
                <p className="text-xs text-slate-500">{section.description}</p>
              </div>
            </div>
            {openSection === section.id ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
          </button>

          <AnimatePresence initial={false}>
            {openSection === section.id && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-4 flex flex-col gap-4">
                  {/* Brand Profile */}
                  {section.id === 'brand_profile' && (
                    <>
                      <FieldInput label="Brand Name" value={brand.brandName ?? ''} onChange={v => setBrand(p => ({ ...p, brandName: v }))} placeholder="Gateway Global AI" />
                      <FieldInput label="Brand Slogan" value={brand.brandSlogan ?? ''} onChange={v => setBrand(p => ({ ...p, brandSlogan: v }))} placeholder="The AI OS for Business" />
                      <FieldInput label="Logo URL" value={brand.brandLogoUrl ?? ''} onChange={v => setBrand(p => ({ ...p, brandLogoUrl: v }))} placeholder="https://..." />
                      <div className="grid grid-cols-2 gap-3">
                        <FieldInput label="Primary Color" value={brand.primaryColor ?? ''} onChange={v => setBrand(p => ({ ...p, primaryColor: v }))} placeholder="#0f172a" />
                        <FieldInput label="Accent Color" value={brand.accentColor ?? ''} onChange={v => setBrand(p => ({ ...p, accentColor: v }))} placeholder="#008a3e" />
                      </div>
                    </>
                  )}

                  {/* Offer Stack */}
                  {section.id === 'offer_stack' && (
                    <>
                      <FieldInput label="Irresistible Offer" value={brand.irresistibleOffer ?? ''} onChange={v => setBrand(p => ({ ...p, irresistibleOffer: v }))} placeholder="First month free + AI setup included" multiline />
                      <FieldInput label="Claim" value={brand.claim ?? ''} onChange={v => setBrand(p => ({ ...p, claim: v }))} placeholder="The most trusted AI platform for local business" multiline />
                      <FieldInput label="Differentiator" value={brand.differentiator ?? ''} onChange={v => setBrand(p => ({ ...p, differentiator: v }))} placeholder="What makes you uniquely better?" multiline />
                      <ToggleWithDescription label="Free Trial" value={brand.freeTrial ?? { defined: false, description: '' }} onChange={v => setBrand(p => ({ ...p, freeTrial: v }))} placeholder="Describe the free trial offer..." />
                      <ToggleWithDescription label="Guarantee" value={brand.guarantee ?? { defined: false, description: '' }} onChange={v => setBrand(p => ({ ...p, guarantee: v }))} placeholder="Describe your satisfaction guarantee..." />
                    </>
                  )}

                  {/* Market Strategy */}
                  {section.id === 'market_strategy' && (
                    <>
                      <FieldInput label="Target Market" value={brand.targetMarket ?? ''} onChange={v => setBrand(p => ({ ...p, targetMarket: v }))} placeholder="Local business owners, 25-55, looking to automate customer interactions" multiline />
                      <ArrayInput label="Channel Partners" value={brand.channelPartners ?? []} onChange={v => setBrand(p => ({ ...p, channelPartners: v }))} placeholder="Add a partner name..." />
                    </>
                  )}

                  {/* Revenue */}
                  {section.id === 'sales_funnels' && (
                    <>
                      <ArrayInput label="Core Services" value={brand.coreServices ?? []} onChange={v => setBrand(p => ({ ...p, coreServices: v }))} placeholder="Add a service..." />
                      <ArrayInput label="Service Upsells" value={brand.serviceUpsells ?? []} onChange={v => setBrand(p => ({ ...p, serviceUpsells: v }))} placeholder="Add a service upsell..." />
                      <ArrayInput label="Core Products" value={brand.coreProducts ?? []} onChange={v => setBrand(p => ({ ...p, coreProducts: v }))} placeholder="Add a product..." />
                      <ArrayInput label="Product Upsells" value={brand.productUpsells ?? []} onChange={v => setBrand(p => ({ ...p, productUpsells: v }))} placeholder="Add a product upsell..." />
                    </>
                  )}

                  {/* Pre-Flight */}
                  {section.id === 'preflight' && (
                    <div className="flex flex-col gap-4">
                      {/* Checklist */}
                      <div className="flex flex-col gap-2">
                        {[
                          { label: 'Brand name defined', done: !!brand.brandName },
                          { label: 'Core services listed', done: (brand.coreServices?.length ?? 0) > 0 },
                          { label: 'Target market defined', done: !!brand.targetMarket },
                          { label: 'Irresistible offer defined', done: !!brand.irresistibleOffer },
                          { label: 'Completion score ≥ 80%', done: completionScore >= 80 },
                        ].map(item => (
                          <div key={item.label} className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${item.done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                              {item.done ? <Check size={11} /> : <AlertCircle size={11} />}
                            </div>
                            <span className={`text-xs ${item.done ? 'text-slate-700' : 'text-slate-500'}`}>{item.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Deep Research Prompt */}
                      {!deepResearchPrompt ? (
                        <button
                          type="button"
                          onClick={generateDeepResearch}
                          disabled={generating || !isPaid}
                          className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                            isPaid
                              ? 'bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {!isPaid && <Lock size={14} />}
                          {generating ? <Loader2 size={14} className="animate-spin" /> : null}
                          {isPaid ? 'Generate Deep Research Prompt' : 'Requires Paid Plan'}
                        </button>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-emerald-600">✓ Deep Research Prompt Ready</span>
                            <button
                              type="button"
                              onClick={() => { navigator.clipboard.writeText(deepResearchPrompt); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                            >
                              {copied ? <Check size={12} /> : <Copy size={12} />}
                              {copied ? 'Copied!' : 'Copy'}
                            </button>
                          </div>
                          <p className="text-xs text-slate-500">Paste this into ChatGPT Deep Research for a full brand analysis, competitive landscape, ICP, and offer recommendations.</p>
                        </div>
                      )}

                      {/* Approve & Go Live */}
                      {completionScore >= 80 && !brand.ownerApproved ? (
                        <button
                          type="button"
                          onClick={handleApprove}
                          disabled={saving}
                          className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 shadow-sm"
                        >
                          <Rocket size={16} />
                          Approve Brand & Enable Go Live
                        </button>
                      ) : brand.ownerApproved ? (
                        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <Check size={16} className="text-emerald-600" />
                          <div>
                            <p className="text-sm font-bold text-emerald-700">Brand Approved</p>
                            <p className="text-xs text-emerald-600">Approved {brand.approvedAt ? new Date(brand.approvedAt).toLocaleDateString() : ''}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <AlertCircle size={16} className="text-amber-500" />
                          <p className="text-xs text-slate-600">Complete {Math.ceil((80 - completionScore) / 6.67)} more fields to unlock approval</p>
                        </div>
                      )}
                    </div>
                  )}

                  {section.id !== 'preflight' && (
                    <button
                      type="button"
                      onClick={() => save(brand)}
                      disabled={saving}
                      className="self-end flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={12} className="animate-spin" /> : saveStatus === 'saved' ? <Check size={12} /> : null}
                      {saveStatus === 'saved' ? 'Saved' : 'Save Changes'}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export default BrandGovernancePanel;
