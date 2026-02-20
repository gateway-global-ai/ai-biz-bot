/**
 * TypeScript declarations for Google Places UI Kit web components.
 */

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gmp-place-details': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        place?: string;
      };
      'gmp-place-details-place-request': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        place?: string;
      };
      'gmp-place-content-config': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'gmp-place-all-content': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'gmp-place-media': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'lightbox-preferred'?: boolean;
      };
      'gmp-place-rating': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'gmp-place-price-level': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'gmp-place-opening-hours': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'gmp-place-website': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'gmp-place-formatted-address': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'gmp-place-reviews': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      'gmp-place-attribution': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'light-scheme-color'?: string;
        'dark-scheme-color'?: string;
      };
    }
  }
}

export {};
