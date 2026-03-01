/**
 * PlaceDetailsPanel — Sovereign OS edition.
 * Displays rich business information using Google Places UI Kit web components.
 * Jason Standard: glass header, indigo border, rounded-sui outer frame.
 *
 * Spec: client/src/components/chat/gemini_2_5_flash_react_instructions/tour_guide/place_details_panel.md
 */
import React from 'react';
import { motion } from 'framer-motion';
import { X, MapPin } from 'lucide-react';

interface PlaceDetailsPanelProps {
  placeId: string | null;
  onClose?: () => void;
}

export const PlaceDetailsPanel: React.FC<PlaceDetailsPanelProps> = ({ placeId, onClose }) => {
  if (!placeId) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col h-full rounded-sui bg-slate-900/60 backdrop-blur-xl border border-indigo-500/20 shadow-2xl overflow-hidden"
    >
      {/* Sovereign header */}
      <div className="px-4 py-3 flex justify-between items-center border-b border-indigo-500/10 shrink-0 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[10px] bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
            <MapPin size={14} className="text-indigo-400" />
          </div>
          <h3 className="font-bold text-white text-sm">Business Details</h3>
        </div>
        {onClose && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-[10px] hover:bg-slate-800/60 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Close"
          >
            <X size={15} />
          </motion.button>
        )}
      </div>

      {/* Places UI Kit container */}
      <div className="flex-1 overflow-y-auto p-4">
        <gmp-place-details place={placeId}>
          <gmp-place-details-place-request place={placeId}></gmp-place-details-place-request>
          <gmp-place-content-config>
            <gmp-place-attribution light-scheme-color="black" dark-scheme-color="white"></gmp-place-attribution>
            <gmp-place-media lightbox-preferred></gmp-place-media>
            <gmp-place-rating></gmp-place-rating>
            <gmp-place-price-level></gmp-place-price-level>
            <gmp-place-opening-hours></gmp-place-opening-hours>
            <gmp-place-website></gmp-place-website>
            <gmp-place-formatted-address></gmp-place-formatted-address>
            <gmp-place-reviews></gmp-place-reviews>
          </gmp-place-content-config>
        </gmp-place-details>
      </div>
    </motion.div>
  );
};
