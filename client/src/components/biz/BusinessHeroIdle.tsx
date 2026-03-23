/**
 * BusinessHeroIdle — Branded idle canvas for /biz/:slug pages.
 *
 * Renders inside ConciergePanel's `idleContent` slot (messages.length === 0).
 * Shows the business hero image as background with a frosted-glass info card
 * and two CTAs: Voice Concierge (starts voice) and Main Menu (opens menu drawer).
 *
 * If no heroImageUrl is available, triggers POST /api/site-configs/:id/generate-hero-image
 * to auto-generate one via Imagen 3. Shows a pulsing skeleton while generating.
 *
 * The menu drawer slides up from the bottom, showing the OS menu cards for the
 * current role + any enabled external links (website, online store).
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Menu, X, Globe, ShoppingBag, Star, MapPin, Phone,
  ChevronRight, ExternalLink, ArrowLeft
} from 'lucide-react';
import { OSMenuList } from '@/components/os/OSMenuList';
import { useOSMenu } from '@/hooks/useOSMenu';
import type { OSCapabilities, OSMenuItem } from '@/hooks/useOSMenu';

interface PlaceData {
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  formatted_phone_number?: string;
  types?: string[];
  editorial_summary?: string;
}

interface BusinessHeroIdleProps {
  place: PlaceData;
  heroImageUrl?: string | null;
  siteConfigId?: string | null;
  publicSlug?: string | null;
  websiteUrl?: string | null;
  onlineStoreUrl?: string | null;
  capabilities: OSCapabilities;
  isAuthenticated: boolean;
  onStartVoice: () => void;
  onMenuAction: (viewId: string) => void;
}

/** Formats Google Places type strings into readable category labels. */
function formatCategory(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace('Establishment', '')
    .trim();
}

/** Renders star rating dots. */
function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={11}
          className={
            i < full
              ? 'text-amber-400 fill-amber-400'
              : i === full && half
              ? 'text-amber-300 fill-amber-300'
              : 'text-slate-300 fill-slate-300'
          }
        />
      ))}
    </div>
  );
}

