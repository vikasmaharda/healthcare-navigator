import { useCallback, useEffect, useRef, useState } from "react";

export type Coords = {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
};

export type GeoState = {
  coords: Coords | null;
  error: string | null;
  loading: boolean;
  watching: boolean;
  /** One-shot high accuracy fix */
  locate: () => void;
  /** Continuous updates (only while the user opts in) */
  startWatch: () => void;
  stopWatch: () => void;
  clear: () => void;
};

function messageFor(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Location permission was denied. Allow location access in your browser settings to use this feature.";
    case err.POSITION_UNAVAILABLE:
      return "Your device could not determine a location. Check that GPS or location services are switched on.";
    case err.TIMEOUT:
      return "Getting your location took too long. Please try again, ideally near a window or outdoors.";
    default:
      return err.message || "Could not read your location.";
  }
}

export function useGeolocation(options?: { autoLocate?: boolean }): GeoState {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [watching, setWatching] = useState(false);
  const watchId = useRef<number | null>(null);

  const apply = useCallback((pos: GeolocationPosition) => {
    setCoords({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp,
    });
    setError(null);
    setLoading(false);
  }, []);

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Location services are not supported on this device or browser.");
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      apply,
      (err) => {
        setError(messageFor(err));
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [apply]);

  const stopWatch = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setWatching(false);
  }, []);

  const startWatch = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Location services are not supported on this device or browser.");
      return;
    }
    if (watchId.current !== null) return;
    setLoading(true);
    watchId.current = navigator.geolocation.watchPosition(
      apply,
      (err) => {
        setError(messageFor(err));
        setLoading(false);
        stopWatch();
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 },
    );
    setWatching(true);
  }, [apply, stopWatch]);

  const clear = useCallback(() => {
    stopWatch();
    setCoords(null);
    setError(null);
  }, [stopWatch]);

  useEffect(() => {
    if (options?.autoLocate) locate();
    return () => {
      if (watchId.current !== null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { coords, error, loading, watching, locate, startWatch, stopWatch, clear };
}

export const mapsLink = (lat: number, lng: number) =>
  `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

export const directionsLink = (lat: number, lng: number, from?: { lat: number; lng: number } | null) =>
  from
    ? `https://www.google.com/maps/dir/?api=1&origin=${from.lat.toFixed(6)},${from.lng.toFixed(6)}&destination=${lat.toFixed(6)},${lng.toFixed(6)}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}&travelmode=driving`;
