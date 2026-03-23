/**
 * @types/google.maps `PlacesLibrary` omits `PlaceAutocompleteElement` (Places API New)
 * even though `importLibrary('places')` returns it at runtime.
 */
export {};

declare global {
  namespace google.maps {
    interface PlacesLibrary {
      PlaceAutocompleteElement: typeof google.maps.places.PlaceAutocompleteElement;
    }
  }
}