/** Inner menu panel — rendered inside the slide-up drawer. */
function MenuDrawerContent({
  capabilities,
  isAuthenticated,
  websiteUrl,
  onlineStoreUrl,
  onMenuAction,
  onClose,
}: {
  capabilities: OSCapabilities;
  isAuthenticated: boolean;
  websiteUrl?: string | null;
  onlineStoreUrl?: string | null;
  onMenuAction: (viewId: string) => void;
  onClose: () => void;
}) {
  const items = useOSMenu(isAuthenticated ? 'employee' : 'customer', isAuthenticated, capabilities);
  const hasLinks = !!(websiteUrl || onlineStoreUrl);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Drawer header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Close menu"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-slate-800">Menu</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X size={15} />
        </button>
      </div>

      {/* Scrollable menu content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {items.length > 0 && (
          <OSMenuList
            items={items}
            columns={1}
            onSelect={(item: OSMenuItem) => {
              if (item.viewId) {
                onMenuAction(item.viewId);
                onClose();
              }
            }}
            className="pb-1"
          />
        )}

        {/* External links section */}
        {hasLinks && (
          <div className="px-4 pb-4">
            {items.length > 0 && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 mt-1">Links</p>
            )}
            <div className="space-y-2">
              {websiteUrl && (
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-white hover:border-indigo-200 hover:shadow-sm transition-all group"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                    <Globe size={14} className="text-indigo-500" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800 flex-1">Website</span>
                  <ExternalLink size={12} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
                </a>
              )}
              {onlineStoreUrl && (
                <a
                  href={onlineStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-white hover:border-indigo-200 hover:shadow-sm transition-all group"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
                    <ShoppingBag size={14} className="text-indigo-500" />
                  </div>
                  <span className="text-sm font-semibold text-slate-800 flex-1">Online Store</span>
                  <ExternalLink size={12} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
                </a>
              )}
            </div>
          </div>
        )}

        {items.length === 0 && !hasLinks && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <p className="text-sm text-slate-500">No menu items available yet.</p>
            <p className="text-xs text-slate-400 mt-1">Ask the voice concierge for help.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function BusinessHeroIdle({
  place,
  heroImageUrl,
  siteConfigId,
  publicSlug: _publicSlug,
  websiteUrl,
  onlineStoreUrl,
  capabilities,
  isAuthenticated,
  onStartVoice,
  onMenuAction,
}: BusinessHeroIdleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [generatedHeroUrl, setGeneratedHeroUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  // Locked after first press — prevents double-tap crashes
  const [voiceActivated, setVoiceActivated] = useState(false);

  const effectiveHeroUrl = heroImageUrl || generatedHeroUrl;

  // Auto-generate hero image if none exists
  useEffect(() => {
    if (!heroImageUrl && siteConfigId && !generatedHeroUrl && !isGenerating) {
      setIsGenerating(true);
      fetch(`/api/site-configs/${siteConfigId}/generate-hero-image`, { method: 'POST' })
        .then(r => r.json())
        .then((d: any) => {
          if (d.heroImageUrl) setGeneratedHeroUrl(d.heroImageUrl);
        })
        .catch(() => {})
        .finally(() => setIsGenerating(false));
    }
  }, [heroImageUrl, siteConfigId, generatedHeroUrl, isGenerating]);

  // Primary category for display
  const category = place.types
    ?.filter(t => !['point_of_interest', 'establishment', 'premise', 'political', 'locality'].includes(t))
    ?.[0];

  const addressLine = (() => {
    const parts = (place.formatted_address || '').split(',');
    return parts.slice(0, 2).join(',').trim();
  })();

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* ── Background hero image ── */}
      {effectiveHeroUrl ? (
        <motion.div
          key={effectiveHeroUrl}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 bg-slate-900"
          style={{
            backgroundImage: `url(${effectiveHeroUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ) : (
        /* Skeleton placeholder while generating */
        <div className={`absolute inset-0 bg-slate-800 ${isGenerating ? 'animate-pulse' : ''}`} />
      )}

      {/* Dark gradient overlay — heavier at bottom where the card lives */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 via-slate-900/30 to-slate-900/80 pointer-events-none" />

      {/* ── Info card — frosted glass, bottom of canvas ── */}
      <AnimatePresence>
        {!showMenu && (
          <motion.div
            key="info-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="absolute bottom-0 left-0 right-0 bg-white backdrop-blur-md border-t border-slate-200 px-4 pt-4 pb-5"
            style={{ backgroundColor: 'rgba(255,255,255,0.96)' }}
          >
            {/* Business name */}
            <h2 className="text-lg font-bold text-slate-900 leading-tight truncate">{place.name}</h2>

            {/* Category + rating row */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {category && (
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600">
                  {formatCategory(category)}
                </span>
              )}
              {place.rating && (
                <div className="flex items-center gap-1">
                  <StarRating rating={place.rating} />
                  <span className="text-xs text-slate-500 font-medium">
                    {place.rating.toFixed(1)}
                    {place.user_ratings_total ? ` (${place.user_ratings_total.toLocaleString()})` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Address */}
            {addressLine && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <MapPin size={11} className="text-slate-400 flex-shrink-0" />
                <span className="text-xs text-slate-500 truncate">{addressLine}</span>
              </div>
            )}

            {/* Phone */}
            {place.formatted_phone_number && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Phone size={11} className="text-slate-400 flex-shrink-0" />
                <a
                  href={`tel:${place.formatted_phone_number}`}
                  className="text-xs text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  {place.formatted_phone_number}
                </a>
              </div>
            )}

            {/* CTAs */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              {/* Voice Concierge — locked after first press to prevent double-tap */}
              <motion.button
                whileTap={voiceActivated ? {} : { scale: 0.97 }}
                onClick={() => {
                  if (voiceActivated) return;
                  setVoiceActivated(true);
                  onStartVoice();
                }}
                disabled={voiceActivated}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors shadow-sm ${
                  voiceActivated
                    ? 'bg-emerald-400 cursor-not-allowed opacity-80'
                    : 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700'
                }`}
              >
                <Mic size={15} className={voiceActivated ? 'animate-pulse' : ''} />
                <span>{voiceActivated ? 'Connecting…' : 'Voice AI'}</span>
              </motion.button>

              {/* Main Menu */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowMenu(true)}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 text-indigo-700 text-sm font-semibold transition-colors shadow-sm"
              >
                <Menu size={15} />
                <span>Menu</span>
                <ChevronRight size={13} className="text-indigo-400" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Menu drawer — bottom sheet, hero stays visible above ── */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            key="menu-drawer"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="absolute bottom-0 left-0 right-0 max-h-[75%] flex flex-col overflow-hidden rounded-t-2xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(12px)' }}
          >
            <MenuDrawerContent
              capabilities={capabilities}
              isAuthenticated={isAuthenticated}
              websiteUrl={websiteUrl}
              onlineStoreUrl={onlineStoreUrl}
              onMenuAction={onMenuAction}
              onClose={() => setShowMenu(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default BusinessHeroIdle;
