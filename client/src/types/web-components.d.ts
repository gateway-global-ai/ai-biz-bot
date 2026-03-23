/**
 * TypeScript declarations for Google Maps Extended Component Library (EEL) and
 * Google Places UI Kit web components used in JSX.
 *
 * These declarations allow <gmpx-*> and <gmp-*> custom elements to be used
 * directly in .tsx files without TypeScript errors.
 *
 * Authoritative reference: https://mapsplatform.google.com/maps-products/maps-sdk-for-web/extended-component-library/
 */

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // ─── Extended Component Library (gmpx-) ─────────────────────────────────
      /** Configures the Maps JS API and Places SDK for all EEL components. */
      'gmpx-api-loader': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        key?: string;
        'solution-channel'?: string;
        version?: string;
        libraries?: string;
        language?: string;
        region?: string;
      };

      /**
       * Full place picker (text input + autocomplete dropdown + place card).
       * Fires `gmpx-placechange` when the user selects a place.
       * Access the selected Place via `element.value`.
       */
      'gmpx-place-picker': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        placeholder?: string;
        value?: any;
        'for-map'?: string;
        type?: string;
        country?: string | string[];
      };

      /**
       * Standalone autocomplete text input (no place card).
       * Fires `gmpx-placechange` on selection.
       * Use when you need only the text input without the full picker UI.
       */
      'gmpx-place-autocomplete': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        placeholder?: string;
        value?: string;
        type?: string;
        country?: string | string[];
      };

      // Overlay / info components
      'gmpx-place-overview': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        place?: string;
        size?: 'small' | 'medium' | 'large' | 'x-large';
      };

      'gmpx-place-directions-button': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        place?: string;
      };

      'gmpx-split-layout': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'row-layout-min-width'?: number;
      };

      'gmpx-store-locator': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'map-id'?: string;
        capabilities?: string;
      };

      // ─── Google Maps UI Kit (gmp-) ────────────────────────────────────────
      /**
       * Native Places autocomplete input — the modern replacement for the
       * deprecated google.maps.places.Autocomplete widget.
       * Created via `new PlaceAutocompleteElement()` (from importLibrary('places'))
       * or as the custom element `<gmp-place-autocomplete>`.
       * Fires `gmp-select` when the user selects a prediction.
       */
      /**
       * gmp-* Places UI Kit elements: use typings from `@vis.gl/react-google-maps`
       * (declare module 'react' / JSX.IntrinsicElements) to avoid conflicting merges
       * with stricter `place` prop types.
       */
    }
  }
}

export {};
