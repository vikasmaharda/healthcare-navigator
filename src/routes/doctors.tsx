import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { supabase } from "@/integrations/supabase/client";
import { Star, Clock, IndianRupee, CalendarPlus, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";

const schema = z.object({
  specialty: fallback(z.string(), "").default(""),
  hospital: fallback(z.string(), "").default(""),
});
export const Route = createFileRoute("/doctors")({
  validateSearch: zodValidator(schema),
  component: DoctorsPage,
});

const SPECS = ["Cardiologist","Neurologist","Orthopedic","Dermatologist","General Physician","Pediatrician","Dentist","Eye Specialist","Oncologist","Gynecologist"];

function DoctorsPage() {
  const { specialty, hospital } = Route.useSearch();
  const nav = Route.useNavigate();

  const { data = [], isLoading } = useQuery({
    queryKey: ["doctors", specialty, hospital],
    queryFn: async () => {
      let q = supabase.from("doctors").select("*, hospitals(name, city)").order("rating", { ascending: false });
      if (specialty) q = q.eq("specialization", specialty);
      if (hospital) q = q.eq("hospital_id", hospital);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Doctors</h1>
      <p className="text-muted-foreground">Filter by specialization. View timings, fees, ratings, and waiting time.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={() => nav({ search: (p: any) => ({ ...p, specialty: "" }) })} className={`px-3 py-1.5 rounded-full text-xs border transition ${!specialty ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>All</button>
        {SPECS.map(s => (
          <button key={s} onClick={() => nav({ search: (p: any) => ({ ...p, specialty: s }) })}
            className={`px-3 py-1.5 rounded-full text-xs border transition ${specialty===s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:text-foreground"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? Array.from({length:6}).map((_,i)=>(<div key={i} className="h-56 rounded-2xl bg-muted animate-pulse" />)) :
        data.map((d: any) => (
          <div key={d.id} className="p-5 rounded-2xl bg-card border border-border hover:shadow-soft transition">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-full gradient-primary text-primary-foreground grid place-items-center font-bold">
                {d.name.split(" ").slice(-1)[0][0]}
              </div>
              <div>
                <div className="font-semibold">{d.name}</div>
                <div className="text-sm text-muted-foreground inline-flex items-center gap-1"><Stethoscope className="size-3.5" />{d.specialization}</div>
              </div>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">{d.hospitals?.name} · {d.hospitals?.city}</div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-1 text-warning-foreground"><Star className="size-3.5 fill-current text-warning-foreground" />{Number(d.rating).toFixed(1)}</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground"><IndianRupee className="size-3.5" />{d.consultation_fee}</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="size-3.5" />~{d.avg_wait_min}m wait</span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">{d.timing} · {d.experience_years} yrs exp</div>
            <Link to="/appointments" search={{ doctor: d.id }} className="mt-4 block">
              <Button className="w-full"><CalendarPlus className="size-4 mr-2" />Book Appointment</Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
