import { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import WebsitePreview from '@/components/WebsitePreview';

/**
 * PublicBusinessPage — public-facing business page at /biz/:slug
 *
 * - No auth required.
 * - Reads ?ref=:userId from the URL and stores it in sessionStorage so
 *   the referrer can be attributed to any subsequent chat/call/booking.
 * - Renders WebsitePreview with full concierge functionality.
 */
export default function PublicBusinessPage() {
  const [, params] = useRoute('/biz/:slug');
  const [, setLocation] = useLocation();
  const slug = params?.slug;

  const [siteData, setSiteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Capture the referrer UUID from ?ref= and persist for the session
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) {
      sessionStorage.setItem('shareRef', ref);
    }
  }, []);

  useEffect(() => {
    if (!slug) return;
    const params = new URLSearchParams(window.location.search);
    const fromQr = params.get('from') === 'qr';
    // ?mode= lets the QR router pre-supply workspaceState to skip a redundant DB call
    const modeFromQr = params.get('mode') as any | null;
    const url = `/api/site-configs/by-slug/${encodeURIComponent(slug)}${fromQr ? '?from=qr' : ''}`;
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('Business not found');
        return r.json();
      })
      .then(data => {
        // If QR router pre-supplied the workspace state, trust it (avoids round-trip)
        if (modeFromQr && !data.workspaceState) data.workspaceState = modeFromQr;
        setSiteData(data);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error || !siteData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center flex-col gap-4 text-slate-400">
        <p className="text-lg">{error || 'Business not found.'}</p>
        <button
          onClick={() => setLocation('/')}
          className="text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
        >
          Back to Gateway Global AI
        </button>
      </div>
    );
  }

  const placeData = siteData.placeData || { name: siteData.name, formatted_address: '' };
  const heroImageUrl =
    siteData.heroImageUrl ??
    (siteData.placeId ? `/api/places/photo-proxy/${encodeURIComponent(siteData.placeId)}?maxWidth=1200` : undefined);

  return (
    <WebsitePreview
      place={placeData}
      siteConfigId={siteData.id}
      placeId={siteData.placeId || placeData.place_id}
      heroImageUrl={heroImageUrl}
      publicSlug={slug ?? undefined}
      workspaceState={siteData.workspaceState ?? 'demo'}
      ownerId={siteData.ownerId ?? null}
      onBack={() => setLocation('/')}
    />
  );
}
