/**
 * Sales funnels + phased workflow JSON editor (MVP). Drag-and-drop graph: future phase.
 */
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Save, Sparkles } from 'lucide-react';
import { loadFunnelContextKeys, saveFunnelContextKeys } from '@/lib/funnelContext';
import { CANVAS } from '@/config/brand';

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('gateway_auth_token') : null;
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) (h as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  return h;
}

export function SalesFunnelsEditor({
  siteConfigId,
  onFunnelContextChanged,
}: {
  siteConfigId: string;
  onFunnelContextChanged?: () => void;
}) {
  const [jsonText, setJsonText] = useState('[]');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salonName, setSalonName] = useState('');
  const [city, setCity] = useState('');
  const [demoReady, setDemoReady] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/site-configs/${encodeURIComponent(siteConfigId)}/funnels`, { headers: authHeaders() });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setJsonText(JSON.stringify(data.sales_funnels ?? [], null, 2));
      const keys = loadFunnelContextKeys(siteConfigId);
      setSalonName(keys.owner_salon_name ?? '');
      setCity(keys.owner_city ?? '');
      setDemoReady(keys.demo_ready === '1' || keys.demo_ready === 'true');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load funnels');
    } finally {
      setLoading(false);
    }
  }, [siteConfigId]);

  useEffect(() => {
    load();
  }, [load]);

  const persistContextKeys = () => {
    const keys: Record<string, string> = {};
    if (salonName.trim()) keys.owner_salon_name = salonName.trim();
    if (city.trim()) keys.owner_city = city.trim();
    if (demoReady) keys.demo_ready = '1';
    saveFunnelContextKeys(siteConfigId, keys);
    onFunnelContextChanged?.();
  };

  const saveJson = async () => {
    setSaving(true);
    setError(null);
    try {
      const funnels = JSON.parse(jsonText);
      const r = await fetch(`/api/site-configs/${encodeURIComponent(siteConfigId)}/funnels`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ funnels }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? err.details ?? (await r.text()));
      }
      persistContextKeys();
    } catch (e: any) {
      setError(e?.message ?? 'Invalid JSON or save failed');
    } finally {
      setSaving(false);
    }
  };

  const applyNailSalon = async () => {
    setApplying(true);
    setError(null);
    try {
      const r = await fetch(`/api/site-configs/${encodeURIComponent(siteConfigId)}/funnels/apply-template`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ templateId: 'nail_salon_v1' }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? (await r.text()));
      }
      const data = await r.json();
      setJsonText(JSON.stringify(data.sales_funnels ?? [], null, 2));
      persistContextKeys();
    } catch (e: any) {
      setError(e?.message ?? 'Apply template failed');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 gap-2" style={{ backgroundColor: CANVAS.bg }}>
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading funnels…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-3xl mx-auto w-full text-left" style={{ backgroundColor: CANVAS.bg }}>
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Sales funnels & phased workflow</h2>
        <p className="text-xs text-slate-500 mt-1">
          Edit JSON (validated server-side). See docs-governance/PHASED_INDUSTRY_FUNNEL_SPEC.md. Drag-and-drop editor is
          planned; reconnect voice after changing context keys.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 p-3 space-y-2">
        <p className="text-xs font-semibold text-slate-700">Funnel context keys (phased disclosure)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label className="text-xs text-slate-600">
            Salon name
            <input
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
              value={salonName}
              onChange={(e) => setSalonName(e.target.value)}
              placeholder="Owner salon name"
            />
          </label>
          <label className="text-xs text-slate-600">
            City / state
            <input
              className="mt-1 w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City, ST"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
          <input type="checkbox" checked={demoReady} onChange={(e) => setDemoReady(e.target.checked)} />
          Demo ready (personalized demo acknowledged)
        </label>
        <button
          type="button"
          onClick={persistContextKeys}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
        >
          Save context keys &amp; refresh voice session
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={applyNailSalon}
          disabled={applying}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium disabled:opacity-50"
        >
          {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Apply Nail Salon v1 template
        </button>
        <button
          type="button"
          onClick={saveJson}
          disabled={saving}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-800 text-sm font-medium disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save JSON
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <textarea
        className="w-full min-h-[280px] font-mono text-xs border border-slate-200 rounded-xl p-3 text-slate-800"
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}
