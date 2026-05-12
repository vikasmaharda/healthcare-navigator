import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons (Vite doesn't auto-resolve Leaflet's bundled assets)
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:oklch(0.55 0.18 245);box-shadow:0 0 0 6px color-mix(in oklab, oklch(0.55 0.18 245) 25%, transparent);border:2px solid white;"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export type HospitalPin = {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  emergency_24x7?: boolean;
};

function FitBounds({ user, pins }: { user: [number, number] | null; pins: HospitalPin[] }) {
  const map = useMap();
  useEffect(() => {
    const pts: L.LatLngExpression[] = pins.map((p) => [p.lat, p.lng]);
    if (user) pts.push(user);
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setView(pts[0] as L.LatLngExpression, 12);
    } else {
      map.fitBounds(L.latLngBounds(pts as L.LatLngExpression[]), { padding: [40, 40] });
    }
  }, [map, user, pins]);
  return null;
}

export function HospitalsMap({
  user,
  pins,
  height = 460,
}: {
  user: [number, number] | null;
  pins: HospitalPin[];
  height?: number;
}) {
  const center: [number, number] = user ?? (pins[0] ? [pins[0].lat, pins[0].lng] : [22.9734, 78.6569]);
  return (
    <div className="rounded-2xl overflow-hidden border border-border" style={{ height }}>
      <MapContainer center={center} zoom={5} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {user && (
          <>
            <Marker position={user} icon={userIcon}>
              <Popup>You are here</Popup>
            </Marker>
            <Circle center={user} radius={2000} pathOptions={{ color: "oklch(0.55 0.18 245)", fillOpacity: 0.05 }} />
          </>
        )}
        {pins.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{p.name}</div>
                <div className="text-muted-foreground">{p.city}</div>
                {typeof p.distanceKm === "number" && (
                  <div className="mt-1">{p.distanceKm.toFixed(1)} km away</div>
                )}
                {p.emergency_24x7 && <div className="text-emergency mt-1">24×7 ER</div>}
                <a
                  className="text-primary underline mt-1 inline-block"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Directions →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
        <FitBounds user={user} pins={pins} />
      </MapContainer>
    </div>
  );
}
