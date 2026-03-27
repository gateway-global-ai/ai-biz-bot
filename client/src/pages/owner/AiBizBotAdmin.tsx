import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { GatewayRouterPanel } from '@/components/admin/GatewayRouterPanel';
import { AgentCreatorPanel } from '@/components/admin/AgentCreatorPanel';
import { AgentRosterPanel } from '@/components/admin/AgentRosterPanel';
import { useLocation, Link } from 'wouter';
import {
  Bot, Plus, Globe, MessageSquare, Settings, Trash2,
  Send, Loader2, ExternalLink, Code, Copy, Check, Network, Users,
  Sparkles, Clock, Star, MapPin, Phone, Zap,
  BookOpen, Image as ImageIcon, Building2,
  Activity, QrCode, Share2, ArrowLeft, BarChart3, Upload, FileText,
  Home
} from 'lucide-react';
import { GoogleWorkspacePanel } from '@/components/workspace/GoogleWorkspacePanel';
import StandardizedChatInterface from '@/components/StandardizedChatInterface';
import { QRRoutesManager } from '@/components/account/QRRoutesManager';
import { CashBoardPanel } from '@/components/account/CashBoardPanel';
import { AiBizBotDashboard } from '@/pages/owner/AiBizBotDashboard';
import type { Agent, SiteConfig } from '@shared/schema';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  addedAt: string;
  category?: string;
  topic?: string;
  documentDate?: string;
}

interface DemoLeadRow {
  id: string;
  phone: string | null;
  name: string | null;
  businessName: string;
  businessAddress: string | null;
  placeId: string | null;
  status: string;
  magicTokenUsed: boolean | null;
  demoStartedAt: string | null;
  demoReadyAt: string | null;
  createdAt: string | null;
  demoUrl: string;
  siteId: string | null;
}

