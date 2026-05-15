import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import Fuse from "fuse.js";
import { supabase } from "@/integrations/supabase/client";
import { Search, MapPin, Star, Bed, Stethoscope, IndianRupee, GitCompare, Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// Symptom → specialty hints. Fuzzy-matched so typos still route correctly ("chst pian" → cardiology).
const SYMPTOM_HINTS: Record<string, string[]> = {
  "chest pain": ["Cardiology"], "heart attack": ["Cardiology"], "palpitations": ["Cardiology"], "high bp": ["Cardiology"], "hypertension": ["Cardiology"],
  "stroke": ["Neurology"], "headache": ["Neurology", "General Medicine"], "migraine": ["Neurology"], "seizure": ["Neurology"], "paralysis": ["Neurology"],
  "fracture": ["Orthopedics"], "bone pain": ["Orthopedics"], "back pain": ["Orthopedics"], "knee pain": ["Orthopedics"], "joint pain": ["Orthopedics"],
  "fever": ["General Medicine", "Pediatrics"], "cough": ["General Medicine"], "cold": ["General Medicine"], "diabetes": ["General Medicine"],
  "child fever": ["Pediatrics"], "baby vaccination": ["Pediatrics"], "infant": ["Pediatrics"], "newborn": ["Pediatrics"],
  "skin rash": ["Dermatology"], "acne": ["Dermatology"], "eczema": ["Dermatology"],
  "cancer": ["Oncology"], "tumor": ["Oncology"], "chemo": ["Oncology"],
  "tooth pain": ["Dental"], "gum bleeding": ["Dental"], "cavity": ["Dental"],
  "pregnancy": ["Gynaecology"], "delivery": ["Gynaecology"], "period pain": ["Gynaecology"],
  "ear pain": ["ENT"], "throat infection": ["ENT"], "hearing loss": ["ENT"],
  "eye pain": ["Ophthalmology"], "blurry vision": ["Ophthalmology"], "cataract": ["Ophthalmology"],
};

const schema = z.object({
  q: fallback(z.string(), "").default(""),
  city: fallback(z.string(), "").default(""),
  specialty: fallback(z.string(), "").default(""),
  govt: fallback(z.boolean(), false).default(false),
  emergency: fallback(z.boolean(), false).default(false),
});

export const Route = createFileRoute("/hospitals")({
  validateSearch: zodValidator(schema),
  component: HospitalsPage,
});

const SPECIALTIES = ["Cardiology","Neurology","Orthopedics","Pediatrics","Dermatology","Oncology","General Medicine","Dental"];
const CITIES = ["Mumbai","New Delhi","Bengaluru","Vellore","Anand"];

function HospitalsPage() {
  const search = Route.useSearch();
  const nav = useNavigate({ from: "/hospitals" });
  const [q, setQ] = useState(search.q);
  useEffect(() => setQ(search.q), [search.q]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [compare, setCompare] = useState<string[]>([]);
  const toggleCompare = (id: string) => setCompare(c => c.includes(id) ? c.filter(x => x!==id) : c.length<3 ? [...c, id] : c);

  const { data: hospitals = [], isLoading } = useQuery({
    queryKey: ["hospitals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("hospitals").select("*, beds(*)").order("rating", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Pre-filtered (city/specialty/flags) before fuzzy search
  const prefiltered = useMemo(() => {
    return (hospitals as any[]).filter((h) => {
      if (search.city && h.city !== search.city) return false;
      if (search.specialty && !(h.specialties || []).some((s: string) => s.toLowerCase().includes(search.specialty.toLowerCase()))) return false;
      if (search.govt && !h.is_government) return false;
      if (search.emergency && !h.emergency_24x7) return false;
      return true;
    });
  }, [hospitals, search.city, search.specialty, search.govt, search.emergency]);

  const fuse = useMemo(
    () =>
      new Fuse(prefiltered, {
        includeScore: true,
        threshold: 0.4, // typo tolerance
        ignoreLocation: true,
        keys: [
          { name: "name", weight: 0.5 },
          { name: "city", weight: 0.25 },
          { name: "address", weight: 0.1 },
          { name: "specialties", weight: 0.4 },
        ],
      }),
    [prefiltered],
  );

  const filtered = useMemo(() => {
    const raw = (search.q || "").trim();
    if (!raw) return prefiltered;

    // Symptom routing — fuzzy-match the query against known symptom phrases
    const hintFuse = new Fuse(Object.keys(SYMPTOM_HINTS), { threshold: 0.4, ignoreLocation: true });
    const hintMatches = hintFuse.search(raw.toLowerCase()).slice(0, 2);
    const hintedSpecs = hintMatches.flatMap((m) => SYMPTOM_HINTS[m.item]);

    const direct = fuse.search(raw).map((r) => r.item);
    if (hintedSpecs.length === 0) return direct;

    const specMatches = prefiltered.filter((h: any) =>
      (h.specialties || []).some((s: string) => hintedSpecs.some((hs) => s.toLowerCase().includes(hs.toLowerCase()))),
    );
    // Merge, dedupe, keep direct matches first
    const seen = new Set<string>();
    return [...direct, ...specMatches].filter((h: any) => (seen.has(h.id) ? false : (seen.add(h.id), true)));
  }, [fuse, prefiltered, search.q]);

  const update = (patch: Partial<typeof search>) =>
    nav({ search: (prev: typeof search) => ({ ...prev, ...patch }) });

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Hospitals</h1>
          <p className="text-muted-foreground">Search by name, city, specialty or symptom.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/submit-hospital">
            <Button variant="outline"><Plus className="size-4 mr-2" />Add hospital</Button>
          </Link>
          {compare.length >= 2 && (
            <Link to="/compare" search={{ ids: compare.join(",") }}>
              <Button><GitCompare className="size-4 mr-2" />Compare ({compare.length})</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 shadow-soft mb-6">
        <form onSubmit={(e) => { e.preventDefault(); update({ q }); }} className="flex flex-wrap gap-2 items-center">
          <div className="flex-1 min-w-[240px] flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
            <Search className="size-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try 'chest pain', 'AIIMS', 'cardilogy Mumbai' (typos OK)" className="flex-1 bg-transparent outline-none text-sm" />
          </div>
          <select value={search.city} onChange={(e) => update({ city: e.target.value })} className="px-3 py-2 rounded-lg bg-muted text-sm">
            <option value="">All cities</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={search.specialty} onChange={(e) => update({ specialty: e.target.value })} className="px-3 py-2 rounded-lg bg-muted text-sm">
            <option value="">All specialties</option>
            {SPECIALTIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-muted cursor-pointer">
            <input type="checkbox" checked={search.govt} onChange={(e) => update({ govt: e.target.checked })} /> Govt only
          </label>
          <label className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-muted cursor-pointer">
            <input type="checkbox" checked={search.emergency} onChange={(e) => update({ emergency: e.target.checked })} /> 24×7 ER
          </label>
          <Button type="submit"><Filter className="size-4 mr-2" />Apply</Button>
        </form>
      </div>

      {isLoading ? (
        <div className="grid gap-4">{Array.from({length:4}).map((_,i)=>(<div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />))}</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-card border border-border rounded-2xl text-muted-foreground">No hospitals match your filters.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((h: any) => {
            const beds = Array.isArray(h.beds) ? h.beds[0] : h.beds;
            const checked = compare.includes(h.id);
            return (
              <article key={h.id} className="p-5 rounded-2xl bg-card border border-border hover:shadow-soft transition">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-lg">{h.name}</h3>
                    <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="size-3.5" />{h.city} · {h.address}</div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {h.emergency_24x7 && <Tag tone="success">24×7 ER</Tag>}
                      {h.has_icu && <Tag>ICU</Tag>}
                      {h.has_mri && <Tag>MRI</Tag>}
                      {h.has_ambulance && <Tag>Ambulance</Tag>}
                      {h.is_government && <Tag tone="primary">Govt</Tag>}
                      {h.ayushman && <Tag tone="primary">Ayushman</Tag>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-warning/15 text-warning-foreground text-sm font-semibold">
                      <Star className="size-3.5 fill-current" /> {Number(h.rating).toFixed(1)}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground inline-flex items-center"><IndianRupee className="size-3" />{h.cost_tier}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(h.specialties || []).slice(0,4).map((s: string) => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{s}</span>
                  ))}
                </div>
                {beds && (
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                    <BedStat label="ICU" v={beds.icu_available} />
                    <BedStat label="Oxygen" v={beds.oxygen_available} />
                    <BedStat label="Emergency" v={beds.emergency_available} />
                    <BedStat label="General" v={beds.general_available} />
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input type="checkbox" checked={checked} onChange={() => toggleCompare(h.id)} /> Compare
                  </label>
                  <div className="flex gap-2">
                    <Link to="/doctors" search={{ hospital: h.id }}><Button variant="outline" size="sm"><Stethoscope className="size-4 mr-1" />Doctors</Button></Link>
                    <a href={`https://www.google.com/maps/search/${encodeURIComponent(h.name + " " + h.city)}`} target="_blank" rel="noreferrer">
                      <Button size="sm"><MapPin className="size-4 mr-1" />Directions</Button>
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Tag({ children, tone = "default" }: { children: React.ReactNode; tone?: "default"|"success"|"primary" }) {
  const cls = tone === "success" ? "bg-success/15 text-success-foreground" : tone === "primary" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground";
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{children}</span>;
}
function BedStat({ label, v }: { label: string; v: number }) {
  const tone = v > 5 ? "text-success" : v > 0 ? "text-warning-foreground" : "text-emergency";
  return (
    <div className="p-2 rounded-lg bg-muted">
      <div className={`font-bold ${tone}`}>{v}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
