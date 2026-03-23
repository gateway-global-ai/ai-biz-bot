/**
 * client/src/utils/googleMapsLoader.ts
 *
 * Global singleton utility for Google Maps Extended Component Library (EEL).
 *
 * ─── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
 * The EEL npm package is already installed (@googlemaps/extended-component-library).
 * In the past, BusinessPage.tsx and MyAccount.tsx each loaded the EEL via a
 * CDN <script> tag, while PlacePickerComponent.tsx / PlaceChangeListener.tsx
 * imported the same elements via ESM. This caused the browser to register the
 * same custom elements twice, producing:
 *   "installHook.js:1 <gmpx-api-loader>: Found multiple instances of this element"
 *
 * This utility consolidates all EEL initialization into one place:
 *   1. ESM imports (synchronous, run once when the module is first loaded).
 *   2. ensureApiLoader() — a document-level singleton for <gmpx-api-loader>.
 *
 * ─── USAGE ───────────────────────────────────────────────────────────────────
 *   import { ensureApiLoader } from '@/utils/googleMapsLoader';
 *
 *   useEffect(() => {
 *     if (!mapsKey) return;
 *     ensureApiLoader(mapsKey);
 *     // Now safe to create/render <gmpx-place-picker> elements
 *   }, [mapsKey]);
 *
 * Do NOT load the EEL via a CDN <script> tag anywhere in the project.
 * Do NOT import individual EEL element files (e.g. place_picker.js) in
 * components — import from this utility instead so the module is loaded once.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Registers the <gmpx-api-loader> custom element via the npm package.
// NOTE: place_picker.js is intentionally NOT imported. EEL v0.6.14
// gmpx-place-picker internally calls `new google.maps.places.Autocomplete()`
// (deprecated as of March 2025). Use PlaceAutocompleteElement via
// loadPlacesLibrary() instead — see below.
import '@googlemaps/extended-component-library/api_loader.js';

/**
 * Inject a `<gmpx-api-loader>` singleton into `document.body`.
 *
 * The EEL requires exactly ONE `<gmpx-api-loader>` in the document at any
 * given time. This function is idempotent — subsequent calls are no-ops.
 *
 * It also installs `window.gm_authFailure` once (to log a console error on
 * API-key misconfiguration). Components that want to surface this as a UI
 * error message should set their own `gm_authFailure` after calling this.
 *
 * @param apiKey  The Maps JS API key, fetched from /api/config/maps-key.
 */
export function ensureApiLoader(apiKey: string): void {
  // Strict document-level singleton guard — prevents multiple instances.
  if (document.querySelector('gmpx-api-loader')) return;

  const loader = document.createElement('gmpx-api-loader');
  loader.setAttribute('key', apiKey);
  loader.setAttribute('solution-channel', 'GMP_GE_mapsandplacesautocomplete_v2');
  document.body.appendChild(loader);

  // Install the global auth failure hook once.
  // Components may override this to show UI-level error messages.
  if (!(window as any).__gmpxAuthHooked) {
    (window as any).__gmpxAuthHooked = true;
    (window as any).gm_authFailure = () => {
      console.error(
        '[googleMapsLoader] Google Maps auth failure. ' +
        'Ensure the API key is active for "Maps JavaScript API" and "Places API (New)".'
      );
    };
  }
}

/**
 * Load the Google Maps Places library and return it.
 *
 * Polls until `window.google.maps.importLibrary` is available (set by
 * `gmpx-api-loader` after the Maps JS API bootstraps), then resolves the
 * `places` library which registers `PlaceAutocompleteElement` as the
 * `<gmp-place-autocomplete>` custom element.
 *
 * Usage:
 *   const { PlaceAutocompleteElement } = await loadPlacesLibrary();
 *   const el = new PlaceAutocompleteElement({});
 */
export async function loadPlacesLibrary(): Promise<google.maps.PlacesLibrary> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if ((window as any).google?.maps?.importLibrary) break;
    await new Promise(r => setTimeout(r, 100));
  }
  if (!(window as any).google?.maps?.importLibrary) {
    throw new Error(
      '[googleMapsLoader] Google Maps API did not load within 10 s. ' +
      'Verify the API key and that "Maps JavaScript API" is enabled.'
    );
  }
  return google.maps.importLibrary('places') as Promise<google.maps.PlacesLibrary>;
}
