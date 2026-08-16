import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { MapPin, Navigation, Loader2, StopCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { distanceKm, formatKm } from "@/lib/distance";
import { useGeolocation, mapsLink, directionsLink } from "@/hooks/use-geolocation";
import { HospitalsMap, type HospitalPin } from "@/components/HospitalsMap";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/nearby")({ component: NearbyPage });

function NearbyPage() {
  const { coords, error: geoErr, loading: locating, watching, locate, startWatch, stopWatch } = useGeolocation();
  const user: [number, number] | null = coords ? [coords.lat, coords.lng] : null;

  const { data: hospitals = [], isLoading } = useQuery({
    queryKey: ["hospitals-with-coords"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hospitals")
        .select("id,name,city,address,phone,lat,lng,emergency_24x7,rating,specialties")
        .not("lat", "is", null)
        .not("lng", "is", null);
      if (error) throw error;
      return data;
    },
  });

  const enriched = useMemo(() => {
    const list = (hospitals as any[]).map((h) => {
      const d = user && h.lat && h.lng ? distanceKm({ lat: user[0], lng: user[1] }, { lat: h.lat, lng: h.lng }) : undefined;
      return { ...h, distanceKm: d };
    });
    if (user) list.sort((a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9));
    return list;
  }, [hospitals, user]);

  const pins: HospitalPin[] = enriched.slice(0, 50).map((h) => ({
    id: h.id,
    name: h.name,
    city: h.city,
    lat: Number(h.lat),
    lng: Number(h.lng),
    distanceKm: h.distanceKm,
    emergency_24x7: h.emergency_24x7,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Hospitals near you</h1>
          <p className="text-muted-foreground">
            Allow location access so we can measure the real distance from you to each hospital. Your coordinates
            are used only on this page and are never stored.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={locate} disabled={locating}>
            {locating ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Navigation className="size-4 mr-2" />}
            {coords ? "Recenter on me" : "Use my location"}
          </Button>
          {coords && (watching ? (
            <Button variant="outline" onClick={stopWatch}><StopCircle className="size-4 mr-2" />Stop live tracking</Button>
          ) : (
            <Button variant="outline" onClick={startWatch}><Navigation className="size-4 mr-2" />Live tracking</Button>
          ))}
        </div>
      </div>

      {geoErr && (
        <div className="mb-4 text-sm p-3 rounded-lg bg-warning/15 text-warning-foreground">
          {geoErr} The map still shows all hospitals — you can pan and zoom freely.
        </div>
      )}

      {coords && (
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm p-3 rounded-lg bg-muted">
          <span className="font-mono">
            Latitude: {coords.lat.toFixed(6)} · Longitude: {coords.lng.toFixed(6)}
          </span>
          <span className="text-xs text-muted-foreground">±{Math.round(coords.accuracy)} m{watching ? " · live" : ""}</span>
          <a className="text-primary underline" href={mapsLink(coords.lat, coords.lng)} target="_blank" rel="noreferrer">
            Open my location in Google Maps
          </a>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        {isLoading ? (
          <div className="h-[460px] rounded-2xl bg-muted animate-pulse" />
        ) : (
          <HospitalsMap user={user} pins={pins} />
        )}


        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <div className="font-semibold">Closest hospitals</div>
            <div className="text-xs text-muted-foreground">
              {user ? "Sorted by distance from you" : "Enable location to sort by distance"}
            </div>
          </div>
          <ul className="divide-y divide-border max-h-[420px] overflow-y-auto">
            {enriched.slice(0, 25).map((h) => (
              <li key={h.id} className="p-4 hover:bg-muted/50 transition">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium leading-tight">{h.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="size-3" />
                      {h.city}
                    </div>
                  </div>
                  {h.distanceKm !== undefined && (
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold whitespace-nowrap">
                      {formatKm(h.distanceKm)}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex gap-2">
                  <a
                    className="text-xs text-primary underline"
                    href={directionsLink(Number(h.lat), Number(h.lng), coords)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Directions
                  </a>
                  {h.phone && (
                    <a className="text-xs text-muted-foreground underline" href={`tel:${h.phone}`}>
                      Call
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
