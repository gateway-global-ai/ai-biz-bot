/**
 * ConciergePanel - Unified Voice/Chat Interface (Gateway Global AI PTT)
 *
 * This is the canonical PTT interface that represents Gateway Global AI.
 * Default styling follows the Nova Verify billing-summary look: solid white content area,
 * solid dark header/footer (sovereign-deep #0F172A), clean sans-serif, rounded-sui.
 * See _legacy_archive/novaverify (1) and docs/NOVA_VERIFY_UI_REFERENCE.md.
 *
 * REDESIGNED LAYOUT (15-20-40-25):
 * 15% - Top Header (Logo, Status, Title, Settings/Admin/Layout/Close)
 * 20% - Visualizer (Wave visualization, status text)
 * 40% - Content Window (Transcribed conversation, multimodal tools)
 * 25% - Bottom Footer (PTT button 50% width, optional side buttons)
 *
 * Key Features:
 * - Professional PTT with sovereign glass UI by default
 * - Compact, efficient use of screen space
 * - Multimodal content area for maps, forms, catalogs
 * - Auto-restart on settings change
 */

import React, { useState, useEffect, useRef, startTransition } from 'react';
import { motion } from 'framer-motion';
import { useOSMenu } from '@/hooks/useOSMenu';
import AgentManager from '@/pages/agents/AgentManager';
import { 
  Maximize2, Minimize2, Mic, Send, Settings, RefreshCw, Shield, MessageSquare, Menu,
  User, Activity, CreditCard, Building2, Users, ArrowLeft, Bot, ChevronRight, ChevronDown, Phone, Share2, QrCode, History,
  LayoutDashboard, Globe, Sliders, FileText, BookOpen, Search, Upload, Lock, X, Check,
  Zap, Map, Link2, Cpu, Network, Radio, MessageCircle, ChevronUp, Copy, Download, ExternalLink, Sparkles,
  Loader2
} from 'lucide-react';
import { VoiceClientFactory } from '../../services/voice/VoiceClientFactory';
import { IVoiceClient } from '../../services/voice/IVoiceClient';
import { VoiceConfig, BusinessContext, AgentConfig } from '../../types/voice';
import { VoiceSettings } from '../voice/VoiceSettings';
import { ToolRouter } from '../voice/tools/ToolRouter';
import { SuccessAnimation } from '../voice/animations/SuccessAnimation';
import { useVoiceAnimations } from '../voice/animations/useVoiceAnimations';
import QRCode from 'qrcode';
import headerLogo from '@assets/clear_voice_ai_dark_sm.png';
import chatFooterCarbon from '@assets/chat-footer-carbon.png';
import { ProfileContent } from '@/components/account/ProfileContent';
import { BillingContentWithStripe } from '@/pages/account/BillingPage';
import { MixingBoardContent } from '@/pages/reseller/MixingBoard';
import ShareButton from '@/components/ShareButton';
import AIOSMark from '@/components/public/AIOSMark';
import { KnowledgeManager } from '../voice/tools/KnowledgeManager';
import { TaskOrderEditor } from '../voice/tools/TaskOrderEditor';
import { QRRoutesManager } from '../account/QRRoutesManager';
import TelephonyPanelFull from '../../pages/developer/TelephonyPanel';
import { DiscRadar, ArchBreakdown } from '@/components/agent-charts/AgentProfileCharts';
import VoiceSelector from '../voice/VoiceSelector';
import { NovaGate } from '../nova/NovaGate';

interface ConciergePanelProps {
  business: BusinessContext;
  agent: AgentConfig;
  voiceConfig: VoiceConfig;
  agentName?: string;
  initialView?: 'chat' | 'voice';
  isOpen: boolean;
  layoutMode?: 'floating' | 'fixed' | 'fullscreen';
  onClose: () => void;
  onCycleLayout?: () => void;
  onOpenSettings?: () => void;
  /** When set, header shows "Admin Mode" button that opens admin (e.g. partner dashboard). Pass optional tab id to open (e.g. 'identity-manager'). */
  onOpenAdmin?: (tab?: string) => void;
  /** When set, header shows "AI Biz Bot Chat" — open the owner chat to talk to the platform and modify router/agents. */
  onOpenBizBotChat?: () => void;
  /** When true, content shows Command Center (Profile, Governance, Bill, Businesses, Reseller, Configure AI) instead of voice transcript. */
  ownerMode?: boolean;
  /** Call when user exits Command Center back to conversation. */
  onExitOwnerMode?: () => void;
  /** Call when user taps a menu item to navigate (e.g. setLocation). */
  onNavigate?: (path: string) => void;
  /** When true, User items (Profile, Billing, etc.) open inside the panel inline instead of navigating. */
  embedViewsInPanel?: boolean;
  /** Optional: called when user chooses Share from the menu (header item moved into menu). */
  onShareClick?: () => void;
  /** Optional: called when user chooses My Account from the menu. */
  onMyAccountClick?: () => void;
  /** When true, bottom-left History button shows call history (or runs onHistoryClick); when false, shows SMS signup / login. */
  isAuthenticated?: boolean;
  /** Called when user taps History and is authenticated (e.g. open call history or telephony). */
  onHistoryClick?: () => void;
  /** Called when user taps History and not authenticated (e.g. open SMS consent or login). */
  onSmsConsentClick?: () => void;
  /** UI style: 'sovereign' = Gateway Global AI / Nova Verify (default). 'default' = legacy blue/purple gradient. */
  variant?: 'default' | 'sovereign';
  /** Optional public URL slug for this business (/biz/:slug). When set, menu shows scannable QR that opens the AI BIZ BOT page. */
  publicSlug?: string | null;
  /** Optional direct URL for QR handoff when no public business slug exists (e.g. /demo). */
  transferUrl?: string | null;
  transferTitle?: string;
  transferDescription?: string;
  autoStartPttOnOpen?: boolean;
  /** When false, hide the Controls section (Identity, Voice, DISC, ARCH, Sys prompt). Use on public/customer pages so visitors are not sent to the owner app. */
  showOwnerControls?: boolean;
  /** Optional business website URL for the Links menu (Website, Online store). When set, menu shows quick links without leaving chat. */
  websiteUrl?: string | null;
  className?: string;
  zIndex?: number;
  initialMessages?: ChatMessage[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text?: string;
  mapData?: any;
  timestamp: number;
  metadata?: any;
}

/** In-chat Knowledge overlay: list artifacts, toggle active keys, lock for private docs. */
const KnowledgeOverlay: React.FC<{
  siteConfigId: string | undefined;
  onClose: () => void;
  isSovereign: boolean;
}> = ({ siteConfigId, onClose, isSovereign }) => {
  const [items, setItems] = useState<Array<{
    id: string;
    title: string;
    content: string;
    category?: string;
    topic?: string;
    addedAt?: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedSiteConfigId, setResolvedSiteConfigId] = useState<string | null>(null);

  const needsPlatformFallback =
    !siteConfigId ||
    siteConfigId === 'platform-landing' ||
    siteConfigId === 'platform_landing' ||
    siteConfigId === 'platform' ||
    siteConfigId === 'undefined' ||
    siteConfigId === '';

  useEffect(() => {
    let cancelled = false;

    const resolveContext = async () => {
      if (!needsPlatformFallback && siteConfigId) {
        setResolvedSiteConfigId(siteConfigId);
        return;
      }

      try {
        const response = await fetch('/api/site-configs/by-slug/ai-biz-bots');
        if (!response.ok) {
          throw new Error('Failed to resolve AI Biz Bot platform context.');
        }
        const site = await response.json();
        if (!cancelled) {
          setResolvedSiteConfigId(site.id);
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message ?? 'Failed to resolve platform knowledge.');
          setResolvedSiteConfigId(null);
        }
      }
    };

    void resolveContext();
    return () => {
      cancelled = true;
    };
  }, [needsPlatformFallback, siteConfigId]);

