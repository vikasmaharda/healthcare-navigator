import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Phone, MapPin, Droplet, Pill, Bot, Baby, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveLocation } from "@/components/LiveLocation";

export const Route = createFileRoute("/emergency")({ component: Page });

function Page() {
  const { data: contacts = [] } = useQuery({
    queryKey: ["emergency"], queryFn: async () => (await supabase.from("emergency_contacts").select("*")).data ?? [],
  });
  const { data: hospitals = [] } = useQuery({
    queryKey: ["hospitals-er"], queryFn: async () => (await supabase.from("hospitals").select("*").eq("emergency_24x7", true).limit(6)).data ?? [],
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <section className="rounded-3xl gradient-emergency text-emergency-foreground p-8 sm:p-12 shadow-glow">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold"><ShieldAlert className="size-3.5" /> 24×7 Emergency</div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold mt-3">SOS — Get help now</h1>
            <p className="opacity-90 mt-2 max-w-xl">Call an ambulance, find the nearest ER, or share your live location with family.</p>
          </div>
          <a href="tel:102" className="relative inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-white text-emergency font-bold text-lg pulse-ring">
            <Phone className="size-5" /> Call 102
          </a>
        </div>

        <div className="mt-8 grid sm:grid-cols-2 gap-3">
          <Link to="/blood-bank"><Button variant="secondary" size="lg" className="w-full bg-white/15 text-emergency-foreground hover:bg-white/25 border-0"><Droplet className="size-4 mr-2" />Blood bank</Button></Link>
          <Link to="/pharmacy"><Button variant="secondary" size="lg" className="w-full bg-white/15 text-emergency-foreground hover:bg-white/25 border-0"><Pill className="size-4 mr-2" />24×7 Pharmacy</Button></Link>
        </div>
      </section>

      <section className="mt-8">
        <LiveLocation />
      </section>


      <section className="mt-10 grid lg:grid-cols-2 gap-8">
        <div>
          <h2 className="font-display text-2xl font-bold mb-4">Emergency helplines</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {contacts.map((c: any) => (
              <a key={c.id} href={`tel:${c.number.replace(/[^0-9+]/g,"")}`} className="p-4 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-soft transition flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emergency/15 grid place-items-center text-emergency"><Phone className="size-5" /></div>
                <div className="flex-1">
                  <div className="font-semibold">{c.label}</div>
                  <div className="text-xs text-muted-foreground capitalize">{c.category}</div>
                </div>
                <div className="font-mono font-semibold">{c.number}</div>
              </a>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link to="/hospitals" search={{ q:"", city:"", specialty:"Pediatrics", govt:false, emergency:true }}>
              <Button variant="outline" className="w-full"><Baby className="size-4 mr-2" />Pediatric Emergency</Button>
            </Link>
            <Link to="/ai-assistant"><Button variant="outline" className="w-full"><Bot className="size-4 mr-2" />Ask AI Assistant</Button></Link>
          </div>
        </div>

        <div>
          <h2 className="font-display text-2xl font-bold mb-4">Nearest 24×7 ER hospitals</h2>
          <ul className="space-y-3">
            {hospitals.map((h: any) => (
              <li key={h.id} className="p-4 rounded-2xl bg-card border border-border flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{h.name}</div>
                  <div className="text-sm text-muted-foreground inline-flex items-center gap-1 mt-0.5"><MapPin className="size-3.5" />{h.city}</div>
                </div>
                <div className="flex gap-2">
                  <a href={`tel:${(h.phone||"").replace(/[^0-9+]/g,"")}`}><Button size="icon" variant="outline"><Phone className="size-4" /></Button></a>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(h.name+" "+h.city)}`} target="_blank" rel="noreferrer"><Button size="icon"><MapPin className="size-4" /></Button></a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