function KnowledgeLibraryTab({
  siteId,
  docs,
  onUpdate,
}: {
  siteId: string;
  docs: KnowledgeDoc[];
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addDoc = async () => {
    if (!content.trim()) {
      toast({ title: 'Content required', variant: 'destructive' });
      return;
    }
    setAdding(true);
    try {
      const res = await fetch(`/api/site-configs/${siteId}/knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      setContent('');
      onUpdate();
      toast({ title: 'Document added; AI classified and indexed it.' });
    } catch (e: any) {
      toast({ title: 'Failed to add', description: e.message, variant: 'destructive' });
    }
    setAdding(false);
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.isArray(files) ? files : Array.from(files);
    if (!list.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      list.forEach((f) => formData.append('files', f));
      const res = await fetch(`/api/site-configs/${siteId}/knowledge/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      onUpdate();
      toast({ title: 'Documents uploaded', description: `${data.added ?? list.length} file(s) classified and indexed by AI.` });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    }
    setUploading(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files?.length) uploadFiles(files);
  };

  const deleteDoc = async (docId: string) => {
    setDeletingId(docId);
    try {
      const res = await fetch(`/api/site-configs/${siteId}/knowledge/${docId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await res.text());
      onUpdate();
      toast({ title: 'Document removed' });
    } catch (e: any) {
      toast({ title: 'Failed to remove', variant: 'destructive' });
    }
    setDeletingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-sui bg-slate-900/40 border border-indigo-500/20 p-4">
        <p className="text-sm text-slate-300 mb-4">
          Drag and drop documents or paste content below. The system will <strong>automatically classify</strong> each item as <strong>api_docs</strong>, <strong>hotel</strong>, or <strong>platform_economics</strong> and index it so the AI Biz Bot can find answers.
        </p>

        {/* Drag-and-drop upload */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`mb-6 rounded-sui border-2 border-dashed p-8 text-center transition-colors ${
            dragOver ? 'border-indigo-400 bg-indigo-500/10' : 'border-slate-600 bg-slate-800/30'
          }`}
        >
          <Upload className="w-10 h-10 mx-auto text-slate-400 mb-2" />
          <p className="text-slate-300 text-sm mb-1">Drop files here or click to browse</p>
          <p className="text-slate-400 text-xs mb-3">.txt, .md, .pdf, .yaml, .csv — AI will tag category and topic</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.pdf,.yaml,.yml,.csv,text/plain,text/markdown,application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.length && uploadFiles(e.target.files)}
            disabled={uploading}
          />
          <Button
            size="sm"
            className="bg-indigo-500 hover:bg-indigo-600"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Choose files'}
          </Button>
        </div>

        {/* Paste content — content only; LLM sets title/category/topic */}
        <h3 className="text-sm font-medium text-white mb-2">Or paste content</h3>
        <div className="space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste content… AI will classify and index it."
            className="min-h-[120px] bg-slate-800 border-slate-700 text-white font-mono text-sm"
            data-testid="textarea-knowledge-content"
          />
          <Button onClick={addDoc} disabled={adding} size="sm" data-testid="button-knowledge-add">
            {adding ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <BookOpen className="w-4 h-4 mr-1" />}
            Add to library
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-slate-300 text-xs mb-2 block">Documents in library ({docs.length})</Label>
        {docs.length === 0 ? (
          <p className="text-slate-300 text-sm">No documents yet. Upload files or add content above. The AI Biz Bot will search this library when users ask questions.</p>
        ) : (
          <div className="rounded-sui border border-indigo-500/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800/60 border-b border-indigo-500/20">
                  <th className="text-left py-2 px-3 text-slate-300 font-medium">Title</th>
                  <th className="text-left py-2 px-3 text-slate-300 font-medium">Category</th>
                  <th className="text-left py-2 px-3 text-slate-300 font-medium">Topic</th>
                  <th className="text-left py-2 px-3 text-slate-300 font-medium">Date</th>
                  <th className="text-right py-2 px-3 text-slate-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-medium text-white truncate max-w-[200px]">{d.title}</td>
                    <td className="py-2 px-3 text-slate-400">{d.category ?? 'General'}</td>
                    <td className="py-2 px-3 text-slate-400">{d.topic ?? 'General'}</td>
                    <td className="py-2 px-3 text-slate-400 font-mono text-xs">{d.documentDate ?? d.addedAt?.slice(0, 10) ?? '—'}</td>
                    <td className="py-2 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => deleteDoc(d.id)}
                        disabled={deletingId === d.id}
                        data-testid={`button-knowledge-delete-${d.id}`}
                      >
                        {deletingId === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const MODAL_LABELS: Record<string, string> = {
  'voice-inbound': 'Voice In',
  'voice-outbound': 'Voice Out',
  'sms': 'SMS',
  'chat': 'Chat',
};

const MODAL_COLORS: Record<string, string> = {
  'voice-inbound': 'text-emerald-400 border-emerald-400/30',
  'voice-outbound': 'text-blue-400 border-blue-400/30',
  'sms': 'text-amber-400 border-amber-400/30',
  'chat': 'text-violet-400 border-violet-400/30',
};

type SocialSharingFields = {
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogSiteName?: string;
  ogType?: string;
  twitterCard?: string;
};

function getSuggestedSocialSharing(site: SiteConfig): SocialSharingFields {
  const placeData = site.placeData as { editorial_summary?: string | { overview?: string }; name?: string } | undefined;
  const summary = placeData?.editorial_summary && typeof placeData.editorial_summary === 'object'
    ? (placeData.editorial_summary as { overview?: string }).overview
    : (placeData?.editorial_summary as string | undefined);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl = site.slug ? `${origin}/biz/${site.slug}` : '';
  return {
    ogTitle: site.name ?? '',
    ogDescription: summary ?? `Visit ${site.name} — AI-powered voice and chat.`,
    ogImage: (site as any).heroImageUrl ?? '',
    ogUrl: publicUrl,
    ogSiteName: site.name ?? '',
    ogType: 'website',
    twitterCard: 'summary_large_image',
  };
}

/** Suggest a URL-safe slug from a name (no random suffix). */
function suggestSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/^-|-$/g, '') || 'my-site';
}

/** Home tab: 4 summary cards (Account, Voice Services, Recent Activity, Affiliate), then customer website. No header logo (branding is in sidebar). */
function HomeTab({
  site,
  onUpdate,
  isUpdating,
}: {
  site: SiteConfig;
  onUpdate?: (u: Partial<SiteConfig>) => void;
  isUpdating?: boolean;
}) {
  const placeData = site.placeData as { formatted_phone_number?: string; name?: string } | null;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const websiteUrl = site.slug ? `${baseUrl}/biz/${site.slug}` : '';
  const [slugDraft, setSlugDraft] = useState(site.slug ?? suggestSlugFromName(site.name ?? ''));
  useEffect(() => {
    if (site.slug) setSlugDraft(site.slug);
    else setSlugDraft(suggestSlugFromName(site.name ?? ''));
  }, [site.id, site.slug, site.name]);

  const { data: energy, isLoading: energyLoading } = useQuery<{ minuteBalance: number | null; totalBilledMinutes: number; totalBilledAmountCents: number }>({
    queryKey: ['energy-balance', site.id],
    queryFn: () => fetch(`/api/site-configs/${site.id}/energy`).then((r) => r.json()),
  });

  const { data: voiceLogs = [], isLoading: logsLoading } = useQuery<{ callType: string; rawDurationSeconds: number; billedMinutes: number; createdAt: string }[]>({
    queryKey: ['energy-logs', site.id],
    queryFn: () => fetch(`/api/site-configs/${site.id}/energy/logs?limit=10`).then((r) => r.json()),
  });

  const { data: resellerStatus } = useQuery<{ stripeConnectId: string | null; balance: number | null } | null>({
    queryKey: ['/api/reseller/status'],
    queryFn: async () => {
      const r = await fetch('/api/reseller/status', { credentials: 'include' });
      if (!r.ok) return null;
      return r.json();
    },
    retry: false,
  });
  const { data: commissions } = useQuery<{ totalEarnings: number; activeClients: number; commissions: unknown[] } | null>({
    queryKey: ['/api/reseller/commissions'],
    queryFn: async () => {
      const r = await fetch('/api/reseller/commissions', { credentials: 'include' });
      if (!r.ok) return null;
      return r.json();
    },
    retry: false,
  });

  const planMinutes = (site as any).voicePhoneAiMinutes ?? 0;
  const usedMinutes = energy?.totalBilledMinutes ?? 0;

  return (
    <div className="space-y-6">
      {/* 4 cards — Shadcn-style: rounded-xl, shadow, clear hierarchy */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" /> Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">UUID</span><span className="font-mono text-xs text-slate-900 truncate max-w-[120px]" title={site.id}>{site.id.slice(0, 8)}…</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Website URL</span><a href={websiteUrl} target="_blank" rel="noreferrer" className="text-indigo-600 truncate max-w-[140px] hover:underline" title={websiteUrl}>{(websiteUrl && site.slug) ? `/biz/${site.slug}` : '—'}</a></div>
            <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="text-slate-900 font-mono text-xs">{(site as any).provisionedPhoneNumber || placeData?.formatted_phone_number || '—'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">AI Router</span><span className="text-slate-700 text-xs">On</span></div>
            <div className="flex justify-between"><span className="text-slate-500">AI Phone</span><span className="text-slate-700 text-xs">{(site as any).provisionedPhoneNumber ? 'Active' : '—'}</span></div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <Phone className="w-4 h-4 text-indigo-500" /> Voice Services
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {energyLoading ? (
              <Skeleton className="h-16 w-full rounded" />
            ) : (
              <>
                <div className="flex justify-between"><span className="text-slate-500">Minutes in plan</span><span className="text-slate-900 font-mono">{planMinutes}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Minutes used</span><span className="text-slate-900 font-mono">{usedMinutes}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Balance</span><span className="text-emerald-600 font-mono">{energy?.minuteBalance ?? '—'}</span></div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <Skeleton className="h-20 w-full rounded" />
            ) : voiceLogs.length === 0 ? (
              <p className="text-xs text-slate-500">No voice activity yet</p>
            ) : (
              <ul className="space-y-1.5 max-h-28 overflow-y-auto">
                {voiceLogs.slice(0, 5).map((log, i) => (
                  <li key={i} className="flex justify-between text-xs">
                    <span className="text-slate-500">{log.callType || 'Voice'}</span>
                    <span className="text-slate-700">{log.billedMinutes}m · {log.createdAt ? new Date(log.createdAt).toLocaleDateString() : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-slate-200/90 bg-white shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-500" /> Affiliate Program
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {(commissions != null || resellerStatus != null) ? (
              <>
                <div className="flex justify-between"><span className="text-slate-500">Earnings (YTD)</span><span className="text-slate-900 font-mono">${(commissions?.totalEarnings ?? 0).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Active clients</span><span className="text-slate-900 font-mono">{commissions?.activeClients ?? 0}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Balance</span><span className="text-emerald-600 font-mono">${(resellerStatus?.balance ?? 0).toFixed(2)}</span></div>
                <p className="text-[10px] text-slate-500 mt-1">Next payout via Stripe Connect</p>
              </>
            ) : (
              <p className="text-xs text-slate-500">Not a reseller or sign in required</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer website below — hero in background of preview area */}
      <Card className="rounded-xl border border-slate-200/90 overflow-hidden bg-white shadow-md">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-900">Your website</span>
          {websiteUrl && (
            <a href={websiteUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              Open in new tab <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        <div className="relative min-h-[420px] overflow-hidden">
          {/* Hero section image as background for this block */}
          <div className="absolute inset-0 z-0">
            <img src="/hero-storefront-lovely-lashes.png" alt="" className="w-full h-full object-cover" aria-hidden onError={(e) => { const el = e.target as HTMLImageElement; el.style.display = 'none'; }} />
            <div className="absolute inset-0 bg-slate-900/40" aria-hidden />
          </div>
          <div className="relative z-10 h-[420px] flex flex-col">
          {websiteUrl ? (
            <iframe
              src={websiteUrl}
              title={`${site.name} — Live site`}
              className="w-full h-full min-h-[420px] border-0 flex-1"
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-[420px] text-slate-600 p-6">
              <Globe className="w-12 h-12 mb-4 opacity-50 text-slate-400" />
              <p className="text-sm font-medium text-slate-700 mb-1">No public URL yet</p>
              <p className="text-xs text-slate-600 mb-4">Set a URL slug below to get your website link. You can change it later in Settings.</p>
              {onUpdate && (
                <div className="w-full max-w-sm space-y-2">
                  <Label className="text-xs text-slate-600">Website URL slug</Label>
                  <div className="flex gap-2">
                    <Input
                      value={slugDraft}
                      onChange={(e) => setSlugDraft(e.target.value)}
                      placeholder={suggestSlugFromName(site.name ?? '')}
                      className="bg-white border-slate-300 text-slate-900 font-mono text-sm"
                      data-testid="input-home-slug"
                    />
                    <Button
                      onClick={() => onUpdate({ slug: slugDraft.trim() || undefined })}
                      disabled={!slugDraft.trim() || isUpdating}
                      className="shrink-0"
                      data-testid="button-save-slug"
                    >
                      {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-600">Your link will be: /biz/{slugDraft.trim() || '…'}</p>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </Card>
    </div>
  );
}

/** Publishing tab: custom domain + Hostinger verify-ownership. Payment-gated (non-free plan). */
function PublishingTab({
  site,
  onUpdate,
  toast,
  onSwitchToPlan,
}: {
  site: SiteConfig;
  onUpdate: (u: Partial<SiteConfig>) => void;
  toast: (opts: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void;
  onSwitchToPlan?: () => void;
}) {
  const sitePlan = (site as any).plan || 'free';
  const domainVerifiedAt = (site as any).domainVerifiedAt as string | null | undefined;
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ is_accessible?: boolean; txt_to_verify?: string | null } | null>(null);

  if (sitePlan === 'free') {
    return (
      <div className="space-y-4">
        <div className="rounded-sui bg-amber-500/10 border border-amber-500/30 p-4">
          <p className="text-amber-200 text-sm font-medium">Publishing requires a paid plan</p>
          <p className="text-slate-400 text-xs mt-1">Upgrade to add and verify a custom domain for this site.</p>
          <Button
            size="sm"
            className="mt-3 bg-amber-600 hover:bg-amber-500"
            onClick={onSwitchToPlan}
            data-testid="button-publishing-upgrade"
          >
            <Sparkles className="w-3 h-3 mr-1" /> Go to Plan
          </Button>
        </div>
        <p className="text-slate-600 text-xs">Switch to the Plan tab to upgrade, then return here to set your custom domain.</p>
      </div>
    );
  }

  const handleVerify = async () => {
    const domain = (site.domain || '').trim().replace(/^www\./i, '');
    if (!domain) {
      toast({ title: 'Enter a domain first', variant: 'destructive' });
      return;
    }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch(`/api/site-configs/${site.id}/domain/verify-ownership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: data?.error || 'Verification failed', variant: 'destructive' });
        setVerifyResult({ is_accessible: false, txt_to_verify: data?.txt_to_verify ?? null });
        return;
      }
      setVerifyResult({ is_accessible: data?.is_accessible, txt_to_verify: data?.txt_to_verify ?? null });
      if (data?.is_accessible) {
        onUpdate({ domain: data?.domain ?? domain } as any);
        queryClient.invalidateQueries({ queryKey: ['/api/site-configs', site.id] });
        toast({ title: 'Domain verified', description: 'Custom domain is now verified and saved.' });
      } else if (data?.txt_to_verify) {
        toast({ title: 'Add DNS record', description: 'Add the TXT record below to your domain DNS, then verify again.' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Custom domain</h3>
        <p className="text-xs text-slate-600 mb-3">Add and verify your custom domain via Hostinger. Shown below the site name on agent pages.</p>
        <Label className="text-slate-700 text-xs mb-1.5 block">Domain</Label>
        <Input
          value={site.domain || ''}
          onChange={(e) => onUpdate({ domain: e.target.value })}
          placeholder="e.g. mybusiness.com"
          className="bg-white border-slate-300 text-slate-900"
          data-testid="input-publishing-domain"
        />
        {domainVerifiedAt && (
          <p className="text-[10px] text-emerald-400 mt-1.5 flex items-center gap-1">
            <Check className="w-3 h-3" /> Verified {new Date(domainVerifiedAt).toLocaleDateString()}
          </p>
        )}
      </div>
      <Button
        onClick={handleVerify}
        disabled={verifying || !(site.domain || '').trim()}
        className="bg-indigo-600 hover:bg-indigo-500"
        data-testid="button-verify-domain"
      >
        {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Globe className="w-4 h-4 mr-2" />}
        Verify ownership
      </Button>
      {verifyResult && (
        <div className="rounded-sui bg-slate-50 border border-slate-200 p-4 space-y-2">
          <p className="text-xs font-medium text-slate-600">Verification result</p>
          {verifyResult.is_accessible ? (
            <p className="text-sm text-emerald-400">Domain is verified and saved.</p>
          ) : verifyResult.txt_to_verify ? (
            <div>
              <p className="text-xs text-slate-400 mb-2">Add this TXT record to your domain DNS, then click Verify again. Propagation can take up to 10 minutes.</p>
              <div className="font-mono text-xs bg-slate-900/80 border border-slate-600 rounded p-2 text-slate-300 break-all">
                {verifyResult.txt_to_verify}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Verification did not succeed. Check the domain and try again.</p>
          )}
        </div>
      )}
    </div>
  );
}

function SocialSharingCard({ site, onUpdate }: { site: SiteConfig; onUpdate: (u: Partial<SiteConfig>) => void }) {
  const { toast } = useToast();
  const suggested = getSuggestedSocialSharing(site);
  const stored = ((site as any).socialSharing as SocialSharingFields) || {};
  const [form, setForm] = useState<SocialSharingFields>(() => ({ ...suggested, ...stored }));
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicUrl = site.slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/biz/${site.slug}` : '';

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/site-configs/${site.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ socialSharing: form }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
      onUpdate({ socialSharing: form } as any);
      toast({ title: 'Social sharing saved', description: 'Meta tags will be used when this page is shared.' });
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    if (!publicUrl) {
      toast({ title: 'No public URL', description: 'Set a slug for this site to get a shareable link.', variant: 'destructive' });
      return;
    }
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast({ title: 'Link copied', description: publicUrl });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareUrl = encodeURIComponent(publicUrl);
  const shareTitle = encodeURIComponent(form.ogTitle || site.name || '');
  const shareText = encodeURIComponent(form.ogDescription || '');

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-indigo-400" />
          Social Sharing
        </CardTitle>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Open Graph and meta tags for when this page is shared on social media. All fields have defaults so you can leave them blank.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label className="text-slate-400 text-xs mb-1 block">OG Title</Label>
            <Input
              value={form.ogTitle ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, ogTitle: e.target.value }))}
              placeholder={suggested.ogTitle || 'Site name'}
              className="bg-slate-900 border-slate-700 text-white text-sm"
              data-testid="input-og-title"
            />
          </div>
          <div>
            <Label className="text-slate-400 text-xs mb-1 block">OG Description</Label>
            <Textarea
              value={form.ogDescription ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, ogDescription: e.target.value }))}
              placeholder={suggested.ogDescription || 'Short description for link previews'}
              className="bg-slate-900 border-slate-700 text-white text-sm resize-none"
              rows={2}
              data-testid="input-og-description"
            />
          </div>
          <div>
            <Label className="text-slate-400 text-xs mb-1 block">OG Image URL</Label>
            <Input
              value={form.ogImage ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, ogImage: e.target.value }))}
              placeholder={suggested.ogImage || 'Hero image or 1200×630 image URL'}
              className="bg-slate-900 border-slate-700 text-white text-sm"
              data-testid="input-og-image"
            />
          </div>
          <div>
            <Label className="text-slate-400 text-xs mb-1 block">OG URL</Label>
            <Input
              value={form.ogUrl ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, ogUrl: e.target.value }))}
              placeholder={suggested.ogUrl || publicUrl || 'Public page URL'}
              className="bg-slate-900 border-slate-700 text-white text-sm"
              data-testid="input-og-url"
            />
          </div>
          <div>
            <Label className="text-slate-400 text-xs mb-1 block">OG Site Name</Label>
            <Input
              value={form.ogSiteName ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, ogSiteName: e.target.value }))}
              placeholder={suggested.ogSiteName || 'Site name'}
              className="bg-slate-900 border-slate-700 text-white text-sm"
              data-testid="input-og-site-name"
            />
          </div>
          <div>
            <Label className="text-slate-400 text-xs mb-1 block">Twitter Card</Label>
            <Select
              value={form.twitterCard ?? 'summary_large_image'}
              onValueChange={(v) => setForm((f) => ({ ...f, twitterCard: v }))}
            >
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white" data-testid="select-twitter-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary_large_image">Summary large image</SelectItem>
                <SelectItem value="summary">Summary</SelectItem>
                <SelectItem value="player">Player</SelectItem>
                <SelectItem value="app">App</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-700">
          <Button size="sm" variant="outline" className="border-indigo-500/30 text-indigo-300" onClick={handleSave} disabled={saving} data-testid="button-save-social-sharing">
            {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
            {saving ? 'Saving…' : 'Save meta tags'}
          </Button>
          <span className="text-[10px] text-slate-500">Share page:</span>
          <Button size="sm" variant="ghost" className="text-slate-400 h-7 px-2" onClick={copyLink} data-testid="button-copy-share-link">
            {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
            Copy link
          </Button>
          {publicUrl && (
            <>
              <a href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-400 hover:text-indigo-400">
                Twitter
              </a>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-400 hover:text-indigo-400">
                Facebook
              </a>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-400 hover:text-indigo-400">
                LinkedIn
              </a>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function AdminPanel({
  site,
  agents,
  onUpdate,
  isUpdating,
  initialTab,
  horizontalTabs = false,
}: {
  site: SiteConfig;
  agents: Agent[];
  onUpdate: (updates: Partial<SiteConfig>) => void;
  isUpdating: boolean;
  initialTab?: 'home' | 'settings' | 'plan' | 'gateway' | 'agents' | 'agent' | 'workspace' | 'chat' | 'logs' | 'embed' | 'qr-network' | 'cash-board' | 'publishing';
  /** When true, use horizontal tab bar at top instead of vertical sidebar (single-site / reseller flow). */
  horizontalTabs?: boolean;
}) {
  const placeData = site.placeData as any;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'home' | 'settings' | 'plan' | 'gateway' | 'agents' | 'agent' | 'workspace' | 'chat' | 'logs' | 'embed' | 'qr-network' | 'cash-board' | 'publishing'>(initialTab ?? 'home');
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [deployingTemplateId, setDeployingTemplateId] = useState<string | null>(null);
  const [savingAgentConfig, setSavingAgentConfig] = useState(false);
  const [toolCallLog, setToolCallLog] = useState<Array<{ ts: string; tool: string; type: string }>>([]);
  // Hero image generation
  const [heroImageUrl, setHeroImageUrl] = useState<string>((site as any).heroImageUrl || '');
  const [heroCustomPrompt, setHeroCustomPrompt] = useState('');
  const [generatingHero, setGeneratingHero] = useState(false);

  const { data: agentTemplates = [] } = useQuery<any[]>({
    queryKey: ['/api/agents/templates'],
    queryFn: async () => {
      const res = await fetch('/api/agents/templates');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const deployAgentTemplate = async (template: any) => {
    setDeployingTemplateId(template.id);
    try {
      const res = await fetch('/api/agents/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          businessId: site.id,
          name: `${template.name} (${site.name})`,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Deploy failed');
      }
      const deployed = await res.json();
      await queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      onUpdate({ assignedAgentId: deployed.id ?? deployed.agentId ?? null });
      toast({ title: 'Agent Deployed', description: `${template.name} is now active for this business.` });
    } catch (err: any) {
      toast({ title: 'Deploy Failed', description: err.message, variant: 'destructive' });
    } finally {
      setDeployingTemplateId(null);
    }
  };

  // Fetch the live configuration of the currently assigned agent
  const { data: assignedAgentConfig, refetch: refetchAgentConfig } = useQuery<any>({
    queryKey: ['/api/agents', site.assignedAgentId],
    queryFn: async () => {
      if (!site.assignedAgentId) return null;
      const res = await fetch(`/api/agents/${site.assignedAgentId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!site.assignedAgentId && activeTab === 'agent',
  });

  const assignedTemplateId: string = assignedAgentConfig?.templateId || '';
  const isQualifier = assignedTemplateId === 'lead-qualifier';
  const isCloser = assignedTemplateId === 'sales-closer';
  const hasSkillPanel = isQualifier || isCloser;

  const currentSkillToggles: Record<string, boolean> = assignedAgentConfig?.configuration?.skillToggles || {};
  const currentToolLimits: Record<string, number> = assignedAgentConfig?.configuration?.toolLimits || {};

  const saveAgentConfiguration = async (patch: Record<string, any>) => {
    if (!site.assignedAgentId) return;
    setSavingAgentConfig(true);
    try {
      const merged = {
        ...(assignedAgentConfig?.configuration || {}),
        ...patch,
      };
      const res = await fetch(`/api/agents/${site.assignedAgentId}/configuration`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configuration: merged }),
      });
      if (!res.ok) throw new Error('Failed to save');
      await refetchAgentConfig();
      toast({ title: 'Agent Updated', description: 'Configuration saved.' });
    } catch (err: any) {
      toast({ title: 'Save Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSavingAgentConfig(false);
    }
  };

  // Load tool call activity log from localStorage when agent tab is open
  useEffect(() => {
    if (activeTab !== 'agent') return;
    const readLog = () => {
      try {
        const raw = localStorage.getItem('gg_tool_log');
        if (raw) setToolCallLog(JSON.parse(raw).slice(0, 20));
      } catch { /* ignore */ }
    };
    readLog();
    const interval = setInterval(readLog, 5000);
    return () => clearInterval(interval);
  }, [activeTab]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: site.greetingMessage || `Hi! I'm the AI assistant for ${site.name}. How can I help you?` }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [embedCopied, setEmbedCopied] = useState(false);

  const { data: chatLogs = [], isLoading: logsLoading } = useQuery<any[]>({
    queryKey: ['/api/site-configs', site.id, 'chat-logs'],
    queryFn: () => fetch(`/api/site-configs/${site.id}/chat-logs`).then(r => r.json()),
    enabled: activeTab === 'logs',
  });

  const { data: providers = [] } = useQuery<{ provider: string; model: string }[]>({
    queryKey: ['/api/gateway/providers'],
    queryFn: () => fetch('/api/gateway/providers').then(r => r.json()),
  });

  const sendTestChat = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/website-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          businessName: placeData?.name || site.name,
          businessAddress: placeData?.formatted_address,
          businessPhone: placeData?.formatted_phone_number,
          siteConfigId: site.id,
          visitorId: 'admin-test',
          history: chatMessages.slice(-10),
        }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response || 'No response.' }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to AI.' }]);
    }
    setChatLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [chatInput, chatLoading, chatMessages, placeData, site.name, site.id]);

  useEffect(() => {
    setChatMessages([
      { role: 'assistant', content: site.greetingMessage || `Hi! I'm the AI assistant for ${site.name}. How can I help you?` }
    ]);
  }, [site.id, site.greetingMessage, site.name]);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const embedCode = `<script src="${baseUrl}/embed.js" data-bot-id="${site.id}" defer></script>`;

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedCode);
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  const sitePlan = (site as any).plan || 'free';
  const tabs = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
    { id: 'plan' as const, label: 'Plan', icon: Sparkles },
    { id: 'publishing' as const, label: 'Publishing', icon: Globe },
    { id: 'gateway' as const, label: 'Gateway', icon: Network },
    { id: 'agents' as const, label: 'Agents', icon: Users },
    { id: 'agent' as const, label: 'Agent', icon: Bot },
    ...(sitePlan === 'voice' ? [{ id: 'workspace' as const, label: 'Workspace', icon: Building2 }] : []),
    { id: 'chat' as const, label: 'Test Chat', icon: MessageSquare },
    { id: 'logs' as const, label: 'Logs', icon: Clock },
    { id: 'embed' as const, label: 'Embed', icon: Code },
    { id: 'qr-network' as const, label: 'QR Network', icon: QrCode },
    { id: 'cash-board' as const, label: 'Cash Board', icon: BarChart3 },
  ];

  const tabButtons = tabs.map((tab) => {
    const Icon = tab.icon;
    return (
      <button
        key={tab.id}
        type="button"
        onClick={() => setActiveTab(tab.id)}
        className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-sui text-sm font-medium transition-colors ${
          activeTab === tab.id
            ? 'bg-indigo-500 text-white border border-indigo-500'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
        }`}
        data-testid={`tab-${tab.id}`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{tab.label}</span>
      </button>
    );
  });

  const adminHeroBg = '/hero-storefront-lovely-lashes.png';
  const adminHeroFallback = '/hero-qr-demo.png';

  return (
    <div className="relative flex min-h-screen h-screen w-full overflow-hidden">
      {/* Hero background — clearly visible behind content */}
      <div className="absolute inset-0 z-0">
        <img src={adminHeroBg} alt="" className="w-full h-full object-cover" aria-hidden onError={(e) => { const el = e.target as HTMLImageElement; if (el.src.endsWith(adminHeroFallback)) el.style.display = 'none'; else el.src = adminHeroFallback; }} />
        <div className="absolute inset-0 bg-white/55 backdrop-blur-[1px]" aria-hidden />
      </div>
      <div className="relative z-10 flex min-h-screen h-screen w-full min-w-0">
        {/* Vertical sidebar always — one-to-many nav (no horizontal row of tabs) */}
        <aside className="w-52 shrink-0 flex flex-col border-r border-slate-200/80 bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="p-4 border-b border-slate-200 shrink-0 flex flex-col items-center gap-2">
            {horizontalTabs && (
              <Link href="/platform/tenants" className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 w-full">
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" /> Back to list
              </Link>
            )}
            <img src="/clear_voice_ai_light_sm_sq.png" alt="Powered by Clear Voice AI" className="h-14 w-auto max-w-full object-contain" />
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0 scrollbar-hide">
            {tabButtons}
          </nav>
        </aside>

      {/* Main content — glass so hero shows through */}
      <div className="flex-1 min-w-0 min-h-0 overflow-y-auto scrollbar-hide bg-white/80 backdrop-blur-sm">
        <div className="p-6 md:p-8 max-w-4xl">

        {activeTab === 'home' && <HomeTab site={site} onUpdate={onUpdate} isUpdating={isUpdating} />}

        {activeTab === 'plan' && (() => {
          const sitePlan = (site as any).plan || 'free';
          const PLAN_KEYS = ['free', 'pro', 'voice', 'enterprise'] as const;
          const planLabels: Record<string, string> = {
            free: 'AI BIZ BOT — FREE',
            pro: 'Small Business Starter',
            voice: 'Small Business AI Pro',
            enterprise: 'Small Business Enterprise',
          };
          const planPrices: Record<string, number> = { free: 0, pro: 49.99, voice: 99.99, enterprise: 299.99 };
          const planFeatures: Record<string, string[]> = {
            free: ['Static AI website', 'Last 5 reviews', 'Shared SMS number', '500 website voice min'],
            pro: ['Edit website', 'Review management', 'SMS admin', '500 website voice min'],
            voice: ['Dedicated phone number', 'Call screening', 'Live voice AI', '400 live voice min', 'Spanish support'],
            enterprise: ['Unlimited businesses', 'Task management', '1500 live voice min', 'Priority support'],
          };
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-slate-600 text-xs">Business Subscription</Label>
                <Badge variant="outline" className="text-indigo-600 border-indigo-300 text-[10px]">
                  {planLabels[sitePlan] || sitePlan}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {PLAN_KEYS.map((key) => {
                  const isCurrent = key === sitePlan;
                  const planOrder = PLAN_KEYS.indexOf(key);
                  const currentOrder = PLAN_KEYS.indexOf(sitePlan as typeof PLAN_KEYS[number]);
                  const isDowngrade = planOrder < currentOrder;
                  return (
                    <div
                      key={key}
                      className={`rounded-sui border p-4 flex flex-col gap-2 ${
                        isCurrent ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-slate-600">{planLabels[key]}</p>
                          <p className="text-lg font-bold text-slate-900">
                            {planPrices[key] === 0 ? 'Free' : `$${planPrices[key]}`}
                            {planPrices[key] > 0 && <span className="text-[10px] text-slate-500 font-normal">/mo</span>}
                          </p>
                        </div>
                        {isCurrent ? (
                          <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 text-[10px]">Current</Badge>
                        ) : isDowngrade ? (
                          <span className="text-[10px] text-slate-500">Lower tier</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-7 px-2 border-indigo-500 text-indigo-600 hover:bg-indigo-50"
                            disabled={upgradingPlan === key}
                            onClick={async () => {
                              setUpgradingPlan(key);
                              try {
                                const res = await fetch('/api/subscriptions/create-checkout-session', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ plan: key, siteConfigId: site.id }),
                                });
                                const data = await res.json();
                                if (!res.ok) throw new Error(data.error || 'Checkout failed');
                                window.location.href = data.url;
                              } catch (err: any) {
                                toast({ title: 'Upgrade failed', description: err.message, variant: 'destructive' });
                                setUpgradingPlan(null);
                              }
                            }}
                          >
                            {upgradingPlan === key ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Sparkles className="w-3 h-3 mr-1" />Upgrade</>}
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {planFeatures[key].map((f) => (
                          <span key={f} className="text-[9px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{f}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] text-slate-500 text-center mt-2">
                Upgrades apply to this business (Site ID: <span className="font-mono">{site.id.slice(0, 8)}...</span>).
                Plans are billed monthly. Cancel anytime in your Stripe portal.
              </p>
            </div>
          );
        })()}

        {activeTab === 'publishing' && <PublishingTab site={site} onUpdate={onUpdate} toast={toast} onSwitchToPlan={() => setActiveTab('plan')} />}

        {activeTab === 'workspace' && (
          <GoogleWorkspacePanel siteConfigId={site.id} />
        )}

        {/* QR Network — shadow telecom routing table */}
        {activeTab === 'qr-network' && <QRRoutesManager siteConfigId={site.id} siteSlug={site.slug ?? undefined} />}

        {/* Cash Board — conversation events (actionable routes) */}
        {activeTab === 'cash-board' && <CashBoardPanel siteConfigId={site.id} />}

        {/* Gateway Router — Dynamic Entry Point Engine switchboard */}
        {activeTab === 'gateway' && (
          <GatewayRouterPanel
            siteConfigId={site.id}
            knowledgeLibrary={site.knowledgeLibrary}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['/api/site-configs', site.id] })}
          />
        )}

        {/* Agents — DB roster (create/edit/assign) + Specialty Agent Creator */}
        {activeTab === 'agents' && (
          <div className="space-y-8">
            <AgentRosterPanel
              siteConfigId={site.id}
              currentAssignedAgentId={site.assignedAgentId ?? null}
              onAssignAgent={(agentId) => onUpdate({ assignedAgentId: agentId })}
            />
            <div className="border-t border-slate-200 pt-6">
              <AgentCreatorPanel
                siteConfigId={site.id}
                knowledgeLibrary={site.knowledgeLibrary}
                onSaved={() => queryClient.invalidateQueries({ queryKey: ['/api/site-configs', site.id] })}
              />
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-5">
            <div>
              <Label className="text-slate-600 text-xs mb-1.5 block">Site Name</Label>
              <Input
                value={site.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="bg-white border-slate-300 text-slate-900"
                data-testid="input-site-name"
              />
            </div>
            <div>
              <Label className="text-slate-600 text-xs mb-1.5 block">Domain</Label>
              <Input
                value={site.domain || ''}
                onChange={(e) => onUpdate({ domain: e.target.value })}
                placeholder="e.g. aibizbot.gatewayglobal.ai"
                className="bg-white border-slate-300 text-slate-900"
                data-testid="input-site-domain"
              />
            </div>
            <div>
              <Label className="text-slate-600 text-xs mb-1.5 block">Website URL slug</Label>
              <Input
                value={site.slug ?? ''}
                onChange={(e) => onUpdate({ slug: e.target.value === '' ? null : e.target.value })}
                placeholder="e.g. mikes-site"
                className="bg-white border-slate-300 text-slate-900 font-mono text-sm"
                data-testid="input-site-slug"
              />
              <p className="text-[10px] text-slate-500 mt-1">Your public link: /biz/[slug]. Letters, numbers, and hyphens only; saved as lowercase.</p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-slate-600 text-sm">Chatbot Enabled</Label>
                <p className="text-[10px] text-slate-500">Show chat widget on customer website</p>
              </div>
              <Switch
                checked={site.chatbotEnabled ?? true}
                onCheckedChange={(checked) => onUpdate({ chatbotEnabled: checked })}
                data-testid="switch-chatbot-enabled"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="text-slate-600 text-sm">Voice Concierge</Label>
                <p className="text-[10px] text-slate-500">Enable voice AI on customer website</p>
              </div>
              <Switch
                checked={site.voiceConciergeEnabled ?? true}
                onCheckedChange={(checked) => onUpdate({ voiceConciergeEnabled: checked })}
                data-testid="switch-voice-enabled"
              />
            </div>
            <div>
              <Label className="text-slate-600 text-xs mb-1.5 block">AI Model</Label>
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-600" data-testid="display-ai-model">
                Gemini 2.5 (platform default)
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Model is set in Doppler (GEMINI_MODEL_ID). Not configurable per site.</p>
            </div>
            <div>
              <Label className="text-slate-600 text-xs mb-1.5 block">Greeting Message</Label>
              <Textarea
                value={site.greetingMessage || ''}
                onChange={(e) => onUpdate({ greetingMessage: e.target.value })}
                placeholder="Hi! I'm your AI assistant. How can I help?"
                className="bg-white border-slate-300 text-slate-900 resize-none"
                rows={3}
                data-testid="input-greeting"
              />
            </div>
            <div>
              <Label className="text-slate-600 text-xs mb-1.5 block">Widget Color</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={site.widgetColor || '#2563eb'}
                  onChange={(e) => onUpdate({ widgetColor: e.target.value })}
                  className="w-10 h-10 rounded-md border border-slate-300 cursor-pointer bg-transparent"
                  data-testid="input-widget-color"
                />
                <span className="text-sm text-slate-400 font-mono">{site.widgetColor || '#2563eb'}</span>
              </div>
            </div>
            {placeData && (
              <Card className="bg-white border border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-indigo-500" />
                    Linked Business
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-xs text-slate-500">
                  <p className="text-slate-900 font-medium">{placeData.name}</p>
                  {placeData.formatted_address && <p>{placeData.formatted_address}</p>}
                  {placeData.formatted_phone_number && (
                    <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {placeData.formatted_phone_number}</p>
                  )}
                  {placeData.rating && (
                    <p className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> {placeData.rating} ({placeData.user_ratings_total} reviews)</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Hero Image Generator ── */}
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-violet-500" />
                  Hero Image
                </CardTitle>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  AI-generated background for your website hero section. Powered by Flux.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Current image preview */}
                {heroImageUrl ? (
                  <div className="relative rounded-md overflow-hidden h-28 bg-slate-900">
                    <img
                      src={heroImageUrl}
                      alt="Hero preview"
                      className="w-full h-full object-cover opacity-90"
                      onError={() => setHeroImageUrl('')}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                    <button
                      className="absolute top-2 right-2 text-[10px] bg-red-600/80 hover:bg-red-500 text-white px-2 py-0.5 rounded"
                      onClick={async () => {
                        setHeroImageUrl('');
                        await fetch(`/api/site-configs/${site.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ heroImageUrl: null }),
                        });
                        onUpdate({ heroImageUrl: null } as any);
                        toast({ title: 'Hero image removed' });
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="rounded-md h-20 bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950 flex items-center justify-center border border-dashed border-slate-700">
                    <p className="text-[11px] text-slate-500">No hero image — using gradient fallback</p>
                  </div>
                )}
                {/* Custom prompt */}
                <div>
                  <Label className="text-slate-400 text-[10px] mb-1 block">Custom prompt (optional)</Label>
                  <Textarea
                    value={heroCustomPrompt}
                    onChange={(e) => setHeroCustomPrompt(e.target.value)}
                    placeholder="e.g. Modern Italian restaurant interior, warm candlelight, rich wood accents…"
                    className="bg-slate-900 border-slate-700 text-white text-xs resize-none"
                    rows={2}
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white"
                  disabled={generatingHero}
                  data-testid="button-generate-hero"
                  onClick={async () => {
                    setGeneratingHero(true);
                    try {
                      const res = await fetch(`/api/site-configs/${site.id}/generate-hero-image`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ customPrompt: heroCustomPrompt || undefined }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Generation failed');
                      setHeroImageUrl(data.imageUrl);
                      onUpdate({ heroImageUrl: data.imageUrl } as any);
                      toast({ title: '✨ Hero image generated!', description: 'Your website hero has been updated.' });
                    } catch (err: any) {
                      toast({ title: 'Generation failed', description: err.message, variant: 'destructive' });
                    } finally {
                      setGeneratingHero(false);
                    }
                  }}
                >
                  {generatingHero ? (
                    <><Loader2 className="w-3 h-3 animate-spin mr-2" />Generating… (~15s)</>
                  ) : (
                    <><Sparkles className="w-3 h-3 mr-2" />Generate AI Hero Image</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* ── Social Sharing (OG / meta) ── */}
            <SocialSharingCard site={site} onUpdate={onUpdate} />
          </div>
        )}

        {activeTab === 'agent' && (
          <div className="space-y-5">

            {/* Pre-built Agent Templates */}
            {agentTemplates.length > 0 && (
              <div>
                <Label className="text-slate-300 text-xs mb-2 block">Pre-built Agent Templates</Label>
                <div className="grid grid-cols-1 gap-2">
                  {agentTemplates.map((tmpl: any) => {
                    const isDeploying = deployingTemplateId === tmpl.id;
                    const modalColor = MODAL_COLORS[tmpl.modal] || 'text-slate-400 border-slate-400/30';
                    return (
                      <div
                        key={tmpl.id}
                        className="p-3 rounded-lg border border-slate-700 bg-slate-800/50 flex items-start gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-medium text-slate-200">{tmpl.name}</span>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${modalColor}`}>
                              {MODAL_LABELS[tmpl.modal] || tmpl.modal}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-2 mb-1.5">{tmpl.description}</p>
                          {tmpl.capabilities?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {tmpl.capabilities.slice(0, 4).map((cap: string) => (
                                <span key={cap} className="text-[9px] bg-slate-700 text-slate-400 rounded px-1.5 py-0.5">{cap.replace(/_/g, ' ')}</span>
                              ))}
                              {tmpl.capabilities.length > 4 && (
                                <span className="text-[9px] text-slate-500">+{tmpl.capabilities.length - 4} more</span>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 text-[10px] h-7 px-2 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
                          onClick={() => deployAgentTemplate(tmpl)}
                          disabled={isDeploying}
                        >
                          {isDeploying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />}
                          {isDeploying ? 'Deploying...' : 'Deploy'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">Deploy a pre-built agent to activate it for this business. It will appear in the Assigned Agent list below.</p>
              </div>
            )}

            <div>
              <Label className="text-slate-300 text-xs mb-1.5 block">Assigned Agent</Label>
              <Select
                value={site.assignedAgentId || 'none'}
                onValueChange={(val) => onUpdate({ assignedAgentId: val === 'none' ? null : val })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white" data-testid="select-agent">
                  <SelectValue placeholder="Select an agent..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Default (No Agent)</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name} {agent.status !== 'active' ? `(${agent.status})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-500 mt-1">Assign an agent to control the AI personality and DISC profile.</p>
            </div>

            {site.assignedAgentId && agents.find(a => a.id === site.assignedAgentId) && (() => {
              const agent = agents.find(a => a.id === site.assignedAgentId)!;
              return (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                      <Bot className="w-4 h-4 text-indigo-400" />
                      Agent Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {agent.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{agent.name}</p>
                        <p className="text-xs text-slate-400">{agent.aiModelProvider || 'gemini'} / {agent.aiModelId || 'default'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'D', value: agent.dominance, color: 'text-red-400' },
                        { label: 'I', value: agent.influence, color: 'text-yellow-400' },
                        { label: 'S', value: agent.steadiness, color: 'text-green-400' },
                        { label: 'C', value: agent.conscientiousness, color: 'text-blue-400' },
                      ].map(disc => (
                        <div key={disc.label} className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${disc.color}`}>{disc.label}</span>
                          <div className="flex-1 h-1.5 bg-slate-700 rounded-full">
                            <div className="h-full bg-slate-500 rounded-full" style={{ width: `${disc.value}%` }} />
                          </div>
                          <span className="text-[10px] text-slate-500 w-6 text-right">{disc.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            <div>
              <Label className="text-slate-300 text-xs mb-1.5 block">System Prompt Override</Label>
              <Textarea
                value={site.systemPromptOverride || ''}
                onChange={(e) => onUpdate({ systemPromptOverride: e.target.value })}
                placeholder="Leave empty to use the assigned agent's default system prompt. Enter a custom prompt to override."
                className="bg-slate-800 border-slate-700 text-white resize-none"
                rows={6}
                data-testid="input-system-prompt"
              />
              <p className="text-[10px] text-slate-500 mt-1">Custom instructions for the AI on this site.</p>
            </div>

            {/* ── Skills Panel (Lead Qualifier & Sales Closer only) ── */}
            {hasSkillPanel && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Agent Skills
                    <span className="ml-auto text-[10px] text-slate-500 font-normal">
                      {isQualifier ? 'Lead Qualifier' : 'Sales Closer'}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isQualifier && (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-200 font-medium">Empathy Mode</p>
                          <p className="text-[10px] text-slate-500">Agent pivots to calming cadence when frustration is detected in voice.</p>
                        </div>
                        <Switch
                          checked={currentSkillToggles.empathy_mode ?? true}
                          onCheckedChange={(v) => saveAgentConfiguration({
                            skillToggles: { ...currentSkillToggles, empathy_mode: v },
                          })}
                          disabled={savingAgentConfig}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-200 font-medium">Aggressive Qualification</p>
                          <p className="text-[10px] text-slate-500">Agent pushes harder on budget and authority signals. Off by default.</p>
                        </div>
                        <Switch
                          checked={currentSkillToggles.aggressive_qualification ?? false}
                          onCheckedChange={(v) => saveAgentConfiguration({
                            skillToggles: { ...currentSkillToggles, aggressive_qualification: v },
                          })}
                          disabled={savingAgentConfig}
                        />
                      </div>
                    </>
                  )}
                  {isCloser && (
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-200 font-medium">Aggressive Closing Mode</p>
                          <p className="text-[10px] text-slate-500">Agent uses stronger assumptive closes and urgency signals. Off by default.</p>
                        </div>
                        <Switch
                          checked={currentSkillToggles.aggressive_closing ?? false}
                          onCheckedChange={(v) => saveAgentConfiguration({
                            skillToggles: { ...currentSkillToggles, aggressive_closing: v },
                          })}
                          disabled={savingAgentConfig}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-200 font-medium">Urgency Injection</p>
                          <p className="text-[10px] text-slate-500">Agent activates scarcity signals after 8 min without commitment.</p>
                        </div>
                        <Switch
                          checked={currentSkillToggles.urgency_injection ?? true}
                          onCheckedChange={(v) => saveAgentConfiguration({
                            skillToggles: { ...currentSkillToggles, urgency_injection: v },
                          })}
                          disabled={savingAgentConfig}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Tool Limits (Lead Qualifier & Sales Closer only) ── */}
            {hasSkillPanel && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-400" />
                    Tool Limits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isQualifier && (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-slate-200 font-medium">Max Meetings / Day</p>
                        <p className="text-[10px] text-slate-500">Agent cannot book more than this many meetings per day via <code className="text-slate-400">book_meeting</code>.</p>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        className="w-20 bg-slate-900 border-slate-700 text-white text-center"
                        defaultValue={currentToolLimits.max_meetings_per_day ?? 10}
                        onBlur={(e) => saveAgentConfiguration({
                          toolLimits: { ...currentToolLimits, max_meetings_per_day: parseInt(e.target.value) || 10 },
                        })}
                      />
                    </div>
                  )}
                  {isCloser && (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-slate-200 font-medium">Max Discount %</p>
                        <p className="text-[10px] text-slate-500">Agent cannot offer more than this % via <code className="text-slate-400">apply_discount</code>. Excess requests are auto-capped.</p>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        className="w-20 bg-slate-900 border-slate-700 text-white text-center"
                        defaultValue={currentToolLimits.max_discount_percent ?? 10}
                        onBlur={(e) => saveAgentConfiguration({
                          toolLimits: { ...currentToolLimits, max_discount_percent: parseInt(e.target.value) || 10 },
                        })}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Tool Call Activity Log ── */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Tool Call Activity
                  <button
                    className="ml-auto text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                    onClick={() => {
                      localStorage.removeItem('gg_tool_log');
                      setToolCallLog([]);
                    }}
                  >
                    Clear
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {toolCallLog.length === 0 ? (
                  <p className="text-[11px] text-slate-600 italic text-center py-3">
                    No tool calls recorded yet. Start a voice session to see agent tool activity here.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {toolCallLog.map((entry, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <span className="text-slate-600 font-mono shrink-0">
                          {new Date(entry.ts).toLocaleTimeString()}
                        </span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${
                          entry.tool?.includes('crm') || entry.tool?.includes('qualify') ? 'text-emerald-400 border-emerald-400/30' :
                          entry.tool?.includes('checkout') || entry.tool?.includes('discount') ? 'text-blue-400 border-blue-400/30' :
                          'text-slate-400 border-slate-600'
                        }`}>
                          {entry.tool || entry.type || 'tool'}
                        </Badge>
                        <span className="text-slate-500 truncate">
                          {entry.type ? `→ ${entry.type}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="flex flex-col h-full -m-4">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-xl text-sm bg-slate-800 text-slate-400 border border-slate-700 rounded-tl-none flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-slate-700 shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); sendTestChat(); }} className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Test your chatbot..."
                  className="bg-slate-800 border-slate-700 text-white flex-1"
                  disabled={chatLoading}
                  data-testid="input-test-chat"
                />
                <Button type="submit" size="icon" disabled={chatLoading || !chatInput.trim()} data-testid="button-send-test">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <p className="text-[10px] text-slate-500 mt-1.5 text-center">
                Using {site.modelProvider || 'gemini'} {site.modelName ? `(${site.modelName})` : ''} with auto-fallback
              </p>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-3">
            {logsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 bg-slate-800" />)}
              </div>
            ) : chatLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-500" />
                <p className="text-sm font-medium text-slate-700">No chat conversations yet.</p>
                <p className="text-xs text-slate-600 mt-1">Visitor conversations will appear here.</p>
              </div>
            ) : (
              chatLogs.map((log: any, i: number) => (
                <div key={i} className={`p-3 rounded-lg border text-sm ${
                  log.role === 'user'
                    ? 'bg-slate-800/50 border-slate-700 text-slate-300'
                    : 'bg-indigo-500/5 border-indigo-500/10 text-slate-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {log.role === 'user' ? 'Visitor' : 'AI Bot'}
                    </Badge>
                    {log.createdAt && (
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs">{log.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'embed' && (
          <div className="space-y-5">
            {!site.chatbotEnabled && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-amber-300 font-medium">Chatbot is disabled</p>
                  <p className="text-[10px] text-amber-400/70">Enable the chatbot in Settings for the embed script to work. The widget will not load until the chatbot is enabled.</p>
                </div>
              </div>
            )}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                  <Code className="w-4 h-4 text-emerald-400" />
                  Embed Script
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-400">
                  Add this script to any website to deploy the AI chat widget. Place it before the closing {'</body>'} tag.
                </p>
                <div className="relative">
                  <pre className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-emerald-400 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                    {embedCode}
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyEmbedCode}
                    className="absolute top-2 right-2"
                    data-testid="button-copy-embed"
                  >
                    {embedCopied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                    {embedCopied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Widget Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-700">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg shrink-0"
                    style={{ backgroundColor: site.widgetColor || '#2563eb' }}
                  >
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium">Chat Widget Button</p>
                    <p className="text-[10px] text-slate-400">Position: {site.widgetPosition || 'bottom-right'}</p>
                    <p className="text-[10px] text-slate-400">Color: {site.widgetColor || '#2563eb'}</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="p-3 flex items-center gap-2" style={{ backgroundColor: site.widgetColor || '#2563eb' }}>
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
                      {site.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">{site.name}</p>
                      <p className="text-white/70 text-[10px]">Online</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50">
                    <div className="bg-white rounded-lg px-3 py-2 text-xs text-slate-700 border border-slate-100 inline-block">
                      {site.greetingMessage || 'Hello! How can I help you today?'}
                    </div>
                  </div>
                  <div className="p-2 border-t border-slate-200 flex gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full px-3 py-1.5 text-[10px] text-slate-400">
                      {site.placeholderText || 'Type a message...'}
                    </div>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: site.widgetColor || '#2563eb' }}>
                      <Send className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-slate-300">Configuration Summary</p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="text-slate-400">Site UUID</div>
                <button
                  className="text-slate-300 font-mono text-[10px] flex items-center gap-1 hover:text-indigo-300 transition-colors col-span-1"
                  title="Click to copy UUID"
                  onClick={() => {
                    navigator.clipboard.writeText(site.id);
                    toast({ title: "Copied", description: "Site UUID copied to clipboard" });
                  }}
                >
                  {site.id.slice(0, 16)}...
                  <Copy className="w-2.5 h-2.5 flex-shrink-0" />
                </button>
                <div className="text-slate-400">Provider</div>
                <div className="text-slate-300">{site.modelProvider || 'gemini'}</div>
                <div className="text-slate-400">Chatbot</div>
                <div className={site.chatbotEnabled ? 'text-emerald-400' : 'text-red-400'}>
                  {site.chatbotEnabled ? 'Enabled' : 'Disabled'}
                </div>
                <div className="text-slate-400">Widget Position</div>
                <div className="text-slate-300">{site.widgetPosition || 'bottom-right'}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isUpdating && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-10">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      )}
      </div>
      </div>
    </div>
  );
}

function CreateSiteDialog({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (data: { name: string; domain?: string; placeId?: string }) => void;
}) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-white font-bold">New Site Configuration</h3>
          <p className="text-xs text-slate-400">Add a business website to manage</p>
        </div>
      </div>
      <div>
        <Label className="text-slate-300 text-xs mb-1.5 block">Business Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Joe's Coffee Shop"
          className="bg-slate-800 border-slate-700 text-white"
          data-testid="input-new-site-name"
        />
      </div>
      <div>
        <Label className="text-slate-300 text-xs mb-1.5 block">Domain (optional)</Label>
        <Input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="e.g. joescoffee.gatewayglobal.ai"
          className="bg-slate-800 border-slate-700 text-white"
          data-testid="input-new-site-domain"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1" data-testid="button-cancel-create">Cancel</Button>
        <Button onClick={() => onCreate({ name, domain: domain || undefined })} disabled={!name.trim()} className="flex-1" data-testid="button-confirm-create">
          <Plus className="w-4 h-4 mr-1" /> Create
        </Button>
      </div>
    </div>
  );
}

type MainView = 'account' | 'config' | 'chat';

export default function AiBizBotAdmin() {
  const { toast } = useToast();
  const [location] = useLocation();
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [mainView, setMainView] = useState<MainView>('account');
  const [isCreating, setIsCreating] = useState(false);

  const { data: sites = [], isLoading: sitesLoading } = useQuery<SiteConfig[]>({
    queryKey: ['/api/site-configs'],
  });

  // Deep link: /aibizbot?site=ID and ?tab=identity-manager — open with site selected and QR tab active (e.g. from chat menu "QR codes & decals")
  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const siteId = params.get('site');
    const tab = params.get('tab');
    if (siteId && sites.length > 0 && sites.some(s => s.id === siteId)) {
      setSelectedSiteId(siteId);
      setMainView('config');
    }
    if (tab === 'identity-manager' && sites.length > 0) {
      setMainView('config');
      if (siteId && sites.some(s => s.id === siteId)) setSelectedSiteId(siteId);
      else if (!selectedSiteId && sites[0]) setSelectedSiteId(sites[0].id);
    }
  }, [location, sites]);

  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ['/api/agents'],
  });

  const { data: demoLeads = [] } = useQuery<DemoLeadRow[]>({
    queryKey: ['/api/admin/demo-leads'],
    queryFn: () => fetch('/api/admin/demo-leads').then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; domain?: string; placeId?: string }) =>
      apiRequest('POST', '/api/site-configs', data),
    onSuccess: async (res) => {
      const created = await res.json();
      queryClient.invalidateQueries({ queryKey: ['/api/site-configs'] });
      setSelectedSiteId(created.id);
      setIsCreating(false);
      toast({ title: 'Site created' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<SiteConfig> }) =>
      apiRequest('PATCH', `/api/site-configs/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/site-configs'] });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/site-configs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/site-configs'] });
      setSelectedSiteId(null);
      setMainView('account');
      toast({ title: 'Site deleted' });
    },
    onError: (err: any) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const handleUpdate = useCallback((updates: Partial<SiteConfig>) => {
    if (!selectedSiteId) return;
    updateMutation.mutate({ id: selectedSiteId, updates });
  }, [selectedSiteId, updateMutation]);

  const search = typeof window !== 'undefined' ? window.location.search : '';
  const isSingleSiteMode = new URLSearchParams(search).get('single') === '1';
  const selectedSite = selectedSiteId ? sites.find((s) => s.id === selectedSiteId) : null;

  // No separate left sidebar: site selection lives in the dashboard (Your sites) and in the top bar when editing.
  return (
    <div className="flex h-full bg-slate-950">
      <div className="flex-1 relative flex flex-col min-w-0">
        {isSingleSiteMode && (
          <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white">
            <Link href="/platform/tenants">
              <span className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors cursor-pointer">
                <ArrowLeft className="w-4 h-4" />
                Back to Business Customers
              </span>
            </Link>
            <span className="text-slate-400">|</span>
            <span className="text-slate-900 font-medium">
              Managing: {selectedSite?.name ?? (selectedSiteId ? '…' : 'Select a site')}
            </span>
          </div>
        )}
        {/* When a site is selected (and not single-site mode), show top bar: Back to dashboard + site name */}
        {!isSingleSiteMode && selectedSiteId && selectedSite && (
          <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/80">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white"
                onClick={() => { setSelectedSiteId(null); setMainView('account'); }}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to dashboard
              </Button>
              <span className="text-slate-400">|</span>
              <span className="font-medium text-white truncate">Managing: {selectedSite.name}</span>
            </div>
          </div>
        )}
        {mainView === 'chat' ? (
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 p-2 border-b border-slate-200 bg-white shrink-0">
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900" onClick={() => setMainView(selectedSiteId ? 'config' : 'account')}>
                ← Back
              </Button>
            </div>
            <div className="flex-1 min-h-0">
              <StandardizedChatInterface
                mode="owner"
                siteConfigId={selectedSiteId || 'owner-portal'}
                botName="AI Biz Bot"
                fullscreen={true}
              />
            </div>
          </div>
        ) : selectedSiteId && sites.find(s => s.id === selectedSiteId) ? (
          <>
            <AdminPanel
              site={sites.find(s => s.id === selectedSiteId)!}
              agents={agents}
              onUpdate={handleUpdate}
              isUpdating={updateMutation.isPending}
              initialTab={(() => {
                if (typeof window === 'undefined') return undefined;
                const t = new URLSearchParams(window.location.search).get('tab');
                if (t === 'identity-manager') return 'qr-network';
                if (t === 'publishing') return 'publishing';
                if (t === 'home') return 'home';
                return undefined;
              })()}
              horizontalTabs={isSingleSiteMode}
            />
            <div className="absolute top-4 right-4 z-20">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (confirm('Delete this site configuration?')) {
                    deleteMutation.mutate(selectedSiteId);
                  }
                }}
                className="text-red-600 border-red-300 hover:bg-red-50"
                data-testid="button-delete-site"
              >
                <Trash2 className="w-3 h-3 mr-1" /> Delete
              </Button>
            </div>
          </>
        ) : isSingleSiteMode && selectedSiteId ? (
          <div className="h-full overflow-y-auto p-6 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <Bot className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm mb-4">Site not found. It may have been deleted.</p>
              <Link href="/platform/tenants">
                <span className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 cursor-pointer">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Business Customers
                </span>
              </Link>
            </div>
          </div>
        ) : isCreating ? (
          <div className="h-full overflow-y-auto bg-slate-950 p-6 flex items-start justify-center">
            <div className="w-full max-w-md rounded-sui bg-slate-900/40 border border-indigo-500/20 p-6">
              <CreateSiteDialog
                onCancel={() => setIsCreating(false)}
                onCreate={(data) => createMutation.mutate(data)}
              />
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto bg-slate-950">
            <AiBizBotDashboard
              sitesCount={sites.length}
              demoLeadsCount={demoLeads.length}
              onAddSite={() => setIsCreating(true)}
              sites={sites.map((s) => ({
                id: s.id,
                name: s.name,
                domain: s.domain,
                slug: s.slug,
                chatbotEnabled: s.chatbotEnabled ?? undefined,
                placeData: s.placeData as { rating?: number } | null,
              }))}
              onSelectSite={(id) => { setSelectedSiteId(id); setMainView('config'); }}
              demoLeads={demoLeads.map((l) => ({
                id: l.id,
                businessName: l.businessName,
                phone: l.phone,
                demoUrl: l.demoUrl,
                siteId: l.siteId,
                createdAt: l.createdAt,
              }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
