import { useEffect, useState, useCallback, useRef } from 'react';
import { useRoute, useLocation, Link } from 'wouter';
import { Loader2, ArrowLeft, CheckCircle2, Phone, MessageSquare, Globe, Mail, Shield, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConciergePanel } from '@/components/chat/ConciergePanel';
import { StorefrontQRGenerator } from '@/components/storefront/StorefrontQRGenerator';
import { VoiceClientFactory } from '@/services/voice/VoiceClientFactory';
import { ensureApiLoader, loadPlacesLibrary } from '@/utils/googleMapsLoader';
import headerLogo from '@assets/clear_voice_ai_dark_sm.png';

interface CategoryData {
  slug: string;
  displayName: string;
  location: string;
  searchQuery: string;
  industryGroup: string | null;
  report: {
    summary: string;
    whatsWorking: string[];
    whatsNotWorking: string[];
  } | null;
  imageUrls: string[];
  heroImageUrl?: string | null;
}

export default function StorefrontCategoryPage() {
  const [, params] = useRoute('/storefronts/:categorySlug');
  const [, setLocation] = useLocation();
  const categorySlug = params?.categorySlug;

  const [data, setData] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [demoSiteConfigId, setDemoSiteConfigId] = useState<string | null>(null);
  const [demoSlug, setDemoSlug] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatLayout, setChatLayout] = useState<'floating' | 'fixed' | 'fullscreen'>('floating');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ placeId: string; name: string; address: string; rating?: number }>>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{ placeId: string; name: string; address: string; internationalPhoneNumber?: string; websiteUri?: string } | null>(null);
  const [placeDetailsLoading, setPlaceDetailsLoading] = useState(false);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [mapsKey, setMapsKey] = useState<string | null>(null);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const pickerContainerRef = useRef<HTMLDivElement>(null);

  const [staticRoutes, setStaticRoutes] = useState({
    call: { enabled: true, value: '' },
    text: { enabled: true, value: '' },
    email: { enabled: false, value: '' },
    website: { enabled: true, value: '' },
  });
  const [routesConfirmed, setRoutesConfirmed] = useState(false);
  const [claimPhone, setClaimPhone] = useState('');
  const [claimCode, setClaimCode] = useState('');
  const [claimStep, setClaimStep] = useState<'phone' | 'code'>('phone');
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState<{ publicUrl: string; slug: string } | null>(null);

  // Fetch Maps API key (same as home page) for PlaceAutocompleteElement
  useEffect(() => {
    fetch('/api/config/maps-key')
      .then((r) => r.json())
      .then((d: { key?: string }) => { if (d.key) setMapsKey(d.key); })
      .catch(() => {});
  }, []);

  // Apply selected place from platform details (used by autocomplete and by list click)
  const applyPlaceFromDetails = useCallback((
    placeId: string,
    name: string,
    address: string,
    details: { international_phone_number?: string; internationalPhoneNumber?: string; website?: string; websiteUri?: string }
  ) => {
    const phone = details.international_phone_number ?? details.internationalPhoneNumber ?? '';
    const website = details.website ?? details.websiteUri ?? '';
    setSelectedPlace({
      placeId: placeId.replace(/^places\//i, ''),
      name,
      address,
      internationalPhoneNumber: phone || undefined,
      websiteUri: website || undefined,
    });
    setStaticRoutes((prev) => ({
      ...prev,
      call: { ...prev.call, value: phone },
      text: { ...prev.text, value: phone },
      website: { ...prev.website, value: website },
    }));
  }, []);

  // PlaceAutocompleteElement setup — same process as home page (Google Maps Grounding / Places)
  useEffect(() => {
    if (!mapsKey || !data || !pickerContainerRef.current) return;
    const container = pickerContainerRef.current;
    ensureApiLoader(mapsKey);
    (window as any).gm_authFailure = () => {
      setMapsError('Google Maps API not activated. Enable "Maps JavaScript API" and "Places API (New)" in Google Cloud Console.');
    };
    let cancelled = false;
    const setup = async () => {
      const { PlaceAutocompleteElement } = await loadPlacesLibrary();
      if (cancelled || !container) return;
      const autocomplete = new PlaceAutocompleteElement();
      autocomplete.setAttribute('placeholder', `e.g. ${data.searchQuery} in ${data.location}`);
      autocomplete.style.cssText = 'width:100%;display:block;';
      const style = document.createElement('style');
      style.textContent = `
        input { background: rgba(30,41,59,0.5) !important; color: #e2e8f0 !important; border: 1px solid rgba(71,85,105,0.5) !important; border-radius: 0.5rem !important; padding: 0.5rem 0.75rem !important; width: 100% !important; }
        input::placeholder { color: #94a3b8 !important; }
      `;
      (autocomplete as any).shadowRoot?.appendChild(style);
      autocomplete.addEventListener('gmp-select', async (event: any) => {
        const { placePrediction } = event;
        if (!placePrediction) return;
        const place = placePrediction.toPlace();
        const placeIdRaw = place.id ?? undefined;
        if (!placeIdRaw) return;
        setMapsError(null);
        setPlaceDetailsLoading(true);
        setSelectedPlace(null);
        try {
          const placeId = String(placeIdRaw).replace(/^places\//i, '');
          const detailsRes = await fetch(`/api/places/details/${encodeURIComponent(placeId)}`);
          if (!detailsRes.ok) throw new Error(`Details ${detailsRes.status}`);
          const details = await detailsRes.json();
          const name = details.name || placePrediction.text?.toString() || '';
          const address = details.formatted_address || '';
          applyPlaceFromDetails(placeId, name, address, details);
        } catch (err) {
          console.error('[Storefront] Place details failed:', err);
          setMapsError('Could not load business details. Try again.');
        } finally {
          setPlaceDetailsLoading(false);
        }
      });
      const handleFormSubmit = async (e: Event) => {
        e.preventDefault();
        const rawQuery = (autocomplete as any).shadowRoot?.querySelector('input')?.value?.trim();
        if (!rawQuery || !data) return;
        setMapsError(null);
        setSearching(true);
        setSelectedPlace(null);
        try {
          const query = `${rawQuery} ${data.location}`;
          const searchRes = await fetch('/api/places/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
          if (!searchRes.ok) throw new Error('Search failed');
          const searchData = await searchRes.json();
          const first = searchData.places?.[0] || searchData.results?.[0];
          if (!first) {
            setMapsError('No businesses found. Try a different name or location.');
            return;
          }
          const placeId = (first.placeId ?? first.place_id ?? '').replace(/^places\//i, '');
          const detailsRes = await fetch(`/api/places/details/${encodeURIComponent(placeId)}`);
          if (!detailsRes.ok) throw new Error('Details failed');
          const details = await detailsRes.json();
          applyPlaceFromDetails(placeId, details.name || first.name || rawQuery, details.formatted_address || first.address || '', details);
        } catch (err) {
          console.error('[Storefront] Search fallback failed:', err);
          setMapsError('Search failed. Please try again.');
        } finally {
          setSearching(false);
        }
      };
      const form = container.closest('form');
      if (form) form.addEventListener('submit', handleFormSubmit);
      container.appendChild(autocomplete);
      return () => {
        if (form) form.removeEventListener('submit', handleFormSubmit);
      };
    };
    let teardown: (() => void) | undefined;
    setup()
      .then((fn) => { teardown = fn; })
      .catch((err) => { console.error('[Storefront] Places library failed:', err); setMapsError('Could not load place search.'); });
    return () => {
      cancelled = true;
      if (teardown) teardown();
      container.innerHTML = '';
    };
  }, [mapsKey, data, applyPlaceFromDetails]);

  const doSearch = useCallback(() => {
    if (!searchQuery.trim() || !data) return;
    setSearching(true);
    const query = `${searchQuery.trim()} ${data.location}`;
    fetch('/api/places/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
      .then((r) => r.json())
      .then((res: { places?: Array<{ placeId: string; name: string; address: string; rating?: number }> }) => {
        setSearchResults(res.places?.slice(0, 8) ?? []);
      })
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, [searchQuery, data]);

  const selectPlace = useCallback((place: { placeId: string; name: string; address: string }) => {
    setPlaceDetailsLoading(true);
    setSelectedPlace(null);
    const placeId = place.placeId.replace(/^places\//i, '');
    fetch(`/api/places/details/${encodeURIComponent(placeId)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((details: Record<string, unknown> | null) => {
        if (!details) {
          setSelectedPlace({ placeId: place.placeId, name: place.name, address: place.address });
          return;
        }
        applyPlaceFromDetails(placeId, place.name, place.address, details as any);
      })
      .finally(() => setPlaceDetailsLoading(false));
  }, [applyPlaceFromDetails]);

  const createDemo = useCallback(() => {
    if (!categorySlug || !selectedPlace) return;
    setCreatingDemo(true);
    setDemoError(null);
    fetch(`/api/storefronts/${encodeURIComponent(categorySlug)}/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        placeId: selectedPlace.placeId,
        name: selectedPlace.name,
        formattedAddress: selectedPlace.address,
        internationalPhoneNumber: selectedPlace.internationalPhoneNumber,
        websiteUri: selectedPlace.websiteUri,
        staticRoutes: {
          call: { enabled: staticRoutes.call.enabled, value: staticRoutes.call.value },
          text: { enabled: staticRoutes.text.enabled, value: staticRoutes.text.value },
          email: { enabled: staticRoutes.email.enabled, value: staticRoutes.email.value },
          website: { enabled: staticRoutes.website.enabled, value: staticRoutes.website.value },
        },
      }),
    })
      .then((r) => r.json())
      .then((res: { siteConfigId?: string; slug?: string }) => {
        if (res.siteConfigId) setDemoSiteConfigId(res.siteConfigId);
        if (res.slug) setDemoSlug(res.slug);
      })
      .catch((e) => setDemoError(e.message ?? 'Failed to create demo'))
      .finally(() => setCreatingDemo(false));
  }, [categorySlug, selectedPlace, staticRoutes]);

  const confirmRoutes = useCallback(() => {
    if (!demoSiteConfigId) return;
    setRoutesConfirmed(true);
    fetch(`/api/storefronts/demo/${demoSiteConfigId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staticRoutes }),
    }).catch(() => {});
  }, [demoSiteConfigId, staticRoutes]);

  const sendClaimCode = useCallback(() => {
    if (!demoSiteConfigId || !claimPhone.trim()) return;
    setClaiming(true);
    fetch('/api/storefronts/demo/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: claimPhone.replace(/\D/g, '').replace(/^1/, ''), siteConfigId: demoSiteConfigId }),
    })
      .then((r) => r.json())
      .then(() => setClaimStep('code'))
      .finally(() => setClaiming(false));
  }, [demoSiteConfigId, claimPhone]);

  const verifyClaim = useCallback(() => {
    if (!demoSiteConfigId || !claimCode.trim()) return;
    setClaiming(true);
    fetch('/api/storefronts/demo/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: claimPhone.replace(/\D/g, ''), siteConfigId: demoSiteConfigId, code: claimCode }),
    })
      .then((r) => r.json())
      .then((res: { success?: boolean; publicUrl?: string; slug?: string }) => {
        if (res.success && res.publicUrl) setClaimSuccess({ publicUrl: res.publicUrl, slug: res.slug ?? '' });
      })
      .finally(() => setClaiming(false));
  }, [demoSiteConfigId, claimPhone, claimCode]);

  const voiceConfig = VoiceClientFactory.getDefaultConfig('premium');
  const currentBusiness = {
    id: demoSiteConfigId ?? 'platform_landing',
    placeId: '',
    name: data?.displayName ?? 'Storefront',
    address: data?.location ?? '',
    hours: '',
    services: [],
    primaryColor: '#6366f1',
  };

  useEffect(() => {
    if (!categorySlug) return;
    fetch(`/api/storefronts/${encodeURIComponent(categorySlug)}`)
      .then((r) => { if (!r.ok) throw new Error('Category not found'); return r.json(); })
      .then(setData)
      .catch((e) => { setError(e.message); })
      .finally(() => setLoading(false));
  }, [categorySlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center flex-col gap-4 text-slate-400">
        <p className="text-lg">{error || 'Category not found.'}</p>
        <Link href="/storefronts">
          <Button variant="ghost" className="text-indigo-400">Back to Storefronts</Button>
        </Link>
      </div>
    );
  }

  const heroImage = data.imageUrls?.[0] ?? data.heroImageUrl ?? null;
  const report = data.report;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/20 backdrop-blur-md border-b border-white/10 px-6 py-3 flex items-center gap-4">
        <Link href="/storefronts">
          <button type="button" className="p-1 rounded-lg text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <img src={headerLogo} alt="Clear Voice AI" className="h-9 w-auto object-contain" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.2))' }} />
      </nav>

      {/* Hero — background from Flux images or category hero_image_url (reference image) */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 pt-20 pb-16 overflow-hidden">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={
            heroImage
              ? { backgroundImage: `url(${heroImage})` }
              : undefined
          }
        >
          {!heroImage && (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900" />
          )}
          <div className="absolute inset-0 bg-slate-950/60" aria-hidden="true" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            AI for {data.displayName} in {data.location}
          </h1>
          <p className="text-xl text-slate-300">Claim your free profile and get your AI-powered storefront.</p>
        </div>
      </section>

      {/* Industry summary */}
      {report && (
        <section className="relative z-10 max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold text-white mb-6">Industry snapshot</h2>
          <motion.div
            className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-6 space-y-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-slate-300 leading-relaxed">{report.summary}</p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-emerald-400 mb-2">What&apos;s working</h3>
                <ul className="space-y-1">
                  {report.whatsWorking.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-400 mb-2">What&apos;s not working</h3>
                <ul className="space-y-1">
                  {report.whatsNotWorking.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                      <span className="text-amber-400">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* How it works: 3 steps + QR generator */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-16 border-t border-slate-700/50">
        <h2 className="text-2xl font-bold text-white mb-8">How it works</h2>

        <div className="space-y-8">
          <motion.div
            className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="flex w-8 h-8 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-sm">1</span>
              <h3 className="font-semibold text-white">Find your business</h3>
            </div>
            <p className="text-slate-400 text-sm mb-4">Search for your business and we&apos;ll import your Google Business info to power your AI agent.</p>
            {mapsKey ? (
              <form className="mb-3">
                <div ref={pickerContainerRef} className="w-full min-h-[40px]" />
              </form>
            ) : (
              <div className="flex gap-2 mb-3">
                <Input
                  placeholder={`e.g. ${data.searchQuery} in ${data.location}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), doSearch())}
                  className="bg-slate-800 border-slate-700 text-white"
                />
                <Button onClick={doSearch} disabled={searching} variant="secondary">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            )}
            {mapsError && <p className="text-xs text-red-400 mb-2">{mapsError}</p>}
            {(placeDetailsLoading || searching) && <p className="text-xs text-slate-500 mb-2">Loading…</p>}
            {searchResults.length > 0 && (
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {searchResults.map((p) => (
                  <li key={p.placeId}>
                    <button
                      type="button"
                      onClick={() => selectPlace(p)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-sm text-slate-200"
                    >
                      {p.name} — {p.address}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selectedPlace && (
              <div className="mt-3 p-3 rounded-lg bg-slate-800/50 border border-indigo-500/20">
                <p className="font-medium text-white">{selectedPlace.name}</p>
                <p className="text-xs text-slate-400">{selectedPlace.address}</p>
                {!demoSiteConfigId ? (
                  <Button className="mt-3" onClick={createDemo} disabled={creatingDemo}>
                    {creatingDemo ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Create my demo
                  </Button>
                ) : (
                  <p className="text-xs text-emerald-400 mt-2">Demo created. Continue to step 2 & 3.</p>
                )}
                {demoError && <p className="text-xs text-red-400 mt-2">{demoError}</p>}
              </div>
            )}
          </motion.div>

          <motion.div
            className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="flex w-8 h-8 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-sm">2</span>
              <h3 className="font-semibold text-white">Design your QR code</h3>
            </div>
            <p className="text-slate-400 text-sm mb-4">Customize colors and background. Preview updates in real time.</p>
            <StorefrontQRGenerator demoUrl={demoSlug ? `${window.location.origin}/biz/${demoSlug}` : undefined} />
          </motion.div>

          <motion.div
            className="rounded-sui bg-slate-900/40 border border-indigo-500/20 backdrop-blur-xl p-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="flex w-8 h-8 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-sm">3</span>
              <h3 className="font-semibold text-white">Verify customer routes</h3>
            </div>
            <div className="rounded-lg bg-slate-800/50 border border-slate-600/50 p-4 mb-4 flex items-start gap-3">
              <Shield className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300">
                Your AI assistant only answers from your business information. Call, text, email, and website links can be turned on or off (defaults from your Google Business page).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              {[
                { key: 'call' as const, icon: Phone, label: 'Call' },
                { key: 'text' as const, icon: MessageSquare, label: 'Text' },
                { key: 'email' as const, icon: Mail, label: 'Email' },
                { key: 'website' as const, icon: Globe, label: 'Website' },
              ].map(({ key, icon: Icon, label }) => (
                <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50">
                  <input
                    type="checkbox"
                    checked={staticRoutes[key].enabled}
                    onChange={(e) => setStaticRoutes((prev) => ({ ...prev, [key]: { ...prev[key], enabled: e.target.checked } }))}
                    className="rounded border-slate-600"
                  />
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300">{label}</span>
                  <span className="ml-auto text-slate-500 font-mono text-xs truncate max-w-[100px]" title={staticRoutes[key].value || '—'}>{staticRoutes[key].value || '—'}</span>
                </div>
              ))}
            </div>
            {demoSiteConfigId && !routesConfirmed && (
              <Button onClick={confirmRoutes} className="mb-4">Confirm routes & enable AI</Button>
            )}
            {routesConfirmed && demoSiteConfigId && (
              <>
                <p className="text-xs text-emerald-400 mb-3">Routes confirmed. Save with your phone to view your demo.</p>
                {claimSuccess ? (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                    <p className="text-sm text-white font-medium">Your demo is ready</p>
                    <a href={claimSuccess.publicUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 text-sm underline">
                      Open my demo →
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {claimStep === 'phone' ? (
                      <>
                        <Input
                          type="tel"
                          placeholder="Phone number"
                          value={claimPhone}
                          onChange={(e) => setClaimPhone(e.target.value)}
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                        <Button onClick={sendClaimCode} disabled={claiming || !claimPhone.trim()}>
                          {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          Send verification code
                        </Button>
                      </>
                    ) : (
                      <>
                        <Input
                          placeholder="6-digit code"
                          value={claimCode}
                          onChange={(e) => setClaimCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                        <Button onClick={verifyClaim} disabled={claiming || claimCode.length !== 6}>
                          {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          Verify & view demo
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* Chat button + ConciergePanel */}
      <button
        type="button"
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-20 h-20 md:w-24 md:h-24 rounded-full shadow-lg shadow-indigo-500/30 bg-transparent hover:bg-indigo-500/10 border border-indigo-400/30 p-1.5 overflow-visible flex-shrink-0"
        aria-label="Open chat"
      >
        <img src="/chat-header-logo.png" alt="Chat & Voice" className="w-full h-full object-contain scale-[1.81]" />
      </button>
      {isChatOpen && data && (
        <ConciergePanel
          business={currentBusiness}
          agent={{
            role: demoSiteConfigId ? 'Business Concierge' : 'Platform Sales Agent',
            personality: 'Helpful, professional, and enthusiastic',
            objectives: demoSiteConfigId
              ? ['Represent the business and answer from provided information only', 'Help with hours, services, and location']
              : ['Help visitors understand the storefront demo', 'Guide through Find Business, Design QR, Verify Routes'],
            constraints: ['Be polite and professional', 'Keep responses concise'],
          }}
          voiceConfig={voiceConfig}
          agentName={demoSiteConfigId ? 'Concierge' : 'Gateway AI Assistant'}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          initialView="voice"
          layoutMode={chatLayout}
          onCycleLayout={() => {
            const modes: Array<'floating' | 'fixed' | 'fullscreen'> = ['floating', 'fixed', 'fullscreen'];
            const next = modes[(modes.indexOf(chatLayout) + 1) % modes.length];
            setChatLayout(next);
          }}
          variant="sovereign"
        />
      )}
    </div>
  );
}
