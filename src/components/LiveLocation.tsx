import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Copy,
  Loader2,
  MapPin,
  Navigation,
  Share2,
  MessageCircle,
  Mail,
  StopCircle,
  ShieldCheck,
} from "lucide-react";
import { useGeolocation, mapsLink } from "@/hooks/use-geolocation";

export function LiveLocation({ compact = false }: { compact?: boolean }) {
  const { coords, error, loading, watching, locate, startWatch, stopWatch, clear } = useGeolocation();
  const [copied, setCopied] = useState(false);

  const link = coords ? mapsLink(coords.lat, coords.lng) : "";
  const text = coords
    ? `I need help. My live location:\nLatitude: ${coords.lat.toFixed(6)}\nLongitude: ${coords.lng.toFixed(6)}\n${link}`
    : "";

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy. Please select and copy manually.");
    }
  };

  const nativeShare = async () => {
    if (!coords) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "My live location", text, url: link });
        return;
      } catch {
        /* user cancelled — fall through */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  return (
    <div className={compact ? "" : "rounded-2xl border border-border bg-card p-5"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold flex items-center gap-2">
            <MapPin className="size-4 text-primary" /> Live location sharing
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            We ask your device for GPS coordinates only when you tap the button below. Nothing is stored or
            shared automatically — you choose where to send it.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={locate} disabled={loading}>
          {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Navigation className="size-4 mr-2" />}
          {coords ? "Refresh location" : "Detect my location"}
        </Button>
        {coords && !watching && (
          <Button variant="outline" onClick={startWatch}>
            <Navigation className="size-4 mr-2" /> Keep updating
          </Button>
        )}
        {watching && (
          <Button variant="outline" onClick={stopWatch}>
            <StopCircle className="size-4 mr-2" /> Stop updating
          </Button>
        )}
        {coords && (
          <Button variant="ghost" onClick={clear}>
            Clear
          </Button>
        )}
      </div>

      {error && (
        <div className="mt-4 text-sm p-3 rounded-lg bg-destructive/10 text-destructive">{error}</div>
      )}

      {coords && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl bg-muted p-4 font-mono text-sm">
            <div>Latitude: {coords.lat.toFixed(6)}</div>
            <div>Longitude: {coords.lng.toFixed(6)}</div>
            <div className="text-xs text-muted-foreground mt-1 font-sans">
              Accuracy ±{Math.round(coords.accuracy)} m · updated{" "}
              {new Date(coords.timestamp).toLocaleTimeString()}
              {watching && " · live"}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copy(`${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`, "Coordinates")}
            >
              <Copy className="size-4 mr-2" /> {copied ? "Copied!" : "Copy location"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => copy(link, "Map link")}>
              <Copy className="size-4 mr-2" /> Copy map link
            </Button>
            <Button size="sm" onClick={nativeShare}>
              <Share2 className="size-4 mr-2" /> Share location
            </Button>
            <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <MessageCircle className="size-4 mr-2" /> WhatsApp
              </Button>
            </a>
            <a href={`sms:?&body=${encodeURIComponent(text)}`}>
              <Button variant="outline" size="sm">
                <MessageCircle className="size-4 mr-2" /> SMS
              </Button>
            </a>
            <a href={`mailto:?subject=${encodeURIComponent("My live location")}&body=${encodeURIComponent(text)}`}>
              <Button variant="outline" size="sm">
                <Mail className="size-4 mr-2" /> Email
              </Button>
            </a>
            <a href={link} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <MapPin className="size-4 mr-2" /> Open in Google Maps
              </Button>
            </a>
          </div>

          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" /> Your coordinates stay on this device until you share them.
          </p>
        </div>
      )}
    </div>
  );
}
