/**
 * PlaceDetailsPanel Component
 *
 * Displays rich business information using Google Places UI Kit web components.
 * Spec: client/src/components/chat/gemini_2_5_flash_react_instructions/tour_guide/place_details_panel.md
 */

import React from 'react';
import { X } from 'lucide-react';

interface PlaceDetailsPanelProps {
  placeId: string | null;
  onClose?: () => void;
}

export const PlaceDetailsPanel: React.FC<PlaceDetailsPanelProps> = ({ placeId, onClose }) => {
  if (!placeId) return null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 shadow-xl overflow-hidden border-l border-slate-200 dark:border-slate-800 rounded-xl">
      {/* Header Actions */}
      <div className="p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 shrink-0">
        <h3 className="font-bold text-slate-900 dark:text-white">Business Details</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={18} className="text-slate-600 dark:text-slate-400" />
          </button>
        )}
      </div>

      {/* Places UI Kit Container */}
      <div className="flex-1 overflow-y-auto p-4">
        <gmp-place-details place={placeId}>
          {/* Place Request */}
          <gmp-place-details-place-request place={placeId}></gmp-place-details-place-request>

          {/* Content Configuration */}
          <gmp-place-content-config>
            {/* Branding configuration for light and dark schemes */}
            <gmp-place-attribution
              light-scheme-color="black"
              dark-scheme-color="white"
            ></gmp-place-attribution>

            {/* Enable high-end features like Lightbox photos */}
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
    </div>
  );
};