  useEffect(() => {
    if (!resolvedSiteConfigId) {
      if (!error) {
        setLoading(true);
      }
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/site-configs/${resolvedSiteConfigId}/knowledge`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then((data) => {
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
        }
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message ?? 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedSiteConfigId, error]);

  return (
    <motion.div
      role="dialog"
      aria-label="Knowledge base"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`absolute inset-0 z-40 flex flex-col overflow-hidden ${isSovereign ? 'bg-[#0F172A]' : 'bg-slate-900'} backdrop-blur-sm`}
      style={{ top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div className="p-4 flex items-center justify-between border-b border-slate-500/60 shrink-0">
        <span className="font-semibold text-white">Knowledge base</span>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/10"
          aria-label="Close"
        >
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {loading && <p className="text-slate-400 text-sm">Loading…</p>}
        {!loading && error && <p className="text-amber-400 text-sm">{error}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="text-slate-400 text-sm">
            No knowledge documents found for this context yet.
          </p>
        )}
        {!loading && !error && items.length > 0 && (
          <div className="space-y-2">
            <p className="text-slate-400 text-xs mb-2">
              {needsPlatformFallback
                ? 'Showing the platform-level AI Biz Bot knowledge library.'
                : 'Showing this business knowledge library.'}
            </p>
            {items.map((doc) => (
              <div
                key={doc.id}
                className={`rounded-sui border p-3 ${isSovereign ? 'border-indigo-500/20 bg-slate-900/40' : 'border-slate-500/60 bg-slate-800/40'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="flex-1 text-white font-medium truncate">{doc.title}</span>
                  {doc.category && (
                    <span className="text-[10px] uppercase tracking-wider text-indigo-300">
                      {doc.category}
                    </span>
                  )}
                </div>
                {doc.topic && (
                  <p className="text-xs text-slate-400 mb-1">{doc.topic}</p>
                )}
                <p className="text-sm text-slate-300 line-clamp-3">{doc.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

/** Collapsible owner menu sections — Identity, Behavior, Intelligence, etc. */
type MenuSubViewOut = 'identity' | 'id_name_voice' | 'id_business' | 'id_role' | 'id_tasks' | 'id_skills' | 'disc' | 'system_prompt' | 'knowledge' | 'documents' | 'task_order' | 'voice' | 'integrations' | 'routing' | 'communication' | null;

function OwnerMenuSections({ expandedSection, toggleSection, setMenuSubView }: {
  expandedSection: string | null;
  toggleSection: (s: string) => void;
  setMenuSubView: (v: MenuSubViewOut) => void;
}) {
  const sections = [
    {
      id: 'identity', label: 'Identity', color: 'indigo', singleView: null as MenuSubViewOut | null,
      items: [
        { label: 'Name & Voice', view: 'id_name_voice' as MenuSubViewOut },
        { label: 'Business',      view: 'id_business'  as MenuSubViewOut },
        { label: 'Role',          view: 'id_role'       as MenuSubViewOut },
        { label: 'Tasks',         view: 'id_tasks'      as MenuSubViewOut },
        { label: 'Skills',        view: 'id_skills'     as MenuSubViewOut },
      ],
    },
    {
      id: 'behavior', label: 'Behavior', color: 'violet', singleView: null as MenuSubViewOut | null,
      items: [
        { label: 'Character (DISC)',           view: 'disc'          as MenuSubViewOut },
        { label: 'Communication Style (ARCH)', view: 'system_prompt' as MenuSubViewOut },
      ],
    },
    {
      id: 'intelligence', label: 'Intelligence', color: 'emerald', singleView: null as MenuSubViewOut | null,
      items: [
        { label: 'Knowledge Library', view: 'knowledge'   as MenuSubViewOut },
        { label: 'Documents',         view: 'documents'   as MenuSubViewOut },
        { label: 'Task Order',        view: 'task_order'  as MenuSubViewOut },
      ],
    },
    {
      id: 'integrations', label: 'Integrations', color: 'amber', singleView: 'integrations' as MenuSubViewOut,
      items: [{ label: 'Integrations', view: 'integrations' as MenuSubViewOut }],
    },
    {
      id: 'routing', label: 'Routing', color: 'sky', singleView: 'routing' as MenuSubViewOut,
      items: [{ label: 'QR Code & Sharing', view: 'routing' as MenuSubViewOut }],
    },
    {
      id: 'communication', label: 'Communication', color: 'rose', singleView: 'communication' as MenuSubViewOut,
      items: [{ label: 'Telephony & SMS', view: 'communication' as MenuSubViewOut, badge: 'Paid' }],
    },
  ] as const;

  type ColorKey = 'indigo' | 'violet' | 'emerald' | 'amber' | 'sky' | 'rose';
  const colorMap: Record<ColorKey, { open: string; item: string }> = {
    indigo:  { open: 'border-indigo-500/30 bg-indigo-500/[0.06]',  item: 'hover:bg-indigo-500/10' },
    violet:  { open: 'border-violet-500/30 bg-violet-500/[0.06]',  item: 'hover:bg-violet-500/10' },
    emerald: { open: 'border-emerald-500/30 bg-emerald-500/[0.06]', item: 'hover:bg-emerald-500/10' },
    amber:   { open: 'border-amber-500/30 bg-amber-500/[0.06]',    item: 'hover:bg-amber-500/10' },
    sky:     { open: 'border-sky-500/30 bg-sky-500/[0.06]',         item: 'hover:bg-sky-500/10' },
    rose:    { open: 'border-rose-500/30 bg-rose-500/[0.06]',       item: 'hover:bg-rose-500/10' },
  };

  return (
    <div className="space-y-1.5 mb-3">
      {sections.map(sec => {
        const isOpen = expandedSection === sec.id;
        const isSingle = sec.items.length === 1;
        const c = colorMap[sec.color as ColorKey];
        return (
          <div key={sec.id} className={`rounded-xl border overflow-hidden transition-all ${isOpen ? c.open : 'border-slate-700/50'}`}>
            <button
              type="button"
              onClick={() => isSingle ? setMenuSubView(sec.items[0].view) : toggleSection(sec.id)}
              className="w-full flex items-center gap-3 px-3 py-3 text-left text-white hover:bg-white/5 transition-colors"
            >
              <span className={`text-sm font-medium ${isOpen ? 'text-white' : 'text-slate-200'} flex-1`}>{sec.label}</span>
              {isSingle
                ? <ChevronRight size={14} className="text-slate-500" />
                : isOpen
                  ? <ChevronUp size={14} className="text-slate-400" />
                  : <ChevronDown size={14} className="text-slate-500" />
              }
            </button>
            {!isSingle && isOpen && (
              <div className="border-t border-white/5 px-2 pb-2 space-y-0.5">
                {sec.items.map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setMenuSubView(item.view)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${c.item}`}
                  >
                    <span className="text-slate-200 text-sm flex-1">{item.label}</span>
                    {'badge' in item && item.badge && (
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[9px] font-semibold uppercase tracking-wider mr-1">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight size={12} className="text-slate-600 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Inline telephony panel rendered inside the Communication sub-panel. */
/**
 * BusinessMapEmbed — renders an OpenStreetMap iframe pinned to stored lat/lng.
 * Zero runtime API calls. Coordinates come from placeData.geometry.location
 * already persisted in the DB at onboarding time.
 */
function BusinessMapEmbed({ lat, lng, name, address }: { lat?: number; lng?: number; name?: string; address?: string }) {
  const hasCoords = typeof lat === 'number' && typeof lng === 'number';

  if (!hasCoords) {
    // Fallback: OpenStreetMap search by address/name
    const query = encodeURIComponent(name && address ? `${name}, ${address}` : address || name || '');
    if (!query) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-600 gap-3">
          <Map size={32} className="opacity-30" />
          <p className="text-xs">No location data available</p>
        </div>
      );
    }
    // OSM nominatim-based search embed
    const src = `https://www.openstreetmap.org/export/embed.html?bbox=-180,-90,180,90&layer=mapnik&marker=0,0`;
    // Use Google Maps embed search fallback (no key needed for basic embed)
    const googleSearch = `https://maps.google.com/maps?q=${query}&output=embed&z=15`;
    return (
      <iframe
        title={`Map of ${name || 'business'}`}
        src={googleSearch}
        className="w-full h-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    );
  }

  // Primary path: OSM embed with exact coordinates — no API key, no billing
  const zoom = 16;
  const bbox = {
    west:  lng - 0.006,
    south: lat - 0.003,
    east:  lng + 0.006,
    north: lat + 0.003,
  };
  const osmSrc = `https://www.openstreetmap.org/export/embed.html` +
    `?bbox=${bbox.west},${bbox.south},${bbox.east},${bbox.north}` +
    `&layer=mapnik` +
    `&marker=${lat},${lng}`;

  return (
    <div className="relative w-full h-full">
      <iframe
        title={`Map of ${name || 'business'}`}
        src={osmSrc}
        className="w-full h-full border-0"
        loading="lazy"
      />
      {/* "Open in Google Maps" link overlaid bottom-right */}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 text-[10px] font-medium hover:text-white hover:border-indigo-500/40 backdrop-blur-sm transition-colors shadow-lg"
      >
        <ExternalLink size={10} />
        Open in Maps
      </a>
    </div>
  );
}

/** Documents panel — fetches industry-specific document templates via Nova document service */
function DocumentsPanel({ siteConfigId, onBack }: { siteConfigId?: string; onBack: () => void }) {
  const [profile, setProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!siteConfigId) { setLoading(false); return; }
    fetch(`/api/nova/documents/${siteConfigId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setProfile(data); setLoading(false); })
      .catch(() => { setError('Failed to load document templates'); setLoading(false); });
  }, [siteConfigId]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 size={20} className="animate-spin text-emerald-400" />
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 pt-4 pb-3 border-b border-slate-700/50 flex items-center gap-3 shrink-0">
        <button type="button" onClick={onBack} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
          <ArrowLeft size={15} />
        </button>
        <FileText size={16} className="text-emerald-400" />
        <span className="text-white font-semibold text-sm">Industry Documents</span>
        {profile && (
          <span className="ml-auto text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5">
            Level {profile.protocolLevel}
          </span>
        )}
      </div>
      <div className="flex-1 p-4 flex flex-col gap-4">
        {error && <p className="text-xs text-red-400">{error}</p>}
        {profile && (
          <>
            <div className="rounded-sui bg-slate-800/60 border border-slate-700/60 p-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">{profile.protocolName} Protocol</p>
              <p className="text-xs text-slate-400">{profile.protocolDescription}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Required Documents</p>
              <div className="flex flex-col gap-2">
                {profile.documents?.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between rounded-xl bg-slate-800/40 border border-slate-700/40 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <FileText size={13} className="text-emerald-400 shrink-0" />
                      <span className="text-sm text-white">{doc.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 bg-slate-700/50 rounded px-2 py-0.5">Available</span>
                  </div>
                ))}
              </div>
            </div>
            {profile.invoiceItems?.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Invoice Line Items</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.invoiceItems.map((item: string) => (
                    <span key={item} className="text-[11px] text-slate-400 bg-slate-800/60 border border-slate-700/40 rounded-full px-2 py-0.5">
                      {item.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {!profile && !error && (
          <p className="text-sm text-slate-500 text-center mt-8">No document profile found.</p>
        )}
      </div>
    </div>
  );
}

function TelephonyInlinePanel({ siteConfigId }: { siteConfigId?: string | null }) {
  const [config, setConfig] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [phone, setPhone] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (!siteConfigId) { setLoading(false); return; }
    const token = typeof window !== 'undefined' ? localStorage.getItem('gateway_auth_token') : null;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch(`/api/site-configs/${siteConfigId}`, { headers, credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setConfig(data);
        setPhone(data?.phoneNumber ?? '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteConfigId]);

  const save = async () => {
    if (!siteConfigId) return;
    setSaving(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('gateway_auth_token') : null;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      await fetch(`/api/site-configs/${siteConfigId}`, { method: 'PATCH', headers, credentials: 'include', body: JSON.stringify({ phoneNumber: phone }) });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-4"><div className="w-5 h-5 rounded-full border-2 border-rose-500/40 border-t-rose-400 animate-spin" /></div>;

  const hasPhone = config?.phoneNumber?.trim();
  return (
    <div className="space-y-3">
      {hasPhone ? (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5">
          <Phone size={13} className="text-emerald-400 shrink-0" />
          <span className="text-emerald-200 text-sm font-semibold font-mono">{config.phoneNumber}</span>
          <span className="ml-auto text-[10px] text-emerald-400">Active</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-700/30 rounded-xl px-3 py-2.5">
          <Phone size={13} className="text-slate-500 shrink-0" />
          <span className="text-slate-500 text-xs">No phone number assigned</span>
        </div>
      )}
      <div>
        <label className="text-xs text-slate-400 mb-1.5 block font-medium">Assign Phone Number</label>
        <div className="flex gap-2">
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (702) 555-0100"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500/50 font-mono" />
          <button type="button" onClick={save} disabled={saving || !phone}
            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${saved ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/80 text-white hover:bg-rose-500 disabled:opacity-40'}`}>
            {saving ? '…' : saved ? '✓' : 'Save'}
          </button>
        </div>
        <p className="text-[11px] text-slate-600 mt-1.5">Enter a Twilio-provisioned number. Upgrade to Comms Tier ($50/mo) to provision a new number.</p>
      </div>
    </div>
  );
}

export const ConciergePanel: React.FC<ConciergePanelProps> = ({
  business,
  agent,
  voiceConfig,
  agentName,
  isOpen,
  layoutMode = 'floating',
  onClose,
  onCycleLayout,
  onOpenAdmin,
  onOpenBizBotChat,
  ownerMode = false,
  onExitOwnerMode,
  onNavigate,
  embedViewsInPanel = false,
  onShareClick,
  onMyAccountClick,
  isAuthenticated = false,
  onHistoryClick,
  onSmsConsentClick,
  variant = 'sovereign',
  publicSlug = null,
  transferUrl = null,
  transferTitle = 'Demo Handoff',
  transferDescription = 'Scan to open this experience on your phone.',
  autoStartPttOnOpen = false,
  showOwnerControls = true,
  websiteUrl = null,
  className = '',
  zIndex = 50,
  initialMessages = []
}) => {
  const siteConfigId = business.id;
  const isSovereign = variant === 'sovereign';
  const shareUrl =
    publicSlug && typeof window !== 'undefined'
      ? `${window.location.origin}/biz/${publicSlug}`
      : typeof window !== 'undefined'
        ? window.location.href
        : '';
  const qrTargetUrl = publicSlug ? shareUrl : (transferUrl ?? '');
  const [transferQrDataUrl, setTransferQrDataUrl] = useState<string>('');
  const qrImageSrc = publicSlug
    ? `/qr/img/${encodeURIComponent(publicSlug)}`
    : transferQrDataUrl;
  const canShowTransferQr = Boolean(qrTargetUrl && qrImageSrc);

  // --- State ---
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const clientRef = useRef<IVoiceClient | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [currentVoiceConfig, setCurrentVoiceConfig] = useState(voiceConfig);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successMessageId, setSuccessMessageId] = useState<string | null>(null);
  const [isTransferPromoVisible, setIsTransferPromoVisible] = useState(false);
  /** Single Menu icon opens overlay; first screen = Admin | User | Public Agents only. */
  const [showMenuOverlay, setShowMenuOverlay] = useState(false);
  /** Share overlay: menu of options (Facebook, Email, Text, etc.) + QR code. */
  const [showShareOverlay, setShowShareOverlay] = useState(false);
  /** In-chat Knowledge overlay: list docs, toggle active keys, lock for private. */
  const [showKnowledgeOverlay, setShowKnowledgeOverlay] = useState(false);
  /** Inline menu sub-view: null = main menu, 'disc' = DISC sliders, 'system_prompt' = prompt editor, 'knowledge' = KB manager, 'task_order' = task order editor, 'voice' = voice selector */
  type MenuSubView = 
    // Identity group
    'identity' | 'id_name_voice' | 'id_business' | 'id_role' | 'id_tasks' | 'id_skills' |
    // Behavior group
    'disc' | 'system_prompt' |
    // Intelligence group
    'knowledge' | 'documents' | 'task_order' |
    // Voice (legacy direct)
    'voice' |
    // Integrations
    'integrations' |
    // Routing
    'routing' |
    // Communication
    'communication' |
    null;
  const [menuSubView, setMenuSubView] = useState<MenuSubView>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const toggleSection = (s: string) => setExpandedSection(prev => prev === s ? null : s);
  /** Agent data loaded for inline menu editing */
  const [menuAgent, setMenuAgent] = useState<any>(null);
  const [menuAgentDisc, setMenuAgentDisc] = useState({ dominance: 50, influence: 50, steadiness: 50, conscientiousness: 50 });
  const [menuAgentArch, setMenuAgentArch] = useState({ acknowledge: 75, reflect: 60, context: 50, handoff: 30, responseWindowSeconds: 20 });
  const [menuAgentVoiceName, setMenuAgentVoiceName] = useState<string>('Kore');
  const [menuSysPrompt, setMenuSysPrompt] = useState({ ownerIdentity: '', loyaltyStatement: '', ownerPriorities: '', operationalMode: 'SAFE' });
  const [menuNoDriftMode, setMenuNoDriftMode] = useState(false);
  const [menuSaving, setMenuSaving] = useState(false);
  const [menuSaved, setMenuSaved] = useState(false);
  /** First-level drill: null = home (Admin | User | Public Agents); then 'admin' | 'user' | 'public'. */
  /** Flattened menu: no drill-down; single list with section headers. */
  type EmbeddedViewId = 'profile' | 'billing' | 'my-businesses' | 'reseller' | 'operations' | 'agent-manager' | 'financials' | 'team' | 'front-desk' | 'internal-agents' | 'public-agents' | 'booking-view' | 'reschedule-view' | 'profile-view' | 'insurance-view' | 'concierge-view' | 'employee-dashboard-view' | 'live-queue-view' | 'session-monitor-view' | 'calendar-view' | 'customer-list-view' | 'verification-view' | 'intake-view' | 'communications-view' | 'manager-dashboard-view' | 'operations-view' | 'customer-db-view' | 'schedule-rules-view' | 'staff-view' | 'comms-config-view' | 'reports-view' | 'system-health-view' | 'locations-view' | 'billing-view' | 'identity-view' | 'behavior-view' | 'guardrails-view' | 'audit-view' | 'welcome-view' | 'login-view';
  const [embeddedView, setEmbeddedView] = useState<EmbeddedViewId | null>(null);

  const handleMenuAction = (viewId: string) => {
     if (['profile', 'billing', 'my-businesses', 'reseller', 'operations', 'agent-manager', 'financials', 'team', 'front-desk', 'internal-agents', 'public-agents', 'booking-view', 'reschedule-view', 'profile-view', 'insurance-view', 'concierge-view', 'employee-dashboard-view', 'live-queue-view', 'session-monitor-view', 'calendar-view', 'customer-list-view', 'verification-view', 'intake-view', 'communications-view', 'manager-dashboard-view', 'operations-view', 'customer-db-view', 'schedule-rules-view', 'staff-view', 'comms-config-view', 'reports-view', 'system-health-view', 'locations-view', 'billing-view', 'identity-view', 'behavior-view', 'guardrails-view', 'audit-view', 'welcome-view', 'login-view'].includes(viewId)) {
         setEmbeddedView(viewId as EmbeddedViewId);
     } else {
         onNavigate?.(viewId);
     }
     setShowMenuOverlay(false);
  };

  const osMenuItems = useOSMenu(ownerMode ? 'manager' : isAuthenticated ? 'employee' : 'customer', isAuthenticated);

  // Helper: build fetch headers with auth token from localStorage
  const authHeaders = (): HeadersInit => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('gateway_auth_token') : null;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  // ── Owner agent role selector ─────────────────────────────────────────────
  // When showOwnerControls is true, the owner can switch between three AI advisors:
  //   • concierge   — the business's voice agent (default, customer-facing)
  //   • biz-bot     — AI Biz Bot: consulting on the business profile, strategy, ops
  //   • bot-builder — AI Bot Builder: guides owner through configuring this agent
  type OwnerAgentRole = 'concierge' | 'biz-bot' | 'bot-builder';
  const [ownerAgentRole, setOwnerAgentRole] = useState<OwnerAgentRole>('concierge');

  // ── Shell mode derivation ─────────────────────────────────────────────────
  // Determines which experience to render based on auth state + workspace lifecycle.
  // 'owner'          → full management controls (showOwnerControls=true from parent)
  // 'customer'       → voice concierge only — the default public experience
  // 'demo_claimable' → customer + slim "Is this your business?" claim banner
  // 'locked'         → customer + Nova IDV gate triggers when owner menu is attempted
  type ShellMode = 'owner' | 'customer' | 'demo_claimable' | 'locked';
  const shellMode: ShellMode = (() => {
    if (showOwnerControls) return 'owner';
    const ws = business.workspaceState;
    if (ws === 'demo' || ws === 'provisioned') return 'demo_claimable';
    if (ws === 'claimed' || ws === 'active') return 'locked';
    return 'customer';
  })();

  // Nova Gate: shown inline when a non-owner taps to claim or sign in
  const [showNovaGate, setShowNovaGate] = useState(false);
  const [novaGateMode, setNovaGateMode] = useState<'claim' | 'signin'>('claim');
  const [claimBannerDismissed, setClaimBannerDismissed] = useState(false);

  // On successful Nova verification — store token and signal parent to re-evaluate ownership
  const handleNovaVerified = (token: string, _userId: string) => {
    localStorage.setItem('gateway_auth_token', token);
    setShowNovaGate(false);
    // Reload the page so AgentPage re-evaluates isOwner with the new token
    window.location.reload();
  };
  // When the owner navigates to a panel, inject a silent realtime_input text
  // event so the connected Gemini agent knows what's on the screen.
  // This mirrors the Gemini Live API's RealtimeInput event pattern — discrete
  // context events instead of a continuous video feed.
  const canvasContextLabels: Partial<Record<NonNullable<MenuSubView>, string>> = {
    id_name_voice: `The owner is viewing the Name & Voice panel for agent "${menuAgent?.name || 'this agent'}". The available Gemini voices are: Kore (warm, female), Aoede (clear, female), Leda (soft, female), Zephyr (friendly, female), Puck (upbeat, male), Charon (deep, male), Fenrir (calm, male), Orus (authoritative, male). Each can be selected to change how the agent speaks. The owner may ask for a recommendation.`,
    id_business: `The owner is viewing the Business panel for "${business.name}". It shows: address "${business.address}", rating ${business.rating ?? 'unknown'}/5, phone ${business.phone ?? 'not set'}, and a live map pinned to the business location. The owner may ask about their business profile or location.`,
    id_role: `The owner is viewing the Role configuration panel. They can set the agent's role type (CONCIERGE, SALES, SUPPORT, INTAKE, RECEPTION, CUSTOM), define the agent's identity and purpose, write a loyalty statement, and set owner priorities.`,
    id_tasks: `The owner is viewing the Task Order editor. This defines the structured interaction script — ordered steps the agent follows during each customer conversation.`,
    id_skills: `The owner is viewing the Skills & Capabilities registry. It shows all available tools this agent can use: knowledge search, intake forms, order management, show_canvas for pushing content, Google Maps grounding, and SerpAPI search.`,
    disc: `The owner is viewing the Character (DISC) panel. The four sliders control: Dominance (assertiveness), Influence (enthusiasm), Steadiness (patience), Conscientiousness (precision). There is also an ARCH communication profile with Acknowledge, Reflect, Context, and Handoff dimensions.`,
    system_prompt: `The owner is viewing the Communication Style (ARCH) panel with the system prompt editor. They can edit the agent's core instructions, operational mode, loyalty statement, and owner priorities.`,
    knowledge: `The owner is viewing the Knowledge Library panel. They can upload documents, ingest the business website, and manage what knowledge the agent has access to.`,
    task_order: `The owner is viewing the Task Order editor for structuring the agent's interaction flow.`,
    integrations: `The owner is viewing the Integrations panel showing: Gemini Live AI (active), Google Maps Grounding, SerpAPI, and Google Places API integration status.`,
    routing: `The owner is viewing the Routing panel. It shows the agent's QR code, the public sharing URL (${typeof window !== 'undefined' ? window.location.origin : ''}/biz/${publicSlug ?? ''}), and the QR Network route manager with scan analytics.`,
    communication: `The owner is viewing the Communication panel with the full Telephony system: phone number provisioning, webhook configuration, firewall settings, call history with caller ID, and SMS configuration.`,
    voice: `The owner is viewing the Voice selector. The 8 available Gemini voices are shown in a gender-coded grid (pink = female: Kore, Aoede, Leda, Zephyr; blue = male: Puck, Charon, Fenrir, Orus). The owner can click any voice to preview and select it.`,
  };

  useEffect(() => {
    if (!menuSubView) return;
    const contextText = canvasContextLabels[menuSubView];
    if (!contextText) return;
    // Only inject if the voice session is active
    if (!clientRef.current || !(clientRef.current as any).isConnected?.()) return;
    const injection = `[CANVAS CONTEXT UPDATE — silent, do not read aloud]: ${contextText}`;
    clientRef.current.sendText(injection);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuSubView]);

  // Load agent data when DISC or system prompt sub-view is opened
  useEffect(() => {
    if ((menuSubView === 'disc' || menuSubView === 'system_prompt' || menuSubView === 'voice' || menuSubView === 'identity' || menuSubView === 'id_name_voice' || menuSubView === 'id_business' || menuSubView === 'id_role' || menuSubView === 'id_tasks' || menuSubView === 'id_skills') && siteConfigId && !menuAgent) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gateway_auth_token') : null;
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      fetch(`/api/agents?siteConfigId=${encodeURIComponent(siteConfigId)}`, { credentials: 'include', headers })
        .then(r => r.ok ? r.json() : null)
        .then(async (data) => {
          const agents = Array.isArray(data) ? data : [];
          let agent = agents[0] ?? null;

          // Auto-provision a default agent if none exist for this site
          if (!agent && siteConfigId) {
            try {
              const createRes = await fetch('/api/agents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
                credentials: 'include',
                body: JSON.stringify({
                  siteConfigId,
                  name: business?.name ? `${business.name} Concierge` : 'AI Concierge',
                  roleType: 'CONCIERGE',
                  voiceId: 'Kore',
                  voiceName: 'Kore',
                  systemPrompt: `You are a helpful AI concierge for ${business?.name ?? 'this business'}. Be friendly, professional, and assist customers with their needs.`,
                  dominance: 30,
                  influence: 60,
                  steadiness: 70,
                  conscientiousness: 50,
                  archProfile: { acknowledge: 75, reflect: 60, context: 50, handoff: 30 },
                  visibility: 'private',
                  status: 'active',
                  operationalMode: 'CONCIERGE',
                }),
              });
              if (createRes.ok) {
                agent = await createRes.json();
              }
            } catch (_) {}
          }

          setMenuAgent(agent);
          if (agent) {
            setMenuAgentDisc({
              dominance: agent.dominance ?? 30,
              influence: agent.influence ?? 60,
              steadiness: agent.steadiness ?? 70,
              conscientiousness: agent.conscientiousness ?? 50,
            });
            setMenuAgentArch({
              acknowledge: agent.archProfile?.acknowledge ?? 75,
              reflect: agent.archProfile?.reflect ?? 60,
              context: agent.archProfile?.context ?? 50,
              handoff: agent.archProfile?.handoff ?? 30,
              responseWindowSeconds: agent.archProfile?.responseWindowSeconds ?? 20,
            });
            setMenuAgentVoiceName(agent.voiceName ?? 'Kore');
            setMenuSysPrompt({
              ownerIdentity: agent.ownerIdentity ?? '',
              loyaltyStatement: agent.loyaltyStatement ?? '',
              ownerPriorities: agent.ownerPriorities ?? '',
              operationalMode: agent.operationalMode ?? 'CONCIERGE',
            });
            setMenuNoDriftMode(agent.noDriftMode ?? false);
          }
        })
        .catch(() => {});
    }
    if (!menuSubView) {
      setMenuAgent(null);
      setMenuSaved(false);
    }
  }, [menuSubView, siteConfigId]);
  const [expandedAdminAccount, setExpandedAdminAccount] = useState(false);
  const [expandedAdminAgents, setExpandedAdminAgents] = useState(false);
  const [expandedAdminReferral, setExpandedAdminReferral] = useState(false);
  const [expandedUserReferral, setExpandedUserReferral] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<AgentConfig>(agent);
  const [availableAgents, setAvailableAgents] = useState<AgentConfig[]>([]);

  // Update currentAgent when agent prop changes (unless user manually switched)
  useEffect(() => {
    setCurrentAgent(agent);
  }, [agent]);

  // Fetch available agents when owner mode is active
  useEffect(() => {
    if (!ownerMode || !siteConfigId) return;
    
    // Always include AI Biz Bot as the first option
    const aiBizBot: AgentConfig = {
      name: 'AI Biz Bot',
      role: 'Business Consultant & Orchestrator',
      personality: `You are AI Biz Bot, built for small business owners by a small business owner. Your loyalty is to the customer. You help with business strategy, governance, and configuring the platform.`,
      objectives: ['Consult on business strategy', 'Configure platform settings', 'Manage governance'],
      constraints: ['Focus on business owner needs', 'Do not act as customer support']
    };

    fetch(`/api/site-configs/${siteConfigId}/agents`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && Array.isArray(data.agents)) {
          const dbAgents = data.agents.map((a: any) => ({
            name: a.name || 'Business Agent',
            role: a.roleType || 'Assistant',
            personality: a.basePrompt || 'Helpful assistant',
            objectives: [], // DB doesn't store these structured yet
            constraints: []
          }));
          setAvailableAgents([aiBizBot, ...dbAgents]);
        } else {
          setAvailableAgents([aiBizBot, agent]); // Fallback to prop agent
        }
      })
      .catch(() => setAvailableAgents([aiBizBot, agent]));
  }, [ownerMode, siteConfigId, agent]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { triggerSuccess } = useVoiceAnimations();
  const [animationTick, setAnimationTick] = useState(0);
  const processingStartedAtRef = useRef<number>(0);
  const processingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStartedPttRef = useRef(false);
  const initAttemptedForIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!transferUrl || publicSlug) {
      setTransferQrDataUrl('');
      return;
    }

    QRCode.toDataURL(transferUrl, {
      width: 180,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then(setTransferQrDataUrl)
      .catch(() => setTransferQrDataUrl(''));
  }, [publicSlug, transferUrl]);

  useEffect(() => {
    if (!canShowTransferQr) {
      setIsTransferPromoVisible(false);
    }
  }, [canShowTransferQr]);

  useEffect(() => {
    if (!isTransferPromoVisible || !canShowTransferQr) return;
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 768) return;

    const timeout = window.setTimeout(() => {
      setIsTransferPromoVisible(false);
    }, 10000);

    return () => window.clearTimeout(timeout);
  }, [isTransferPromoVisible, canShowTransferQr]);

  const setProcessingOn = () => {
    processingStartedAtRef.current = Date.now();
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
    setIsProcessing(true);
  };

  const setProcessingOff = () => {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
    const elapsed = Date.now() - processingStartedAtRef.current;
    const minDisplayMs = 1200;
    const remaining = Math.max(0, minDisplayMs - elapsed);
    if (remaining > 0) {
      processingTimeoutRef.current = setTimeout(() => {
        processingTimeoutRef.current = null;
        setIsProcessing(false);
      }, remaining);
    } else {
      setIsProcessing(false);
    }
  };

  // Close menu overlay when navigating or opening a view (handled in onClick handlers).

  // Animation tick for visualizer — fixed interval so bar heights don't flicker on every re-render (e.g. volume)
  useEffect(() => {
    if (!isRecording && !isProcessing) return;
    const id = setInterval(() => setAnimationTick((t) => t + 1), 80);
    return () => clearInterval(id);
  }, [isRecording, isProcessing]);

  // Clear embedded view when leaving Command Center (owner mode)
  useEffect(() => {
    if (!ownerMode) setEmbeddedView(null);
  }, [ownerMode]);

  // Load saved voice config from API when panel opens for a real site (so Voice Settings shows DB-backed values)
  /*
  useEffect(() => {
    if (!isOpen || !siteConfigId) return;
    const isPlatform = !siteConfigId || siteConfigId === 'platform-landing' || siteConfigId === 'platform_landing' || siteConfigId === 'platform' || siteConfigId === 'undefined';
    if (isPlatform) return;
    let cancelled = false;
    fetch(`/api/site-configs/${siteConfigId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: any) => {
        if (cancelled || !data?.voiceConfig) return;
        const vc = data.voiceConfig as { voiceName?: string; analysis?: { detectEmotion?: boolean; detectSentiment?: boolean; detectDISC?: boolean } };
        const a = vc?.analysis;
        setCurrentVoiceConfig((prev) => ({
          ...prev,
          voiceName: vc?.voiceName ?? prev.voiceName,
          model: data.modelName ?? prev.model,
          ...(a && {
            enableAnalysis: {
              emotion: a.detectEmotion ?? prev.enableAnalysis.emotion,
              sentiment: a.detectSentiment ?? prev.enableAnalysis.sentiment,
              disc: a.detectDISC ?? prev.enableAnalysis.disc,
            },
          }),
        }));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen, siteConfigId]);
  */

  useEffect(() => {
    if (!isOpen) {
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
      return;
    }

    const initEngine = async () => {
      setConnectionStatus('connecting');
      try {
        // --- HANDOVER SERVICE LOGIC ---
        // Guard: only call the Handover Service when we have a real DB UUID.
        // WebsitePreview (demo/preview mode) passes business.id = '' — in that
        // case we skip the fetch and initialise directly from the props config.
        const hasValidId = Boolean(siteConfigId) && siteConfigId !== 'undefined' && siteConfigId !== '';

        // Resolved DB record (only populated when hasValidId === true)
        let dbSiteConfig: Record<string, any> | null = null;
        let validatedVoiceConfig: VoiceConfig = currentVoiceConfig;

        if (hasValidId) {
          // Prevent loop: if we already tried to init for this ID and failed, don't retry immediately unless config changed
          if (initAttemptedForIdRef.current === siteConfigId && connectionStatus === 'disconnected') {
             // allow retry if user changed config (currentVoiceConfig changed)
          }
          initAttemptedForIdRef.current = siteConfigId;

          // 1. Fetch the pre-validated configuration from the Handover Service.
          const response = await fetch(`/api/site-configs/${siteConfigId}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch site configuration for ID: ${siteConfigId}`);
          }
          dbSiteConfig = await response.json();

          // 2. Merge validated model, voice name, and analysis — Backend Config > Prop > Fallback
          const dbVoiceConfig = dbSiteConfig!.voiceConfig as {
            voiceName?: string;
            analysis?: { detectEmotion?: boolean; detectSentiment?: boolean; detectDISC?: boolean };
          } | null | undefined;
          const dbAnalysis = dbVoiceConfig?.analysis;
          
          const mergedConfig = {
            ...currentVoiceConfig,
            model: dbSiteConfig!.modelName || currentVoiceConfig.model || process.env.GEMINI_MODEL_ID,
            voiceName: dbVoiceConfig?.voiceName ?? currentVoiceConfig.voiceName,
            ...(dbAnalysis && {
              enableAnalysis: {
                emotion: dbAnalysis.detectEmotion ?? currentVoiceConfig.enableAnalysis.emotion,
                sentiment: dbAnalysis.detectSentiment ?? currentVoiceConfig.enableAnalysis.sentiment,
                disc: dbAnalysis.detectDISC ?? currentVoiceConfig.enableAnalysis.disc,
              },
            }),
          };

          // Check if we need to update state (to reflect DB values in UI)
          // We only update if it's significantly different to avoid loops
          const isDifferent = 
            mergedConfig.voiceName !== currentVoiceConfig.voiceName ||
            mergedConfig.model !== currentVoiceConfig.model ||
            JSON.stringify(mergedConfig.enableAnalysis) !== JSON.stringify(currentVoiceConfig.enableAnalysis);

          if (isDifferent) {
             console.log('[ConciergePanel] Syncing voice config from DB...');
             setCurrentVoiceConfig(mergedConfig);
             return; // Stop here; the state update will trigger useEffect again with new config
          }
          
          validatedVoiceConfig = mergedConfig;
        }

        // 3. Build resolvedAgent — DB persona takes priority over static prop.
        //    agentConfig fields: { name, role, discProfile, basePrompt }
        const dbAgentConfig = dbSiteConfig?.agentConfig as {
          name?: string;
          role?: string;
          discProfile?: string;
          basePrompt?: string;
        } | null | undefined;

        // Use currentAgent state which might have been switched by user
        const activeAgent = currentAgent.name === 'AI Biz Bot' ? currentAgent : (dbAgentConfig ? {
          ...currentAgent,
          role: [dbAgentConfig.name, dbAgentConfig.role].filter(Boolean).join(', ') || currentAgent.role,
          personality: [
            dbAgentConfig.basePrompt,
            dbAgentConfig.discProfile ? `DISC Profile: ${dbAgentConfig.discProfile}` : undefined
          ].filter(Boolean).join('. ') || currentAgent.personality,
        } : currentAgent);

        console.log('[ConciergePanel] Initializing with model:', validatedVoiceConfig.model, '| Persona:', activeAgent.role, hasValidId ? '(Handover Service)' : '(props — preview mode)');

        // 3. Create client with the VALIDATED config
        const newClient = VoiceClientFactory.createClient(validatedVoiceConfig);
        
        newClient.onMessage((msg) => {
          console.log('[ConciergePanel] Message received:', msg);
          
          if (msg.type === 'transcription') {
            // Handle user transcription (intermediate or final)
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === 'user' && lastMsg.metadata?.isTranscription) {
                // Update existing transcription message
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  ...lastMsg,
                  text: msg.text,
                  metadata: { ...lastMsg.metadata, isFinal: msg.isFinal }
                };
                return newMessages;
              } else {
                // Add new transcription message
                return [...prev, {
                  id: `msg-${Date.now()}`,
                  role: 'user',
                  text: msg.text,
                  timestamp: Date.now(),
                  metadata: { isTranscription: true, isFinal: msg.isFinal }
                }];
              }
            });
            
            if (msg.isFinal && currentVoiceConfig.mode === 'standard_ptt') {
              setProcessingOn();
            } else if (msg.isFinal && currentVoiceConfig.mode === 'clear_voice') {
              setProcessingOff();
            }
          } else if (msg.type === 'response') {
            setProcessingOff();
            if (msg.text) {
              addMessage('assistant', msg.text, msg.metadata);
            } else if (msg.metadata?.tool_type) {
              // Tool result without text (e.g. map, business intelligence)
              addMessage('assistant', undefined, msg.metadata);
            }
          } else if (msg.type === 'error') {
            setProcessingOff();
            addMessage('system', msg.text || 'An error occurred with the voice engine.');
          }
        });

        newClient.onVolumeChange((volume) => {
          startTransition(() => setVolumeLevel(volume));
        });

        newClient.onConnectionChange((connected) => {
          setConnectionStatus(connected ? 'connected' : 'disconnected');
        });

        // 4. Connect — enrich context with DB-validated systemPromptOverride when
        //    Handover Service ran; in preview mode use business as-is.
        //    CRITICAL: Always pass the resolved siteConfigId (UUID) into sessionContext so
        //    the voice proxy and MCP tools receive the Business UUID, not place_id or empty string.
        const handoverBusinessContext = dbSiteConfig
          ? { ...business, id: siteConfigId, systemPromptOverride: dbSiteConfig.systemPromptOverride, ownerAgentRole: showOwnerControls ? ownerAgentRole : undefined }
          : { ...business, ownerAgentRole: showOwnerControls ? ownerAgentRole : undefined };

        await newClient.connect(handoverBusinessContext, activeAgent, validatedVoiceConfig);
        clientRef.current = newClient;
        
        console.log('[ConciergePanel] Voice engine connected successfully');

      } catch (err) {
        console.error("[ConciergePanel] Failed to init voice engine:", err);
        setConnectionStatus('disconnected');
        const errorMessage = err instanceof Error && err.message.includes('site configuration') 
          ? 'Failed to load site configuration. Please try again.'
          : 'Connection failed. Check microphone permissions.';
        addMessage('system', errorMessage);
      }
    };

    initEngine();

    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  // Deps: `siteConfigId` (primitive) replaces the full `business` object reference
  // so that inline object literals in calling components (e.g. WebsitePreview) do
  // not create new references on every render and trigger an infinite re-connect.
  // `currentVoiceConfig` is React state so its identity is already stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, siteConfigId, currentVoiceConfig, currentAgent]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Message Management ---
  const addMessage = (role: 'user' | 'assistant' | 'system', text?: string, metadata?: any) => {
    setMessages(prev => [...prev, {
      id: `msg-${Date.now()}-${Math.random()}`,
      role,
      text,
      metadata,
      timestamp: Date.now()
    }]);
  };

  // --- Tool Handlers ---
  const handleToolSubmit = (messageId: string, value: string) => {
    // Update message to mark tool as completed
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, metadata: { ...msg.metadata, completed: true, correctedValue: value } }
        : msg
    ));

    // Show success animation
    setSuccessMessageId(messageId);
    setShowSuccessAnimation(true);
    triggerSuccess();
    
    // Hide animation after 1.5 seconds
    setTimeout(() => {
      setShowSuccessAnimation(false);
      setSuccessMessageId(null);
    }, 1500);

    // Send tool response back to Gemini
    if (clientRef.current && 'sendToolResponse' in clientRef.current) {
      (clientRef.current as any).sendToolResponse({
        name: "request_manual_input",
        result: {
          corrected_value: value,
          status: "success"
        }
      });
    }
  };

  const handleToolCancel = (messageId: string) => {
    // Remove the tool message or mark as cancelled
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  // --- PTT Handlers ---
  const startPTT = () => {
    if (!clientRef.current || connectionStatus !== 'connected' || isRecording) {
      console.warn('[ConciergePanel] Cannot start PTT: client not ready');
      return;
    }
    
    console.log('[ConciergePanel] Starting PTT session');
    setIsRecording(true);
    
    try {
      clientRef.current.startSession();
    } catch (err) {
      console.error("[ConciergePanel] PTT start error:", err);
      setIsRecording(false);
      addMessage('system', 'Microphone error. Please check permissions.');
    }
  };

  const stopPTT = () => {
    if (!isRecording || !clientRef.current) return;
    
    console.log('[ConciergePanel] Stopping PTT session');
    setIsRecording(false);
    if (currentVoiceConfig.mode === 'standard_ptt') {
      setProcessingOn();
    } else {
      setProcessingOff();
    }

    try {
      clientRef.current.endSession();
    } catch (err) {
      console.error("[ConciergePanel] PTT stop error:", err);
      setProcessingOff();
      addMessage('system', 'Error processing audio.');
    }
  };

  useEffect(() => {
    if (!isOpen || !autoStartPttOnOpen) {
      autoStartedPttRef.current = false;
      return;
    }
    if (connectionStatus !== 'connected' || isRecording || autoStartedPttRef.current) return;

    autoStartedPttRef.current = true;
    startPTT();
  }, [autoStartPttOnOpen, connectionStatus, isOpen, isRecording]);

  // --- Layout Classes (Nova Verify style: white panel, dark header/footer, rounded-sui) ---
  const getContainerClasses = () => {
    const base = isSovereign
      ? "fixed shadow-2xl transition-all duration-300 flex flex-col overflow-hidden bg-white border border-slate-200"
      : "fixed bg-slate-50 shadow-2xl transition-all duration-300 flex flex-col overflow-hidden";
    switch (layoutMode) {
      case 'fullscreen':
        return `${base} inset-0 rounded-none`;
      case 'fixed':
        return isSovereign
          ? `${base} top-0 right-0 bottom-0 w-96 rounded-l-sui border-l border-slate-200`
          : `${base} top-0 right-0 bottom-0 w-96 rounded-l-xl border-l border-gray-100`;
      case 'floating':
        return isSovereign
          ? `${base} bottom-6 right-6 w-96 h-[600px] rounded-sui`
          : `${base} bottom-6 right-6 w-96 h-[600px] rounded-2xl border border-gray-100`;
      default:
        return base;
    }
  };

  if (!isOpen) return null;

  const PanelWrapper = isSovereign ? motion.div : 'div';
  const panelProps = isSovereign
    ? {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: 'easeOut' as const },
      }
    : {};

  // In fullscreen, header/footer must never collapse — use flex basis
  const isFullscreen = layoutMode === 'fullscreen';
  const headerStyle = isFullscreen ? { flex: '0 0 56px', minHeight: 56 } : undefined;
  const visualizerStyle = isFullscreen ? { flex: '0 0 100px', minHeight: 100 } : undefined;
  const footerStyle = isFullscreen ? { flex: '0 0 120px', minHeight: 120 } : undefined;

  return (
    <PanelWrapper
      {...panelProps}
      className={`${getContainerClasses()} ${className}`}
      style={{ zIndex }}
    >
      {/* 1. TOP HEADER (always visible; in fullscreen fixed flex basis so it never disappears) */}
      <div
        style={headerStyle}
        className={`flex items-center justify-between px-4 py-3 flex-shrink-0 min-h-[56px] ${
          isSovereign
            ? 'bg-[#0F172A] border-b border-slate-700/80'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
        }`}
      >
        {/* Left: owner mode back, or Menu (single entry to overlay) */}
        <div className="flex items-center shrink-0">
          {ownerMode && onExitOwnerMode ? (
            <button
              onClick={onExitOwnerMode}
              className={isSovereign ? "p-2 hover:bg-white/10 rounded-xl text-white transition-colors flex items-center gap-1.5 text-sm" : "p-2 hover:bg-slate-50/20 rounded-lg text-white transition-colors flex items-center gap-1.5 text-sm"}
              title="Back to conversation"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (shellMode === 'locked') {
                  // Not authenticated on a claimed site — show Nova sign-in gate
                  setNovaGateMode('signin');
                  setShowNovaGate(true);
                } else {
                  setShowMenuOverlay((v) => !v);
                }
              }}
              className={isSovereign ? "p-2 hover:bg-white/10 rounded-xl text-white transition-colors" : "p-2 hover:bg-slate-50/20 rounded-lg text-white transition-colors"}
              title={shellMode === 'locked' ? 'Sign In' : 'Menu'}
              data-concierge-menu="overlay"
              aria-expanded={showMenuOverlay}
              aria-haspopup="dialog"
              aria-controls="concierge-menu-overlay"
            >
              {shellMode === 'locked' ? <Lock size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          )}
        </div>
        {/* Center: Command Center title when owner mode, else Clear Voice logo + status */}
        <div className="flex items-center justify-center gap-2 flex-1 min-w-0">
          {ownerMode ? (
            <span className="text-white font-semibold flex items-center gap-2">
              <Bot size={20} className="text-indigo-400" />
              Command Center
            </span>
          ) : (
            <>
              <img src={headerLogo} alt="Clear Voice AI" className={isSovereign ? 'h-10 w-auto object-contain' : 'h-11 w-auto object-contain'} />
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                connectionStatus === 'connected'
                  ? (isSovereign ? 'bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50' : 'bg-green-400 animate-pulse shadow-lg shadow-green-400/50')
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-400 animate-pulse'
                  : 'bg-red-400'
              }`} />
            </>
          )}
        </div>
        {/* Right: layout cycle + explicit close */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onCycleLayout && (
            <button
              onClick={onCycleLayout}
              className={isSovereign ? "p-2 hover:bg-white/10 rounded-xl text-white transition-colors" : "p-2 hover:bg-slate-50/20 rounded-lg text-white transition-colors"}
              title="Toggle Layout"
            >
              {layoutMode === 'fullscreen' ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={isSovereign ? "p-2 hover:bg-white/10 rounded-xl text-white transition-colors" : "p-2 hover:bg-slate-50/20 rounded-lg text-white transition-colors"}
            title="Close Chat"
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 2. VISUALIZER (Nova Verify: solid dark band) */}
      <div
        style={visualizerStyle}
        className={`flex flex-col items-center justify-center flex-shrink-0 min-h-[100px] relative overflow-hidden ${
          isSovereign ? 'bg-slate-900 border-b border-slate-700/80' : 'bg-gradient-to-b from-gray-900 to-gray-800'
        }`}
      >
        {/* Voice Wave Visualization with Tier-Based Colors */}
        <div className="flex items-center gap-1 h-16 mb-2">
          {[...Array(32)].map((_, i) => {
            const clearVoice = currentVoiceConfig.mode === 'clear_voice';
            const baseColor = isSovereign
              ? (clearVoice ? (isRecording ? 'bg-emerald-400' : isProcessing ? 'bg-emerald-400' : 'bg-slate-600') : (isRecording ? 'bg-indigo-400' : isProcessing ? 'bg-indigo-400' : 'bg-slate-600'))
              : (clearVoice ? (isRecording ? 'bg-green-400' : isProcessing ? 'bg-emerald-400' : 'bg-gray-600') : (isRecording ? 'bg-blue-400' : isProcessing ? 'bg-purple-400' : 'bg-gray-600'));
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-100 ${baseColor}`}
                style={{
                  height: isRecording
                    ? `${Math.max(4, volumeLevel * 200 * (1 + Math.sin((i + animationTick) / 2)))}px`
                    : isProcessing
                    ? `${20 + Math.sin((i + animationTick * 0.5) * 0.5) * 16}px`
                    : '8px',
                  opacity: isRecording || isProcessing ? 0.8 : 0.3
                }}
              />
            );
          })}
        </div>
        <div className="relative">
          {(isRecording || isProcessing) && (
            <div className={`absolute inset-0 blur-xl opacity-60 ${
              isSovereign
                ? (currentVoiceConfig.mode === 'clear_voice' ? 'bg-emerald-500' : 'bg-indigo-500')
                : currentVoiceConfig.mode === 'clear_voice'
                ? (isRecording ? 'bg-green-500' : 'bg-emerald-500')
                : (isRecording ? 'bg-blue-500' : 'bg-purple-500')
            }`} />
          )}
          <p className={`text-[10px] font-semibold tracking-widest uppercase relative z-10 ${
            isSovereign
              ? (isRecording || isProcessing ? 'text-indigo-300' : 'text-slate-400')
              : isRecording
              ? (currentVoiceConfig.mode === 'clear_voice' ? 'text-green-300' : 'text-blue-300')
              : isProcessing
              ? (currentVoiceConfig.mode === 'clear_voice' ? 'text-emerald-300' : 'text-purple-300')
              : 'text-slate-500'
          }`}>
            {isRecording ? '● LISTENING' : isProcessing ? '◐ THINKING' : 'READY'}
          </p>
        </div>
      </div>

      {/* Demo "Is this your business?" claim banner — only for demo/provisioned sites when not dismissed */}
      {(shellMode === 'demo_claimable') && !claimBannerDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 1.5 }}
          className="shrink-0 flex items-center justify-between gap-2 px-4 py-2 bg-indigo-600/10 border-b border-indigo-500/20"
        >
          <span className="text-xs text-indigo-300">
            Is this your business? <span className="text-indigo-200 font-medium">Claim it and activate your AI agent.</span>
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { setNovaGateMode('claim'); setShowNovaGate(true); setShowMenuOverlay(false); }}
              className="px-3 py-1 text-xs font-medium bg-indigo-500 hover:bg-indigo-400 text-white rounded-full transition-colors"
            >
              Claim →
            </button>
            <button
              onClick={() => setClaimBannerDismissed(true)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </motion.div>
      )}

      {/* 3. CONTENT WINDOW: outer constrains height so overlay never covers header/footer. Inner is the only scroll container. */}
      <div
        className={`flex-1 min-h-0 flex flex-col border-t overflow-hidden relative ${
          isSovereign ? 'bg-white border-slate-200' : 'bg-slate-50 border-gray-200'
        }`}
        style={{ minHeight: 0 }}
      >
        <div
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden concierge-content-scroll relative"
          style={{ WebkitOverflowScrolling: 'touch', minHeight: 0 }}
        >
        {/* Nova Gate overlay: claim or sign-in IDV flow */}
        {showNovaGate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-[#0F172A]"
          >
            <NovaGate
              siteConfigId={business.id}
              businessName={business.name}
              placeTypes={business.types ?? []}
              mode={novaGateMode}
              onVerified={handleNovaVerified}
              onCancel={() => setShowNovaGate(false)}
            />
          </motion.div>
        )}

        {/* Menu overlay: strictly inside this content box so panel header and footer stay visible. */}
        {showMenuOverlay && (
          <motion.div
            id="concierge-menu-overlay"
            role="dialog"
            aria-label="Menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`absolute inset-0 z-40 flex flex-col overflow-hidden ${isSovereign ? 'bg-[#0F172A]' : 'bg-slate-900'} backdrop-blur-sm`}
            style={{ top: 0, left: 0, right: 0, bottom: 0 }}
          >
            {/* Header row: "AI ADVISOR" label + close — no separate "Menu" row */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-700/60 shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">AI Advisor</span>
              <button
                type="button"
                onClick={() => { setShowMenuOverlay(false); setMenuSubView(null); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close menu"
              >
                <X size={15} />
              </button>
            </div>

            {/* Sub-view overlays — slide in over the main menu list */}
            {menuSubView && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 z-50 flex flex-col bg-[#0F172A] overflow-hidden"
              >
                {/* ── SHARED back header helper ─────────────────── */}
                {/* Each sub-panel uses this pattern: back btn + title + optional save */}

                {/* NAME & VOICE sub-panel */}
                {menuSubView === 'id_name_voice' && (
                  <div className="flex flex-col h-full">
                    <div className="px-4 pt-4 pb-3 border-b border-slate-700/50 flex items-center gap-3 shrink-0">
                      <button type="button" onClick={() => setMenuSubView(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10"><ArrowLeft size={15} /></button>
                      <Mic size={16} className="text-indigo-400" />
                      <span className="text-white font-semibold text-sm">Name &amp; Voice</span>
                      <div className="flex-1" />
                      <button type="button" disabled={!menuAgent || menuSaving} onClick={async () => {
                        if (!menuAgent) return;
                        setMenuSaving(true);
                        try {
                          await fetch(`/api/agents/${menuAgent.id}`, { method: 'PATCH', headers: authHeaders(), credentials: 'include', body: JSON.stringify({ name: menuAgent.name, voiceName: menuAgentVoiceName }) });
                          setMenuSaved(true); setTimeout(() => setMenuSaved(false), 2000);
                        } finally { setMenuSaving(false); }
                      }} className={`px-3 py-1.5 rounded-sui text-xs font-medium transition-colors ${menuSaved ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-40'}`}>
                        {menuSaving ? '…' : menuSaved ? 'Saved!' : 'Save'}
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {!menuAgent && <div className="flex items-center justify-center py-10"><div className="w-8 h-8 rounded-full border-2 border-indigo-500/40 border-t-indigo-500 animate-spin" /></div>}
                      {menuAgent && (
                        <>
                          <div>
                            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Agent Name</label>
                            <input
                              value={menuAgent.name || ''}
                              onChange={e => setMenuAgent((a: any) => a ? { ...a, name: e.target.value } : a)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
                              placeholder="e.g. Aria — Airport Concierge"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400 mb-1.5 block font-medium">Voice</label>
                            <VoiceSelector selectedVoice={menuAgentVoiceName} onVoiceChange={setMenuAgentVoiceName} mode="compact" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* BUSINESS sub-panel */}
                {menuSubView === 'id_business' && (
                  <div className="flex flex-col h-full">
                    <div className="px-4 pt-4 pb-3 border-b border-slate-700/50 flex items-center gap-3 shrink-0">
                      <button type="button" onClick={() => setMenuSubView(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10"><ArrowLeft size={15} /></button>
                      <Building2 size={16} className="text-indigo-400" />
                      <span className="text-white font-semibold text-sm">Business</span>
                    </div>

                    {/* Two-column: info left, map canvas right */}
                    <div className="flex-1 flex min-h-0">
                      {/* Left: business info */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 md:max-w-[300px] md:border-r md:border-slate-700/40">
                        {business.heroImageUrl && (
                          <div className="w-full h-32 rounded-sui overflow-hidden border border-slate-700/40">
                            <img src={business.heroImageUrl} alt={business.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="bg-slate-800/60 rounded-sui border border-slate-700/40 p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0"><Building2 size={16} className="text-indigo-400" /></div>
                            <div className="min-w-0">
                              <p className="text-white font-bold text-base leading-tight">{business.name}</p>
                              {business.address && <p className="text-slate-400 text-xs mt-0.5">{business.address}</p>}
                            </div>
                          </div>
                          {business.rating && (
                            <div className="flex items-center gap-2">
                              <div className="flex gap-0.5">{[...Array(5)].map((_,i) => (
                                <svg key={i} className={`w-3.5 h-3.5 ${i < Math.round(business.rating!) ? 'fill-amber-400' : 'fill-slate-700'}`} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                              ))}</div>
                              <span className="text-amber-400 text-xs font-semibold">{business.rating.toFixed(1)}</span>
                              {business.userRatingsTotal && <span className="text-slate-500 text-xs">({business.userRatingsTotal.toLocaleString()} reviews)</span>}
                            </div>
                          )}
                          {business.phone && <div className="flex items-center gap-2"><Phone size={12} className="text-slate-500" /><span className="text-slate-300 text-xs">{business.phone}</span></div>}
                          {business.types && business.types.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {business.types.slice(0,6).map((t,i) => (
                                <span key={i} className="px-2.5 py-1 rounded-full bg-slate-700/60 border border-slate-600/40 text-slate-300 text-[10px] capitalize">{t.replace(/_/g,' ')}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Hours */}
                        {(() => {
                          const hrs = Array.isArray(business.hours) ? business.hours as string[] : (business.hours ? [business.hours as string] : []);
                          return hrs.length > 0 ? (
                            <div className="bg-slate-800/60 rounded-sui border border-slate-700/40 p-4">
                              <p className="text-white text-sm font-semibold mb-2">Hours</p>
                              <ul className="space-y-1.5">{hrs.map((h,i) => { const p = h.split(': '); return (<li key={i} className="flex justify-between text-xs py-1 border-b border-slate-700/40 last:border-0"><span className="text-slate-400">{p[0]}</span><span className="text-slate-200 font-medium">{p[1]||'Closed'}</span></li>); })}</ul>
                            </div>
                          ) : null;
                        })()}
                        {/* Mobile map (shown below info on small screens) */}
                        <div className="md:hidden w-full h-52 rounded-sui overflow-hidden border border-slate-700/40">
                          <BusinessMapEmbed lat={business.lat} lng={business.lng} name={business.name} address={business.address} />
                        </div>
                      </div>

                      {/* Right: featured map canvas (desktop only) */}
                      <div className="hidden md:block flex-1 relative">
                        <BusinessMapEmbed lat={business.lat} lng={business.lng} name={business.name} address={business.address} />
                      </div>
                    </div>
                  </div>
                )}

                {/* ROLE sub-panel */}
                {menuSubView === 'id_role' && (
                  <div className="flex flex-col h-full">
                    <div className="px-4 pt-4 pb-3 border-b border-slate-700/50 flex items-center gap-3 shrink-0">
                      <button type="button" onClick={() => setMenuSubView(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10"><ArrowLeft size={15} /></button>
                      <Bot size={16} className="text-indigo-400" />
                      <span className="text-white font-semibold text-sm">Role</span>
                      <div className="flex-1" />
                      <button type="button" disabled={!menuAgent || menuSaving} onClick={async () => {
                        if (!menuAgent) return;
                        setMenuSaving(true);
                        try {
                          await fetch(`/api/agents/${menuAgent.id}`, { method: 'PATCH', headers: authHeaders(), credentials: 'include', body: JSON.stringify({ systemPrompt: menuSysPrompt.ownerIdentity, operationalMode: menuSysPrompt.operationalMode, noDriftMode: menuNoDriftMode }) });
                          setMenuSaved(true); setTimeout(() => setMenuSaved(false), 2000);
                        } finally { setMenuSaving(false); }
                      }} className={`px-3 py-1.5 rounded-sui text-xs font-medium transition-colors ${menuSaved ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-40'}`}>
                        {menuSaving ? '…' : menuSaved ? 'Saved!' : 'Save'}
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {!menuAgent && <div className="flex items-center justify-center py-10"><div className="w-8 h-8 rounded-full border-2 border-indigo-500/40 border-t-indigo-500 animate-spin" /></div>}
                      {menuAgent && (() => {
                        // No-Drift locked modes have hardcoded ARCH profiles
                        const NO_DRIFT_MODES = new Set(['EMERGENCY', 'CUSTOMER_SERVICE']);
                        const ARCH_OVERRIDES: Record<string, { acknowledge: number; reflect: number; context: number; handoff: number; responseWindowSeconds: number }> = {
                          EMERGENCY:        { acknowledge: 2,  reflect: 0, context: 0, handoff: 3, responseWindowSeconds: 7  },
                          CUSTOMER_SERVICE: { acknowledge: 3,  reflect: 1, context: 2, handoff: 2, responseWindowSeconds: 15 },
                        };
                        const selectedMode = menuSysPrompt.operationalMode;
                        const isNoDriftMode = NO_DRIFT_MODES.has(selectedMode);
                        const lockedArch = ARCH_OVERRIDES[selectedMode];
                        const MODE_OPTIONS = [
                          { value: 'SAFE',             label: 'Safe Mode',           desc: 'Discussion only. No tasks, no PII.' },
                          { value: 'CONCIERGE',        label: 'Concierge',           desc: 'Assess intent and route customers.' },
                          { value: 'RECEPTIONIST',     label: 'Receptionist',        desc: 'Intake & data collection.' },
                          { value: 'SALES',            label: 'Sales',               desc: 'Catalog, quotes, shopping cart.' },
                          { value: 'CASHIER',          label: 'Cashier',             desc: 'Payment capture & secure links.' },
                          { value: 'CUSTOMER_SUPPORT', label: 'Customer Support',    desc: 'Account access — requires OTP.' },
                          { value: 'MANAGER',          label: 'Manager',             desc: 'Oversight & cross-agent approval.' },
                          { value: 'RESEARCH',         label: 'Research',            desc: 'Read-only discovery.' },
                          { value: 'CODING',           label: 'Coding',              desc: 'Write/execute in designated folders.' },
                          { value: 'REVIEW',           label: 'Review',              desc: 'Read/annotate — no commits.' },
                          { value: 'EMERGENCY',        label: '🚨 Emergency Response', desc: 'No-Drift locked. A:2 R:0 C:0 H:3 · 7s window.' },
                          { value: 'CUSTOMER_SERVICE', label: '🎯 Customer Service', desc: 'No-Drift locked. A:3 R:1 C:2 H:2 · 15s window.' },
                        ];
                        return (
                          <>
                            {/* Mode selector */}
                            <div>
                              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Operational Mode</label>
                              <select
                                value={selectedMode}
                                onChange={e => {
                                  const v = e.target.value;
                                  setMenuSysPrompt(p => ({ ...p, operationalMode: v }));
                                  // Auto-enable No-Drift when a locked mode is selected
                                  if (NO_DRIFT_MODES.has(v)) setMenuNoDriftMode(true);
                                }}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                              >
                                {MODE_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                              </select>
                              {/* Mode description */}
                              {(() => {
                                const m = MODE_OPTIONS.find(x => x.value === selectedMode);
                                return m ? <p className="text-[11px] text-slate-500 mt-1">{m.desc}</p> : null;
                              })()}
                            </div>

                            {/* No-Drift Lock section */}
                            <div className={`rounded-sui border p-3 transition-colors ${isNoDriftMode ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800/40 border-slate-700/60'}`}>
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <Lock size={13} className={isNoDriftMode ? 'text-red-400' : 'text-slate-500'} />
                                  <span className={`text-xs font-semibold ${isNoDriftMode ? 'text-red-300' : 'text-slate-300'}`}>
                                    No-Drift Mode
                                  </span>
                                  {isNoDriftMode && (
                                    <span className="text-[10px] font-mono bg-red-500/20 text-red-300 border border-red-500/30 rounded px-1.5 py-0.5">LOCKED BY MODE</span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  disabled={isNoDriftMode}
                                  onClick={() => setMenuNoDriftMode(v => !v)}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${menuNoDriftMode ? 'bg-red-500' : 'bg-slate-600'} ${isNoDriftMode ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${menuNoDriftMode ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                                </button>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                                {isNoDriftMode
                                  ? 'This mode always locks the ARCH profile. The agent cannot drift from the settings below.'
                                  : 'When enabled, locks this agent to its current ARCH profile. Prevents behavioral drift from contextual or conversational pressure.'}
                              </p>

                              {/* Locked ARCH preview — shown for No-Drift locked modes */}
                              {isNoDriftMode && lockedArch && (
                                <div className="mt-3 pt-3 border-t border-red-500/20">
                                  <p className="text-[10px] font-black text-red-400/70 uppercase tracking-[0.3em] mb-2">Locked ARCH Profile</p>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {([
                                      { key: 'acknowledge', label: 'A — Acknowledge', val: lockedArch.acknowledge, color: 'bg-indigo-500' },
                                      { key: 'reflect',     label: 'R — Reflect',     val: lockedArch.reflect,     color: 'bg-violet-500' },
                                      { key: 'context',     label: 'C — Context',     val: lockedArch.context,     color: 'bg-emerald-500' },
                                      { key: 'handoff',     label: 'H — Handoff',     val: lockedArch.handoff,     color: 'bg-amber-500' },
                                    ] as const).map(({ key, label, val, color }) => (
                                      <div key={key} className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] text-slate-500">{label}</span>
                                          <span className="font-mono text-[10px] text-slate-400">{val}</span>
                                        </div>
                                        <div className="h-1 rounded-full bg-slate-700 overflow-hidden">
                                          <div className={`h-full ${color} rounded-full opacity-70`} style={{ width: `${val}%` }} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <span className="text-[10px] text-slate-500">Response Window</span>
                                    <span className="font-mono text-[11px] font-bold text-red-300">{lockedArch.responseWindowSeconds}s</span>
                                    {selectedMode === 'EMERGENCY' && (
                                      <span className="text-[10px] text-red-400/80 italic">— triage speed</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Identity fields */}
                            <div>
                              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Agent Identity &amp; Purpose</label>
                              <p className="text-[11px] text-slate-500 mb-2">Describe who this agent is, who they represent, and their primary job.</p>
                              <textarea value={menuSysPrompt.ownerIdentity} onChange={e => setMenuSysPrompt(p => ({ ...p, ownerIdentity: e.target.value }))} rows={5}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none"
                                placeholder={`e.g. You are Aria, the AI Concierge for ${business.name}. You represent the airport and assist travelers with gates, delays, lounges, and amenities.`} />
                            </div>
                            <div>
                              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Loyalty Statement</label>
                              <textarea value={menuSysPrompt.loyaltyStatement} onChange={e => setMenuSysPrompt(p => ({ ...p, loyaltyStatement: e.target.value }))} rows={3}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none"
                                placeholder="What makes this business special and worth recommending?" />
                            </div>
                            <div>
                              <label className="text-xs text-slate-400 mb-1.5 block font-medium">Owner Priorities</label>
                              <textarea value={menuSysPrompt.ownerPriorities} onChange={e => setMenuSysPrompt(p => ({ ...p, ownerPriorities: e.target.value }))} rows={3}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none"
                                placeholder="Top 3 things this agent must always accomplish in every conversation." />
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* TASKS sub-panel */}
                {menuSubView === 'id_tasks' && siteConfigId && (
                  <TaskOrderEditor siteConfigId={siteConfigId} onBack={() => setMenuSubView(null)} />
                )}

                {/* SKILLS sub-panel — read-only capability registry */}
                {menuSubView === 'id_skills' && (
                  <div className="flex flex-col h-full">
                    <div className="px-4 pt-4 pb-3 border-b border-slate-700/50 flex items-center gap-3 shrink-0">
                      <button type="button" onClick={() => setMenuSubView(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10"><ArrowLeft size={15} /></button>
                      <Zap size={16} className="text-indigo-400" />
                      <span className="text-white font-semibold text-sm">Skills</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {(() => {
                        type ToolEntry = { name: string; label: string; desc: string; cat: string };
                        const TOOLS: ToolEntry[] = [
                          { name:'query_knowledge_library', label:'Knowledge Library', desc:'Search uploaded docs, FAQs, and policies to answer questions accurately.', cat:'Knowledge' },
                          { name:'get_business_details',    label:'Business Details',  desc:'Fetch live place data — hours, address, rating, phone — from Google Places.', cat:'Knowledge' },
                          { name:'get_business_reviews',    label:'Reviews',           desc:'Pull customer reviews and surface sentiment on demand.', cat:'Knowledge' },
                          { name:'get_business_intelligence', label:'Business Intelligence', desc:'Generate SWOT briefs from review data.', cat:'Knowledge' },
                          { name:'search_crm',    label:'CRM Lookup',    desc:'Identify returning customers by phone or email silently.', cat:'CRM' },
                          { name:'qualify_lead',  label:'Lead Qualifier', desc:'Score inbound leads 1–10 using NBAT signals.', cat:'CRM' },
                          { name:'book_meeting',  label:'Book Meeting',   desc:'Schedule appointments for qualified leads.', cat:'CRM' },
                          { name:'generate_quote',label:'Generate Quote', desc:'Create structured quotes from the conversation scope.', cat:'CRM' },
                          { name:'get_booking_and_pricing_info', label:'Pricing & Booking', desc:'Surface service prices and direct to booking flows.', cat:'Commerce' },
                          { name:'apply_discount',   label:'Apply Discount',  desc:'Validate and apply promos without announcing the check.', cat:'Commerce' },
                          { name:'stripe_checkout',  label:'Stripe Checkout', desc:'Send live payment links on verbal agreement.', cat:'Commerce' },
                          { name:'manage_pricing_plans', label:'Pricing Plans', desc:'View, add, or edit service packages and tiers.', cat:'Commerce' },
                          { name:'show_canvas',          label:'Shared Canvas', desc:'Push rich content — menus, tables, schedules — to the shared screen.', cat:'Canvas' },
                          { name:'search_local_business', label:'Map Search',   desc:'Find and display nearby businesses on an interactive map.', cat:'Canvas' },
                          { name:'send_onboarding_email',  label:'Onboarding Email',  desc:'Send welcome kits after successful payment.', cat:'Ops' },
                          { name:'compile_knowledge_base', label:'Compile Knowledge', desc:'Analyze reviews to produce a structured knowledge base.', cat:'Ops' },
                          { name:'ingest_serpapi_reviews', label:'Harvest Reviews',   desc:'Paginate through the full Google Maps review corpus.', cat:'Ops' },
                        ];
                        const catOrder = ['Knowledge','CRM','Commerce','Canvas','Ops'];
                        const catColors: Record<string, { badge: string; dot: string }> = {
                          Knowledge:{ badge:'bg-indigo-500/10 border-indigo-500/20 text-indigo-300', dot:'bg-indigo-400' },
                          CRM:      { badge:'bg-emerald-500/10 border-emerald-500/20 text-emerald-300', dot:'bg-emerald-400' },
                          Commerce: { badge:'bg-amber-500/10 border-amber-500/20 text-amber-300', dot:'bg-amber-400' },
                          Canvas:   { badge:'bg-violet-500/10 border-violet-500/20 text-violet-300', dot:'bg-violet-400' },
                          Ops:      { badge:'bg-rose-500/10 border-rose-500/20 text-rose-300', dot:'bg-rose-400' },
                        };
                        return catOrder.map(cat => {
                          const tools = TOOLS.filter(t => t.cat === cat);
                          const c = catColors[cat];
                          return (
                            <div key={cat}>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold mb-2 border ${c.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{cat}
                              </span>
                              <div className="grid grid-cols-1 gap-1.5">
                                {tools.map(tool => (
                                  <div key={tool.name} className="flex items-start gap-2.5 bg-slate-900/50 rounded-xl border border-slate-700/30 px-3 py-2">
                                    <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                                    <div><p className="text-slate-200 text-xs font-semibold leading-tight">{tool.label}</p><p className="text-slate-500 text-[11px] leading-relaxed mt-0.5">{tool.desc}</p></div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                {/* INTEGRATIONS sub-panel */}
                {menuSubView === 'integrations' && (
                  <div className="flex flex-col h-full">
                    <div className="px-4 pt-4 pb-3 border-b border-slate-700/50 flex items-center gap-3 shrink-0">
                      <button type="button" onClick={() => setMenuSubView(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10"><ArrowLeft size={15} /></button>
                      <Network size={16} className="text-amber-400" />
                      <span className="text-white font-semibold text-sm">Integrations</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {[
                        { name:'Gemini Live',          icon:'🤖', status:'Active',    desc:'Native multimodal voice + text AI engine. Powers all agent conversations.', color:'emerald' },
                        { name:'Google Maps Grounding', icon:'🗺️', status:'Active',    desc:'Real-time place data, maps, directions, and location search.', color:'emerald' },
                        { name:'SerpAPI',               icon:'🔍', status:'Active',    desc:'Google Maps review harvesting and competitive intelligence.', color:'emerald' },
                        { name:'Google Places API',     icon:'📍', status:'Active',    desc:'Business details, photos, hours, and ratings via Places API.', color:'emerald' },
                      ].map(integration => (
                        <div key={integration.name} className="bg-slate-800/60 rounded-sui border border-slate-700/40 p-4 flex items-start gap-3">
                          <span className="text-xl shrink-0 mt-0.5">{integration.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-white text-sm font-semibold">{integration.name}</p>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                integration.color === 'emerald' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-slate-700/60 border-slate-600/40 text-slate-400'
                              }`}>{integration.status}</span>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed">{integration.desc}</p>
                          </div>
                        </div>
                      ))}
                      <p className="text-slate-600 text-xs text-center pt-2">API keys are managed via platform settings. Contact support to add new integrations.</p>
                    </div>
                  </div>
                )}

                {/* ROUTING sub-panel */}
                {menuSubView === 'routing' && (
                  <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="px-4 pt-4 pb-3 border-b border-slate-700/50 flex items-center gap-3 shrink-0">
                      <button type="button" onClick={() => setMenuSubView(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10"><ArrowLeft size={15} /></button>
                      <Link2 size={16} className="text-sky-400" />
                      <span className="text-white font-semibold text-sm">Routing</span>
                    </div>

                    {/* Two-column body: left controls, right QR canvas */}
                    <div className="flex-1 flex min-h-0">
                      {/* Left: controls */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 md:max-w-[300px] md:border-r md:border-slate-700/40">
                        {/* Share URL */}
                        {shareUrl && (
                          <div className="bg-slate-800/60 rounded-sui border border-slate-700/40 p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Share2 size={13} className="text-sky-400" />
                              <p className="text-white text-xs font-semibold">Sharing URL</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 bg-slate-900/60 rounded-lg px-2 py-1.5 text-[10px] text-indigo-300 font-mono truncate">{shareUrl}</code>
                              <button type="button" onClick={() => { navigator.clipboard.writeText(shareUrl); }} className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-[10px] text-slate-300 hover:text-white transition-colors">
                                <Copy size={10} />Copy
                              </button>
                            </div>
                            <button type="button" onClick={() => { setShowShareOverlay(true); setMenuSubView(null); }} className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-300 text-[10px] hover:bg-sky-500/20 transition-colors">
                              <Share2 size={11} />Open Share Options
                            </button>
                          </div>
                        )}
                        {/* External links */}
                        {websiteUrl && (
                          <div className="bg-slate-800/60 rounded-sui border border-slate-700/40 p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <ExternalLink size={13} className="text-sky-400" />
                              <p className="text-white text-xs font-semibold">External Links</p>
                            </div>
                            <div className="space-y-1.5">
                              <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-700/50 border border-slate-600/40 text-slate-200 text-xs hover:border-sky-500/30 hover:text-white transition-colors">
                                <Globe size={12} className="text-slate-400" /><span>Website</span><ExternalLink size={10} className="ml-auto text-slate-500" />
                              </a>
                              <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-700/50 border border-slate-600/40 text-slate-200 text-xs hover:border-sky-500/30 hover:text-white transition-colors">
                                <LayoutDashboard size={12} className="text-slate-400" /><span>Online Store</span><ExternalLink size={10} className="ml-auto text-slate-500" />
                              </a>
                            </div>
                          </div>
                        )}
                        {/* QR Network (shadow telecom routes) */}
                        {siteConfigId && siteConfigId !== 'platform_landing' && (
                          <div className="bg-slate-800/60 rounded-sui border border-slate-700/40 p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <QrCode size={13} className="text-sky-400" />
                              <p className="text-white text-xs font-semibold">QR Network</p>
                            </div>
                            <QRRoutesManager
                              siteConfigId={siteConfigId}
                              siteSlug={publicSlug ?? undefined}
                            />
                          </div>
                        )}
                        {!publicSlug && !shareUrl && !websiteUrl && !siteConfigId && (
                          <p className="text-slate-500 text-sm text-center py-8">No routing configured for this agent yet.</p>
                        )}
                      </div>

                      {/* Right: featured QR canvas (hidden on mobile) */}
                      <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-5 px-8 py-6">
                        {publicSlug ? (
                          <>
                            <div className="rounded-2xl overflow-hidden bg-white p-4 shadow-[0_0_60px_rgba(99,102,241,0.12)] border border-sky-500/20">
                              <img
                                src={`/qr/img/${encodeURIComponent(publicSlug)}`}
                                alt="QR code for this agent"
                                className="w-56 h-56 object-contain"
                              />
                            </div>
                            <div className="text-center max-w-xs">
                              <p className="text-white font-bold text-base leading-tight">{business.name}</p>
                              <p className="text-slate-500 text-xs mt-1">Scan to open the AI agent</p>
                              <p className="text-sky-400 text-[10px] mt-2 font-mono break-all">{shareUrl}</p>
                            </div>
                            <a
                              href={`/qr/img/${encodeURIComponent(publicSlug)}`}
                              download={`${publicSlug}-qr.png`}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs hover:text-white hover:border-sky-500/40 transition-colors"
                            >
                              <Download size={13} />Download QR Code
                            </a>
                          </>
                        ) : (
                          <div className="text-center text-slate-600">
                            <QrCode size={48} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">QR code will appear here once the agent is saved with a public slug.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* COMMUNICATION sub-panel — Full Telephony Panel + SMS */}
                {menuSubView === 'communication' && (
                  <div className="flex flex-col h-full">
                    <div className="px-4 pt-4 pb-3 border-b border-slate-700/50 flex items-center gap-3 shrink-0">
                      <button type="button" onClick={() => setMenuSubView(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10"><ArrowLeft size={15} /></button>
                      <Phone size={16} className="text-rose-400" />
                      <span className="text-white font-semibold text-sm">Communication</span>
                      <span className="ml-auto px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-semibold">Paid</span>
                    </div>
                    <div className="flex-1 overflow-y-auto telephony-canvas">
                      <TelephonyPanelFull siteConfigId={siteConfigId} />
                    </div>
                  </div>
                )}

                {/* DISC / ARCH sub-panel */}
                {menuSubView === 'disc' && (
                  <div className="flex flex-col h-full">
                    <div className="px-4 pt-4 pb-3 border-b border-slate-700/50 flex items-center gap-3 shrink-0">
                      <button type="button" onClick={() => setMenuSubView(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
                        <ArrowLeft size={15} />
                      </button>
                      <Sliders size={16} className="text-indigo-400" />
                      <span className="text-white font-semibold text-sm">Character (DISC)</span>
                      <div className="flex-1" />
                      <button
                        type="button"
                        disabled={!menuAgent || menuSaving}
                        onClick={async () => {
                          if (!menuAgent) return;
                          setMenuSaving(true);
                          try {
                            await fetch(`/api/agents/${menuAgent.id}`, {
                              method: 'PATCH',
                              headers: authHeaders(),
                              credentials: 'include',
                              body: JSON.stringify({ ...menuAgentDisc }),
                            });
                            setMenuSaved(true);
                            setTimeout(() => setMenuSaved(false), 2000);
                          } catch (_) {}
                          setMenuSaving(false);
                        }}
                        className={`px-3 py-1.5 rounded-sui text-xs font-medium transition-colors ${menuSaved ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-40'}`}
                      >
                        {menuSaving ? '…' : menuSaved ? 'Saved!' : 'Save'}
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                      {!menuAgent && <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/40 border-t-indigo-500 animate-spin" />
                        <p className="text-slate-400 text-xs">Setting up behavioral profile…</p>
                      </div>}
                      {menuAgent && (
                        <>
                          {/* DISC Section */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 pb-1 border-b border-slate-700/50">
                              <div className="w-5 h-5 rounded bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                                <Activity size={11} className="text-pink-400" />
                              </div>
                              <span className="text-white text-xs font-semibold">DISC Personality Matrix</span>
                              <span className="text-[10px] text-slate-500 ml-auto">tone · pacing · assertiveness</span>
                            </div>
                            {/* Radar chart */}
                            <DiscRadar data={menuAgentDisc} />
                            {/* Color-coded sliders */}
                            {([
                              { key: 'dominance',        label: 'Dominance',        color: '#ef4444', accent: 'accent-red-500' },
                              { key: 'influence',        label: 'Influence',        color: '#f59e0b', accent: 'accent-amber-500' },
                              { key: 'steadiness',       label: 'Steadiness',       color: '#10b981', accent: 'accent-emerald-500' },
                              { key: 'conscientiousness', label: 'Conscientiousness', color: '#3b82f6', accent: 'accent-blue-500' },
                            ] as const).map(({ key, label, color, accent }) => (
                              <div key={key} className="space-y-1 group">
                                <div className="flex justify-between items-end">
                                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-colors">{label}</label>
                                  <span className="text-xs font-mono font-bold" style={{ color }}>{menuAgentDisc[key as keyof typeof menuAgentDisc]}%</span>
                                </div>
                                <input
                                  type="range" min={0} max={100}
                                  value={menuAgentDisc[key as keyof typeof menuAgentDisc]}
                                  onChange={e => setMenuAgentDisc(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                                  className={`w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer ${accent}`}
                                />
                              </div>
                            ))}
                          </div>

                          {/* Profile summary */}
                          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-[11px] text-slate-400 leading-relaxed">
                            <span className="text-pink-400 font-semibold">Profile: </span>
                            High-{menuAgentDisc.dominance >= 60 ? 'D (Direct, decisive)' : menuAgentDisc.influence >= 60 ? 'I (Warm, persuasive)' : menuAgentDisc.steadiness >= 60 ? 'S (Steady, patient)' : 'C (Precise, analytical)'}.{' '}
                            Adjusts dialogue framing via ARCH — configure in Communication Style.
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Communication Style (ARCH) sub-panel */}
                {menuSubView === 'system_prompt' && (
                  <div className="flex flex-col h-full">
                    <div className="px-4 pt-4 pb-3 border-b border-slate-700/50 flex items-center gap-3 shrink-0">
                      <button type="button" onClick={() => setMenuSubView(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
                        <ArrowLeft size={15} />
                      </button>
                      <MessageSquare size={16} className="text-indigo-400" />
                      <span className="text-white font-semibold text-sm">Communication Style (ARCH)</span>
                      <div className="flex-1" />
                      <button
                        type="button"
                        disabled={!menuAgent || menuSaving}
                        onClick={async () => {
                          if (!menuAgent) return;
                          setMenuSaving(true);
                          try {
                            await fetch(`/api/agents/${menuAgent.id}`, {
                              method: 'PATCH',
                              headers: authHeaders(),
                              credentials: 'include',
                              body: JSON.stringify({ archProfile: menuAgentArch }),
                            });
                            setMenuSaved(true);
                            setTimeout(() => setMenuSaved(false), 2000);
                          } catch (_) {}
                          setMenuSaving(false);
                        }}
                        className={`px-3 py-1.5 rounded-sui text-xs font-medium transition-colors ${menuSaved ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-40'}`}
                      >
                        {menuSaving ? '…' : menuSaved ? 'Saved!' : 'Save'}
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                      {!menuAgent && <div className="flex flex-col items-center justify-center py-10 gap-3"><div className="w-8 h-8 rounded-full border-2 border-indigo-500/40 border-t-indigo-500 animate-spin" /></div>}
                      {menuAgent && (
                        <>
                          {/* ARCH sliders */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 pb-1 border-b border-slate-700/50">
                              <div className="w-5 h-5 rounded bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                                <MessageSquare size={11} className="text-indigo-400" />
                              </div>
                              <span className="text-white text-xs font-semibold">ARCH Dialogue Model</span>
                              <span className="text-[10px] text-slate-500 ml-auto">conversational framing</span>
                            </div>
                            <ArchBreakdown data={menuAgentArch} />
                            {([
                              { key: 'acknowledge', label: 'Acknowledge', color: '#8b5cf6', accent: 'accent-violet-500', hint: 'How much the agent validates before responding' },
                              { key: 'reflect',     label: 'Reflect',     color: '#06b6d4', accent: 'accent-cyan-500',   hint: 'How much it paraphrases to confirm understanding' },
                              { key: 'context',     label: 'Context',     color: '#6366f1', accent: 'accent-indigo-500', hint: 'How much background / "why" it provides' },
                              { key: 'handoff',     label: 'Handoff',     color: '#ec4899', accent: 'accent-pink-500',   hint: 'How often it guides the next step or question' },
                            ] as const).map(({ key, label, color, accent, hint }) => (
                              <div key={key} className="space-y-1 group">
                                <div className="flex justify-between items-end">
                                  <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-slate-300 transition-colors">{label}</label>
                                    <p className="text-[9px] text-slate-600 group-hover:text-slate-500">{hint}</p>
                                  </div>
                                  <span className="text-xs font-mono font-bold" style={{ color }}>{menuAgentArch[key as keyof typeof menuAgentArch]}%</span>
                                </div>
                                <input
                                  type="range" min={0} max={100}
                                  value={menuAgentArch[key as keyof typeof menuAgentArch]}
                                  onChange={e => setMenuAgentArch(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                                  className={`w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer ${accent}`}
                                />
                              </div>
                            ))}
                          </div>

                          {/* Response Window */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 pb-1 border-b border-slate-700/50">
                              <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <Zap size={11} className="text-emerald-400" />
                              </div>
                              <span className="text-white text-xs font-semibold">Response Window</span>
                              <span className="text-[10px] text-slate-500 ml-auto">dialogue pacing</span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                              Controls how long the agent speaks per turn. Short windows keep interactions crisp (call centers, emergencies). Longer windows allow for deeper advisory responses.
                            </p>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Target Duration</span>
                                <span className="text-sm font-mono font-bold text-emerald-400">{menuAgentArch.responseWindowSeconds}s</span>
                              </div>
                              <input
                                type="range" min={5} max={60} step={5}
                                value={menuAgentArch.responseWindowSeconds}
                                onChange={e => setMenuAgentArch(prev => ({ ...prev, responseWindowSeconds: Number(e.target.value) }))}
                                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                              />
                              <div className="flex justify-between text-[9px] text-slate-600 font-mono">
                                <span>5s</span>
                                <span>Emergency</span>
                                <span>·</span>
                                <span>20s Standard</span>
                                <span>·</span>
                                <span>Advisory 45s</span>
                                <span>60s</span>
                              </div>
                            </div>
                            {/* Preset buttons */}
                            <div className="grid grid-cols-4 gap-1.5">
                              {([
                                { label: 'Emergency', s: 5,  color: 'border-red-500/30 text-red-400 hover:bg-red-500/10' },
                                { label: 'Concierge', s: 15, color: 'border-slate-600 text-slate-400 hover:bg-slate-700/50' },
                                { label: 'Standard',  s: 20, color: 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10' },
                                { label: 'Advisory',  s: 45, color: 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' },
                              ] as const).map(({ label, s, color }) => (
                                <button
                                  key={label}
                                  type="button"
                                  onClick={() => setMenuAgentArch(prev => ({ ...prev, responseWindowSeconds: s }))}
                                  className={`py-1.5 rounded-lg border text-[10px] font-semibold transition-colors ${color} ${menuAgentArch.responseWindowSeconds === s ? 'ring-1 ring-white/20' : ''}`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Live preview */}
                          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-[11px] text-slate-400 leading-relaxed">
                            <span className="text-indigo-400 font-semibold">Compiled behaviour: </span>
                            {menuAgentArch.acknowledge >= 70 ? 'Strongly validating' : menuAgentArch.acknowledge >= 40 ? 'Acknowledging' : 'Direct'},{' '}
                            {menuAgentArch.context >= 70 ? 'context-rich' : menuAgentArch.context >= 40 ? 'balanced context' : 'concise'},{' '}
                            {menuAgentArch.handoff >= 60 ? 'always guiding forward' : 'paced by the user'}.{' '}
                            Targets <span className="text-emerald-400 font-mono">{menuAgentArch.responseWindowSeconds}s</span> per turn.
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Knowledge Manager sub-panel */}
                {menuSubView === 'knowledge' && siteConfigId && (
                  <KnowledgeManager
                    siteConfigId={siteConfigId}
                    onBack={() => setMenuSubView(null)}
                  />
                )}

                {/* Documents sub-panel — industry document templates from Nova Sovereign ruleset */}
                {menuSubView === 'documents' && (
                  <DocumentsPanel
                    siteConfigId={siteConfigId}
                    onBack={() => setMenuSubView(null)}
                  />
                )}

                {/* Task Order sub-panel */}
                {menuSubView === 'task_order' && siteConfigId && (
                  <TaskOrderEditor
                    siteConfigId={siteConfigId}
                    onBack={() => setMenuSubView(null)}
                  />
                )}

                {/* Voice Selector sub-panel */}
                {menuSubView === 'voice' && (
                  <div className="flex flex-col h-full">
                    <div className="px-4 pt-4 pb-3 border-b border-slate-700/50 flex items-center gap-3 shrink-0">
                      <button type="button" onClick={() => setMenuSubView(null)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
                        <ArrowLeft size={15} />
                      </button>
                      <Mic size={16} className="text-indigo-400" />
                      <span className="text-white font-semibold text-sm">Voice Persona</span>
                      <div className="flex-1" />
                      <button
                        type="button"
                        disabled={!menuAgent || menuSaving}
                        onClick={async () => {
                          if (!menuAgent) return;
                          setMenuSaving(true);
                          try {
                            await fetch(`/api/agents/${menuAgent.id}`, {
                              method: 'PATCH',
                              headers: authHeaders(),
                              credentials: 'include',
                              body: JSON.stringify({ voiceName: menuAgentVoiceName }),
                            });
                            setMenuSaved(true);
                            setTimeout(() => setMenuSaved(false), 2000);
                          } catch (_) {}
                          setMenuSaving(false);
                        }}
                        className={`px-3 py-1.5 rounded-sui text-xs font-medium transition-colors ${menuSaved ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-40'}`}
                      >
                        {menuSaving ? '…' : menuSaved ? 'Saved!' : 'Save'}
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      {!menuAgent && <div className="flex flex-col items-center justify-center py-10 gap-3"><div className="w-8 h-8 rounded-full border-2 border-indigo-500/40 border-t-indigo-500 animate-spin" /></div>}
                      {menuAgent && (
                        <VoiceSelector
                          selectedVoice={menuAgentVoiceName}
                          onVoiceChange={setMenuAgentVoiceName}
                          mode="compact"
                        />
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
              {/* ── OWNER ADVISOR SWITCHER ─────────────────────────── */}
              {showOwnerControls && (
                <section>
                  <div className="space-y-1">
                    {([
                      { role: 'concierge' as const,   icon: <MessageSquare size={16} />, label: 'Voice Concierge',  desc: 'Customer-facing agent', color: 'indigo' },
                      { role: 'biz-bot' as const,     icon: <Sparkles size={16} />,      label: 'AI Biz Bot',       desc: 'Business strategy & ops', color: 'emerald' },
                      { role: 'bot-builder' as const, icon: <Cpu size={16} />,           label: 'AI Bot Builder',   desc: 'Agent configuration guide', color: 'violet' },
                    ] as const).map(({ role, icon, label, desc, color }) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          if (ownerAgentRole === role) return;
                          setOwnerAgentRole(role);
                          setShowMenuOverlay(false);
                          // Reconnect with new role directive
                          if (clientRef.current) {
                            clientRef.current.disconnect();
                            setConnectionStatus('disconnected');
                          }
                        }}
                        className={`w-full flex items-center gap-3 rounded-sui border p-3 text-left transition-colors ${ownerAgentRole === role
                          ? color === 'emerald' ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                          : color === 'violet' ? 'bg-violet-500/15 border-violet-500/40 text-white'
                          : 'bg-indigo-500/15 border-indigo-500/40 text-white'
                          : 'border-slate-700/50 text-slate-300 hover:bg-white/5'}`}
                      >
                        <span className={ownerAgentRole === role
                          ? color === 'emerald' ? 'text-emerald-400' : color === 'violet' ? 'text-violet-400' : 'text-indigo-400'
                          : 'text-slate-500'}>{icon}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-sm leading-tight">{label}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
                        </div>
                        {ownerAgentRole === role && <Check size={14} className="ml-auto text-emerald-400 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* ── OWNER CONTROLS ─────────────────────────────────── */}
              {showOwnerControls && (
                <OwnerMenuSections
                  expandedSection={expandedSection}
                  toggleSection={toggleSection}
                  setMenuSubView={setMenuSubView}
                />
              )}

              {/* ── AVAILABLE AGENTS ───────────────────────────────── */}
              <section>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 mb-2 border-b border-slate-500/60 pb-1">Available agents</h3>
                <div className="space-y-1">
                  {availableAgents.map((a, i) => (
                    <button 
                      key={i}
                      type="button" 
                      onClick={() => {
                        setCurrentAgent(a);
                        setShowMenuOverlay(false);
                        // Force reconnect with new agent
                        if (clientRef.current) {
                          clientRef.current.disconnect();
                          setConnectionStatus('disconnected');
                        }
                      }} 
                      className={`w-full flex items-center gap-3 rounded-sui border p-3 text-left transition-colors ${currentAgent.name === a.name ? 'bg-indigo-500/20 border-indigo-500/50 text-white' : 'border-slate-500/60 text-white hover:bg-white/10'}`}
                    >
                      {a.name === 'AI Biz Bot' ? (
                        <Bot size={18} className="text-slate-300 shrink-0" />
                      ) : (
                        <MessageSquare size={18} className="text-slate-300 shrink-0" />
                      )}
                      <span className="font-medium">{a.name}</span>
                      {currentAgent.name === a.name && <Check size={16} className="ml-auto text-emerald-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              </section>
              {/* ── CUSTOMER WORKFLOW MENU (from useOSMenu) ─── Only when not in owner mode */}
              {!showOwnerControls && osMenuItems.length > 0 && (
                <section>
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 mb-2 border-b border-slate-500/60 pb-1">
                    {shellMode === 'locked' ? 'Services' : 'Quick Access'}
                  </h3>
                  <div className="space-y-1">
                    {osMenuItems.map((item) => (
                      <div key={item.id}>
                        <button
                          type="button"
                          onClick={() => item.action === 'switch_view' && item.viewId ? handleMenuAction(item.viewId) : undefined}
                          className="w-full flex items-center gap-3 rounded-sui border border-slate-600/50 p-3 text-left text-white hover:bg-white/10 transition-colors"
                        >
                          <item.icon className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-sm font-medium">{item.label}</span>
                          {item.children ? <ChevronDown className="w-3.5 h-3.5 ml-auto text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 ml-auto text-slate-500" />}
                        </button>
                        {item.children && (
                          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-700/60 pl-3">
                            {item.children.map((child) => (
                              <button
                                key={child.id}
                                type="button"
                                onClick={() => child.action === 'switch_view' && child.viewId ? handleMenuAction(child.viewId) : undefined}
                                className="w-full text-left py-2 text-sm text-slate-400 hover:text-white flex items-center gap-2 transition-colors"
                              >
                                <child.icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                {child.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* KNOWLEDGE BASE — single auth-gated menu item */}
              <section>
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      setShowMenuOverlay(false);
                      onSmsConsentClick?.() ?? onNavigate?.('/login');
                      return;
                    }
                    setShowKnowledgeOverlay(true);
                    setShowMenuOverlay(false);
                  }}
                  className="w-full flex items-center gap-3 rounded-sui border border-slate-500/60 p-3 text-left text-white hover:bg-white/10"
                >
                  <BookOpen size={18} className="text-slate-300" />
                  <span>Knowledge base</span>
                  {!isAuthenticated && <Lock size={16} className="text-slate-400 ml-auto" />}
                  {isAuthenticated && <ChevronRight size={16} className="ml-auto text-slate-400" />}
                </button>
              </section>
              {/* Links — Website / Online store; stay in chat (open in new tab) */}
              {websiteUrl && (
                <section>
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 mb-2 border-b border-slate-500/60 pb-1">Links</h3>
                  <div className="space-y-1">
                    <a href={websiteUrl} target="_blank" rel="noopener noreferrer" onClick={() => setShowMenuOverlay(false)} className="w-full flex items-center gap-3 rounded-sui border border-slate-500/60 p-3 text-left text-white hover:bg-white/10">
                      <Globe size={18} className="text-slate-300" /> <span>Website</span> <ChevronRight size={16} className="ml-auto text-slate-400" />
                    </a>
                    <a href={websiteUrl} target="_blank" rel="noopener noreferrer" onClick={() => setShowMenuOverlay(false)} className="w-full flex items-center gap-3 rounded-sui border border-slate-500/60 p-3 text-left text-white hover:bg-white/10">
                      <LayoutDashboard size={18} className="text-slate-300" /> <span>Online store</span> <ChevronRight size={16} className="ml-auto text-slate-400" />
                    </a>
                  </div>
                </section>
              )}
              <section>
                <button type="button" onClick={() => { setShowShareOverlay(true); setShowMenuOverlay(false); }} className="w-full flex items-center gap-3 rounded-sui border border-slate-500/60 p-3 text-left text-white hover:bg-white/10">
                  <Share2 size={18} className="text-slate-300" /> <span>Share</span> <ChevronRight size={16} className="ml-auto text-slate-400" />
                </button>
              </section>
            </div>
          </motion.div>
        )}

        {/* Share overlay: two-column on desktop — actions left, large QR canvas right. */}
        {showShareOverlay && (
          <motion.div
            id="concierge-share-overlay"
            role="dialog"
            aria-label="Share"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`absolute inset-0 z-40 flex flex-col overflow-hidden ${isSovereign ? 'bg-[#0F172A]' : 'bg-slate-900'}`}
            style={{ top: 0, left: 0, right: 0, bottom: 0 }}
          >
            {/* Header */}
            <div className="shrink-0 px-5 py-4 flex items-center justify-between border-b border-slate-700/60">
              <div className="flex items-center gap-2">
                <Share2 size={16} className="text-indigo-400" />
                <span className="font-semibold text-white text-sm">Share</span>
              </div>
              <button
                type="button"
                onClick={() => setShowShareOverlay(false)}
                className="px-3 py-1.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/8 transition-colors"
                aria-label="Close share"
              >
                Close
              </button>
            </div>

            {/* Body: two-column layout */}
            <div className="flex-1 flex min-h-0">
              {/* Left column — share actions */}
              <div className="w-full md:w-[280px] shrink-0 border-r border-slate-700/50 overflow-y-auto">
                <ShareButton
                  open={showShareOverlay}
                  onOpenChange={setShowShareOverlay}
                  shareUrl={shareUrl}
                  shareTitle={business.name || 'Check out this business'}
                  shareText={business.address ? `${business.name} - ${business.address}` : business.name || ''}
                  siteConfigId={siteConfigId && siteConfigId !== 'platform-landing' && siteConfigId !== 'platform_landing' && siteConfigId !== 'platform' ? siteConfigId : undefined}
                  variant="dark"
                  publicSlug={publicSlug ?? undefined}
                />
              </div>

              {/* Right column — QR canvas (hidden on mobile, shown on md+) */}
              <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-6 px-10 py-8">
                {(publicSlug || shareUrl) ? (
                  <>
                    {/* Large QR code */}
                    <div className="rounded-2xl overflow-hidden bg-white p-4 shadow-[0_0_60px_rgba(99,102,241,0.15)] border border-indigo-500/20">
                      {publicSlug ? (
                        <img
                          src={`/qr/img/${encodeURIComponent(publicSlug)}`}
                          alt="QR code to open this agent"
                          className="w-56 h-56 object-contain"
                        />
                      ) : (
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=224x224&data=${encodeURIComponent(shareUrl || '')}`}
                          alt="QR code"
                          className="w-56 h-56 object-contain"
                        />
                      )}
                    </div>
                    {/* Business name + URL */}
                    <div className="text-center max-w-xs">
                      <p className="text-white font-bold text-lg leading-tight">{business.name}</p>
                      {business.address && (
                        <p className="text-slate-500 text-xs mt-1">{business.address}</p>
                      )}
                      <p className="text-indigo-400 text-xs mt-3 font-mono break-all">{shareUrl}</p>
                    </div>
                    {/* Download QR button */}
                    {publicSlug && (
                      <a
                        href={`/qr/img/${encodeURIComponent(publicSlug)}`}
                        download={`${publicSlug}-qr.png`}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs hover:text-white hover:border-indigo-500/40 transition-colors"
                      >
                        <Download size={13} />
                        Download QR Code
                      </a>
                    )}
                  </>
                ) : (
                  <div className="text-center text-slate-600">
                    <QrCode size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No URL to share yet</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* In-chat Knowledge overlay: list docs, toggle active keys, lock for private */}
        {showKnowledgeOverlay && (
          <KnowledgeOverlay
            siteConfigId={siteConfigId && siteConfigId !== 'platform-landing' && siteConfigId !== 'platform_landing' && siteConfigId !== 'platform' && siteConfigId !== 'undefined' && siteConfigId !== '' ? siteConfigId : undefined}
            onClose={() => setShowKnowledgeOverlay(false)}
            isSovereign={variant === 'sovereign'}
          />
        )}

        {!showMenuOverlay && ownerMode && (onNavigate || embedViewsInPanel) ? (
          embeddedView ? (
            <div className="flex flex-col h-full min-h-0">
              <div className={`shrink-0 flex items-center gap-2 px-3 py-2 border-b ${isSovereign ? 'border-slate-200 bg-slate-50' : 'border-gray-200 bg-gray-50'}`}>
                <button
                  type="button"
                  onClick={() => setEmbeddedView(null)}
                  className={`flex items-center gap-1.5 text-sm font-medium ${isSovereign ? 'text-slate-700 hover:text-indigo-600' : 'text-gray-700 hover:text-indigo-600'}`}
                  data-testid="button-back-command-center"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Command Center
                </button>
              </div>
              <div className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-b-sui ${embeddedView === 'billing' ? 'bg-white' : 'bg-slate-950'}`}>
                {embeddedView === 'profile' && <ProfileContent section="profile" />}
                {embeddedView === 'operations' && <ProfileContent section="operations" />}
                {embeddedView === 'billing' && <BillingContentWithStripe />}
                {embeddedView === 'my-businesses' && <ProfileContent section="my-businesses" />}
                {embeddedView === 'reseller' && <MixingBoardContent />}
                {embeddedView === 'agent-manager' && <AgentManager siteConfigId={siteConfigId} />}
              </div>
            </div>
          ) : (
          <div className="p-4 space-y-4 overflow-y-auto">
            <p className={`text-sm ${isSovereign ? 'text-slate-600' : 'text-slate-500'}`}>
              One place for account, agents, and referral program.
            </p>
            {/* ——— OS Menu ——— */}
            <section>
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-200 pb-1">OS Menu</h3>
              <div className="space-y-1">
                {osMenuItems.map((item) => (
                  <div key={item.id}>
                    <button
                      type="button"
                      onClick={() => item.action === 'switch_view' && item.viewId ? handleMenuAction(item.viewId) : undefined}
                      className={`w-full flex items-center gap-3 rounded-sui border p-3 text-left transition-colors ${isSovereign ? 'bg-slate-50 border-slate-200 hover:bg-indigo-50/50' : 'bg-gray-50 border-gray-200 hover:bg-indigo-50/50'}`}
                    >
                      <item.icon className="w-5 h-5 text-slate-600 shrink-0" />
                      <span className="font-medium text-slate-900">{item.label}</span>
                      {item.children ? <ChevronDown className="w-4 h-4 ml-auto text-slate-400" /> : <ChevronRight className="w-4 h-4 ml-auto text-slate-400" />}
                    </button>
                    {item.children && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 pl-3">
                        {item.children.map((child) => (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => child.action === 'switch_view' && child.viewId ? handleMenuAction(child.viewId) : undefined}
                            className="w-full text-left py-2 text-sm text-slate-700 hover:text-indigo-600 flex items-center gap-2"
                          >
                            <child.icon className="w-4 h-4 text-slate-500" />
                            {child.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
          )
        ) : messages.length === 0 ? (
          <div className={`min-h-full flex flex-col items-center justify-center text-center px-8 py-8 ${isSovereign ? 'text-slate-600' : 'text-slate-400'}`}>
            {canShowTransferQr && isTransferPromoVisible ? (
              <>
                <a
                  href={qrTargetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-2xl overflow-hidden border border-slate-200 bg-white p-2 shadow-sm w-40 h-40"
                  aria-label={transferTitle}
                >
                  <img
                    src={qrImageSrc}
                    alt={transferTitle}
                    className="w-full h-full object-contain"
                  />
                </a>
                <p className={isSovereign ? 'mt-4 text-sm font-medium text-slate-700' : 'mt-4 text-sm font-medium text-slate-600'}>
                  {transferTitle}
                </p>
                <p className="text-xs mt-2 text-slate-500 max-w-xs">
                  {transferDescription}
                </p>
              </>
            ) : canShowTransferQr ? (
              <div className="py-4">
                <AIOSMark compact />
              </div>
            ) : (
              <>
                <Mic className={`w-12 h-12 mb-3 ${isSovereign ? 'text-slate-400' : 'text-slate-300'}`} />
                <p className={isSovereign ? 'text-sm font-medium text-slate-700' : 'text-sm font-medium text-slate-600'}>
                  Start talking whenever you're ready
                </p>
                <p className="text-xs mt-2 text-slate-500">
                  Voice input and AI responses appear here
                </p>
              </>
            )}
            <p className={`text-[10px] mt-4 max-w-xs uppercase tracking-wider ${isSovereign ? 'text-slate-400' : 'text-slate-300'}`}>
              Multimodal: maps, forms, catalogs
            </p>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            {messages.map((msg) => {
              const hasTool = msg.metadata?.tool_type;
              const userBubble = isSovereign
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'bg-blue-600 text-white shadow-sm';
              const assistantBubble = isSovereign
                ? (hasTool ? 'bg-slate-50 text-slate-900 border border-slate-200' : 'bg-slate-100 text-slate-900 border border-slate-200 shadow-sm')
                : (hasTool ? 'bg-gray-50 text-slate-800 border border-gray-200' : 'bg-gray-100 text-slate-800 shadow-sm');
              const systemBubble = isSovereign ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200';
              return (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`${
                    hasTool ? 'w-full' : 'max-w-[80%]'
                  } rounded-2xl px-4 py-2.5 ${
                    msg.role === 'user'
                      ? userBubble
                      : msg.role === 'assistant'
                      ? assistantBubble
                      : systemBubble
                  }`}>
                    {msg.text && (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    )}
                    
                    {/* MULTIMODAL TOOL RENDERING */}
                    {hasTool && !msg.metadata.completed && (
                      <div className="mt-3 relative">
                        <ToolRouter
                          toolType={msg.metadata.tool_type || 'loading'}
                          metadata={{ ...msg.metadata, siteConfigId }}
                          onSubmit={(value) => handleToolSubmit(msg.id, value)}
                          onCancel={() => handleToolCancel(msg.id)}
                          onTriggerSpeech={(text) => {
                            // Trigger AI speech for tour narration
                            if (clientRef.current && clientRef.current.isConnected()) {
                              clientRef.current.sendText(text);
                            }
                          }}
                          onContextUpdate={(context) => {
                            // Send context update to AI
                            if (clientRef.current && clientRef.current.isConnected()) {
                              clientRef.current.sendText(context);
                            }
                          }}
                        />
                        {showSuccessAnimation && successMessageId === msg.id && (
                          <SuccessAnimation
                            isVisible={showSuccessAnimation}
                            message="UPDATED SUCCESSFULLY"
                            onComplete={() => setShowSuccessAnimation(false)}
                            showConfetti={true}
                          />
                        )}
                      </div>
                    )}
                    
                    {/* Show corrected value after submission */}
                    {hasTool && msg.metadata.completed && msg.metadata.correctedValue && (
                      <div className={`mt-2 text-xs font-medium ${isSovereign ? 'text-emerald-600' : 'text-green-600'}`}>
                        ✓ Corrected: {msg.metadata.correctedValue}
                      </div>
                    )}
                    
                    {/* Metadata Footer (DISC, Emotion, Sentiment) */}
                    {msg.metadata && !hasTool && (
                      <div className={`mt-2 text-xs border-t pt-2 space-x-3 ${isSovereign ? 'border-slate-200 text-slate-500' : 'border-white/20 opacity-70'}`}>
                        {msg.metadata.emotion && <span>😊 {msg.metadata.emotion}</span>}
                        {msg.metadata.sentiment && <span>💭 {msg.metadata.sentiment}</span>}
                        {msg.metadata.disc && <span>🎯 {msg.metadata.disc}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
        </div>
      </div>

      {/* Demo Handoff QR — renders above the footer when triggered, not inside it */}
      {canShowTransferQr && isTransferPromoVisible && (
        <div className={`mx-4 mb-2 rounded-2xl border px-3 py-2.5 flex items-center gap-3 flex-shrink-0 ${
          isSovereign
            ? 'border-slate-700/60 bg-white/5'
            : 'border-gray-200 bg-white'
        }`}>
          <div
            className="shrink-0 block rounded-xl overflow-hidden border border-slate-300 bg-white w-14 h-14"
            aria-label={transferTitle}
          >
            <img
              src={qrImageSrc}
              alt={transferTitle}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${
              isSovereign ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {transferTitle}
            </p>
            <p className={`text-sm ${
              isSovereign ? 'text-slate-200' : 'text-slate-700'
            }`}>
              {transferDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowShareOverlay(true)}
            className={`shrink-0 inline-flex items-center justify-center rounded-xl p-2 transition-colors ${
              isSovereign
                ? 'text-slate-300 hover:text-white hover:bg-white/10'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
            title="Open share options"
            aria-label="Open share options"
          >
            <Share2 size={18} />
          </button>
        </div>
      )}

      {/* 4. BOTTOM FOOTER — carbon texture background; solid fallback when image 404 */}
      <div
        style={{
          ...footerStyle,
          ...(isSovereign ? {
            backgroundColor: 'rgb(15 23 42)',
            backgroundImage: `linear-gradient(to bottom, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.92) 100%), url(${chatFooterCarbon})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : undefined),
        }}
        className={`flex flex-col items-center justify-center gap-3 px-4 py-3 flex-shrink-0 min-h-[120px] border-t ${
          isSovereign ? 'border-slate-700/50' : 'bg-gradient-to-b from-gray-50 to-white border-gray-200'
        }`}
      >
        <div className="flex items-center justify-center gap-3 w-full">
          <button
            type="button"
            onClick={() => {
              if (canShowTransferQr) {
                setIsTransferPromoVisible((visible) => !visible);
                return;
              }

              if (isAuthenticated) {
                onHistoryClick?.() ?? onNavigate?.('/compliance-gateway');
              } else {
                onSmsConsentClick?.() ?? onNavigate?.('/login');
              }
            }}
            className={isSovereign
              ? 'relative w-[20%] h-12 flex items-center justify-center text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors'
              : 'relative w-[20%] h-12 flex items-center justify-center text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-gray-200'
            }
            title={canShowTransferQr ? (isTransferPromoVisible ? 'Hide demo handoff' : 'Show demo handoff') : (isAuthenticated ? 'Call history' : 'Sign in or register for SMS')}
            aria-label={canShowTransferQr ? (isTransferPromoVisible ? 'Hide demo handoff' : 'Show demo handoff') : (isAuthenticated ? 'Call history' : 'Sign in or register for SMS')}
          >
            {canShowTransferQr ? (
              <>
                <Menu size={16} />
                {!isTransferPromoVisible && (
                  <span className="absolute right-3 top-2 h-2 w-2 rounded-full bg-emerald-400" />
                )}
              </>
            ) : (
              <History size={16} />
            )}
          </button>

          <button
            onMouseDown={startPTT}
            onMouseUp={stopPTT}
            onMouseLeave={stopPTT}
            onTouchStart={(e) => { e.preventDefault(); startPTT(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopPTT(); }}
            disabled={connectionStatus !== 'connected'}
            className={isSovereign
              ? `relative w-[50%] min-w-[140px] max-w-[220px] h-14 rounded-2xl font-semibold text-sm transition-all duration-200 transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none overflow-hidden ${
                  isRecording
                    ? 'bg-indigo-500 text-white shadow-[0_0_24px_rgba(99,102,241,0.5)] ring-2 ring-indigo-400/50'
                    : isProcessing
                    ? 'bg-indigo-500/90 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)]'
                    : 'bg-slate-800/80 text-slate-200 border border-slate-600/80 hover:bg-slate-700/80 hover:border-indigo-500/40 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] backdrop-blur-sm'
                }`
              : `w-[50%] h-14 rounded-2xl font-semibold text-sm transition-all transform active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed select-none ${
                  isRecording
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-500/50 ring-2 ring-blue-300/50'
                    : isProcessing
                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                    : 'bg-gradient-to-r from-gray-800 to-gray-900 text-white hover:from-blue-600 hover:to-blue-700'
                }`
            }
          >
            <span className="flex items-center justify-center gap-2">
              <Mic size={20} className={isRecording ? 'animate-pulse' : ''} />
              <span className="hidden min-[380px]:inline">
                {isRecording ? 'Listening…' : isProcessing ? 'Processing…' : 'Hold to speak'}
              </span>
            </span>
          </button>

          <button
            onClick={() => {
              if (clientRef.current) {
                clientRef.current.disconnect();
                clientRef.current = null;
              }
              setTimeout(() => window.location.reload(), 300);
            }}
            className={isSovereign
              ? 'w-[20%] h-12 flex items-center justify-center text-xs font-medium text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors'
              : 'w-[20%] h-12 flex items-center justify-center text-xs font-medium text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors border border-gray-200'
            }
            title="Restart Connection"
            aria-label="Restart connection"
          >
            <RefreshCw size={16} />
          </button>
        </div>


        <div className={`flex items-center justify-between w-full text-[10px] font-medium uppercase tracking-wider ${isSovereign ? 'text-slate-400' : 'text-slate-400'}`}>
          <span>
            {currentAgent.name
              ? (currentVoiceConfig.mode === 'clear_voice' ? `⚡ ${currentAgent.name}` : `💬 ${currentAgent.name}`)
              : (currentVoiceConfig.mode === 'clear_voice' ? '⚡ Clear Voice' : '💬 Standard PTT')}
          </span>
          <span className={
            isSovereign
              ? (connectionStatus === 'connected' ? 'text-emerald-400' : connectionStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400')
              : (connectionStatus === 'connected' ? 'text-green-600' : connectionStatus === 'connecting' ? 'text-yellow-600' : 'text-red-600')
          }>
            {connectionStatus === 'connected' ? '● CONNECTED' : connectionStatus === 'connecting' ? '◐ CONNECTING' : '○ DISCONNECTED'}
          </span>
        </div>
      </div>

      {/* Voice Settings - overlay when open; fully hidden when closed (no render when !showSettings) */}
      {showSettings && (
      <VoiceSettings
        isOpen={true}
        onClose={() => setShowSettings(false)}
        contained
        currentMode={currentVoiceConfig.mode === 'clear_voice' ? 'clear_voice' : 'standard'}
        currentConfig={{
          analysis: {
            detectEmotion: currentVoiceConfig.enableAnalysis?.emotion || currentVoiceConfig.analysis?.emotion || false,
            detectSentiment: currentVoiceConfig.enableAnalysis?.sentiment || currentVoiceConfig.analysis?.sentiment || false,
            detectDISC: currentVoiceConfig.enableAnalysis?.disc || currentVoiceConfig.analysis?.disc || false
          }
        }}
        onConfigChange={(newConfig) => {
          const next = {
            ...currentVoiceConfig,
            ...newConfig,
            ...(newConfig.analysis && {
              enableAnalysis: {
                emotion: newConfig.analysis.detectEmotion ?? currentVoiceConfig.enableAnalysis.emotion,
                sentiment: newConfig.analysis.detectSentiment ?? currentVoiceConfig.enableAnalysis.sentiment,
                disc: newConfig.analysis.detectDISC ?? currentVoiceConfig.enableAnalysis.disc,
              },
            }),
          };
          setCurrentVoiceConfig(next);
          addMessage('system', 'Settings updated. Reconnecting...');
          const canPersist = siteConfigId && siteConfigId !== 'platform-landing' && siteConfigId !== 'platform_landing' && siteConfigId !== 'platform' && siteConfigId !== '';
          if (canPersist) {
            fetch(`/api/site-configs/${siteConfigId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
              voiceConfig: {
                voiceName: next.voiceName,
                analysis: {
                  detectEmotion: next.enableAnalysis.emotion,
                  detectSentiment: next.enableAnalysis.sentiment,
                  detectDISC: next.enableAnalysis.disc,
                },
              },
            }) }).catch((err) => console.warn('[ConciergePanel] Failed to persist voice config:', err));
          }
        }}
        onOpenAgentSettings={onOpenAdmin}
        siteConfigId={siteConfigId}
      />
      )}
    </PanelWrapper>
  );
};