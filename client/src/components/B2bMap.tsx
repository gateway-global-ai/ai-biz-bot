/**
 * Lightweight Google Map for B2B portal: shows POI search results and itinerary pins.
 * Uses @react-google-maps/api and the Maps key from /api/config/maps-key.
 */
import { useMemo, useState, useEffect, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";

const DEFAULT_CENTER = { lat: 45.4642, lng: 9.19 };
const DEFAULT_ZOOM = 10;

export type MapMarker = {
  lat: number;
  lng: number;
  name: string;
  id?: string;
};

type B2bMapProps = {
  /** API key for Google Maps JS. If not provided, fetched from /api/config/maps-key. */
  mapsApiKey?: string | null;
  /** Markers to show (e.g. from POI search results with place.location). */
  markers?: MapMarker[];
  /** Optional map height (default 320px). */
  height?: string | number;
  /** Optional CSS class for container. */
  className?: string;
};

const LIBRARIES: ("geometry" | "places")[] = ["places"];

function B2bMapInner({
  mapsApiKey,
  markers,
  height,
  className,
}: B2bMapProps & { mapsApiKey: string }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "b2b-google-map",
    googleMapsApiKey: mapsApiKey,
    libraries: LIBRARIES,
  });

  const mapCenter = useMemo(() => {
    if (markers.length === 0) return DEFAULT_CENTER;
    const lat = markers.reduce((s, m) => s + m.lat, 0) / markers.length;
    const lng = markers.reduce((s, m) => s + m.lng, 0) / markers.length;
    return { lat, lng };
  }, [markers]);

  const onLoad = useCallback((map: google.maps.Map) => {
    if (markers.length <= 1) return;
    const bounds = new google.maps.LatLngBounds();
    markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }));
    map.fitBounds(bounds, { top: 24, right: 24, bottom: 24, left: 24 });
  }, [markers]);

  const style = typeof height === "number" ? { height: `${height}px` } : { height };
  const fallback = (
    <div className={`flex items-center justify-center bg-slate-800 rounded-xl text-slate-400 ${className}`} style={style}>
      {loadError ? "Map unavailable (check Maps API key)." : "Loading map…"}
    </div>
  );

  if (loadError) return fallback;
  if (!isLoaded) return fallback;

  return (
    <div className={`rounded-xl overflow-hidden border border-slate-700 ${className}`} style={style}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={mapCenter}
        zoom={markers.length > 0 ? undefined : DEFAULT_ZOOM}
        onLoad={onLoad}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
            { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
          ],
        }}
      >
        {markers.map((m, i) => (
          <Marker
            key={m.id ?? `${m.lat}-${m.lng}-${i}`}
            position={{ lat: m.lat, lng: m.lng }}
            title={m.name}
          />
        ))}
      </GoogleMap>
    </div>
  );
}

export function B2bMap({ mapsApiKey: keyProp, markers = [], height = 320, className = "" }: B2bMapProps) {
  const [mapsKey, setMapsKey] = useState<string | null>(keyProp !== undefined ? keyProp : null);
  const [keyFetched, setKeyFetched] = useState(keyProp !== undefined);

  useEffect(() => {
    if (keyProp !== undefined) {
      setMapsKey(keyProp);
      setKeyFetched(true);
      return;
    }
    let cancelled = false;
    fetch("/api/config/maps-key")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) {
          setKeyFetched(true);
          if (data?.key) setMapsKey(data.key);
        }
      })
      .catch(() => {
        if (!cancelled) setKeyFetched(true);
      });
    return () => {
      cancelled = true;
    };
  }, [keyProp]);

  const style = typeof height === "number" ? { height: `${height}px` } : { height };
  if (!keyFetched || !mapsKey) {
    return (
      <div className={`flex items-center justify-center bg-slate-800 rounded-xl text-slate-400 text-sm ${className}`} style={style}>
        {!keyFetched ? "Loading map…" : "Map unavailable (Maps API key not configured)."}
      </div>
    );
  }

  return <B2bMapInner mapsApiKey={mapsKey} markers={markers} height={height} className={className} />;
}
