import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Mic, Stethoscope, Bot, Siren, Droplet, Bed, Pill, Landmark, FileHeart, MapPin, Star, Languages, ShieldCheck, Activity, ArrowRight, Baby, Heart, Sparkles } from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
  const nav = useNavigate();
  const [q, setQ] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    nav({ to: "/hospitals", search: { q } });
  };

  const voice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return alert("Voice search not supported in this browser.");
    const r = new SR(); r.lang = "en-IN"; r.start();
    r.onresult = (e: any) => { const t = e.results[0][0].transcript; setQ(t); nav({ to: "/hospitals", search: { q: t } }); };
  };

  const features = [
    { icon: Search, title: "Smart Search", desc: "Search by hospital, disease, symptom, doctor or location.", to: "/hospitals" },
    { icon: MapPin, title: "Nearby Hospitals", desc: "Discover hospitals around you with travel time and directions.", to: "/hospitals" },
    { icon: Siren, title: "Emergency SOS", desc: "Ambulance, blood, ER hospitals and helplines in one tap.", to: "/emergency" },
    { icon: Stethoscope, title: "Specialization Filter", desc: "Find Cardiologists, Pediatricians, Dentists, and more.", to: "/doctors" },
    { icon: Bot, title: "AI Symptom Assistant", desc: "Describe your symptoms — get triage guidance.", to: "/ai-assistant" },
    { icon: Bed, title: "Live Bed Availability", desc: "ICU, oxygen, emergency and general beds.", to: "/hospitals" },
    { icon: Droplet, title: "Blood Bank & Donors", desc: "Find blood by group and city. Become a donor.", to: "/blood-bank" },
    { icon: Pill, title: "Medicine & Pharmacy", desc: "24x7 pharmacies and home delivery.", to: "/pharmacy" },
    { icon: Landmark, title: "Govt Schemes", desc: "Ayushman Bharat & free treatment programs.", to: "/schemes" },
    { icon: FileHeart, title: "Health Records", desc: "Store prescriptions and reports securely.", to: "/records" },
    { icon: Baby, title: "Women & Child", desc: "Maternity, pediatric and vaccination quick access.", to: "/hospitals" },
    { icon: Languages, title: "Multilingual", desc: "Switch between English and हिन्दी anytime.", to: "/" },
  ];

  return (
    <div>
      {/* HERO */}
      <section className="gradient-hero">
        <div className="max-w-7xl mx-auto px-4 pt-16 pb-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-accent" /> Healthcare Navigation Platform
            </span>
            <h1 className="font-display mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
              Find care, fast.<br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Hospitals, doctors, beds, blood.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              MediRoute helps you reach the right care in seconds — from a cardiologist nearby to an ICU bed in an emergency.
            </p>

            <form onSubmit={submit} className="mt-8 flex items-center gap-2 p-2 bg-card border border-border rounded-2xl shadow-soft">
              <Search className="size-5 text-muted-foreground ml-2" />
              <input
                value={q} onChange={e => setQ(e.target.value)}
                placeholder="Try 'chest pain', 'cardiologist Mumbai', 'AIIMS', 'ICU bed'…"
                className="flex-1 bg-transparent outline-none text-base placeholder:text-muted-foreground"
              />
              <button type="button" onClick={voice} className="p-2 rounded-lg hover:bg-muted text-muted-foreground" aria-label="Voice search">
                <Mic className="size-5" />
              </button>
              <Button type="submit" className="rounded-xl">Search</Button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {["Chest pain", "Pediatrician", "Dentist Bengaluru", "ICU bed", "Blood O+"].map(s => (
                <button key={s} onClick={() => nav({ to: "/hospitals", search: { q: s } })} className="px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition">
                  {s}
                </button>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/emergency"><Button variant="destructive" className="gradient-emergency text-emergency-foreground"><Siren className="size-4 mr-2" />Emergency SOS</Button></Link>
              <Link to="/ai-assistant"><Button variant="outline"><Bot className="size-4 mr-2" />Try AI Assistant</Button></Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-tr from-primary/20 via-accent/15 to-transparent blur-3xl -z-10" />
            <div className="rounded-3xl overflow-hidden border border-border shadow-glow bg-card">
              <img src={heroImg} alt="MediRoute care navigation" width={1600} height={1024} className="w-full h-auto" />
            </div>
            <div className="absolute -bottom-5 -left-5 hidden sm:flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border shadow-soft">
              <div className="size-10 rounded-xl bg-success/15 grid place-items-center"><Bed className="size-5 text-success" /></div>
              <div>
                <div className="text-xs text-muted-foreground">ICU beds available</div>
                <div className="font-semibold">12 nearby</div>
              </div>
            </div>
            <div className="absolute -top-5 -right-5 hidden sm:flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border shadow-soft">
              <div className="size-10 rounded-xl bg-primary/15 grid place-items-center"><Star className="size-5 text-primary" /></div>
              <div>
                <div className="text-xs text-muted-foreground">Top rated</div>
                <div className="font-semibold">4.8 / 5</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK ACCESS */}
      <section className="max-w-7xl mx-auto px-4 py-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold">Everything you need, in one app</h2>
            <p className="text-muted-foreground mt-1">From routine appointments to emergencies.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(f => {
            const Icon = f.icon;
            return (
              <Link key={f.title} to={f.to} className="group p-5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-soft transition-all">
                <div className="size-11 rounded-xl gradient-primary grid place-items-center text-primary-foreground mb-4">
                  <Icon className="size-5" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{f.title}</h3>
                  <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* TRUST */}
      <section className="border-y border-border bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 py-10 grid sm:grid-cols-3 gap-6">
          {[
            { icon: ShieldCheck, t: "Verified directory", d: "Hospitals & doctors carefully listed." },
            { icon: Heart, t: "Care-first", d: "Built around urgency and clarity, not clutter." },
            { icon: Activity, t: "Always available", d: "Emergency contacts and SOS work 24×7." },
          ].map(x => {
            const Icon = x.icon;
            return (
              <div key={x.t} className="flex gap-3">
                <div className="size-10 rounded-xl bg-card border border-border grid place-items-center"><Icon className="size-5 text-primary" /></div>
                <div>
                  <div className="font-semibold">{x.t}</div>
                  <div className="text-sm text-muted-foreground">{x.d}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
