import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CalendarPlus, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const schema = z.object({ doctor: fallback(z.string(), "").default("") });
export const Route = createFileRoute("/appointments")({
  validateSearch: zodValidator(schema),
  component: Page,
});

function Page() {
  const { doctor } = Route.useSearch();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();

  useEffect(() => { if (!loading && !user) nav({ to: "/login", search: { redirect: "/appointments" } }); }, [loading, user, nav]);

  const [date, setDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0,10));
  const [time, setTime] = useState("10:30");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const { data: doc } = useQuery({
    enabled: !!doctor,
    queryKey: ["doc", doctor],
    queryFn: async () => {
      const { data } = await supabase.from("doctors").select("*, hospitals(name, city)").eq("id", doctor).maybeSingle();
      return data;
    },
  });

  const { data: appts = [] } = useQuery({
    enabled: !!user,
    queryKey: ["appts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select("*, doctors(name, specialization), hospitals(name, city)").order("appointment_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const book = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !doc) return;
    const { error } = await supabase.from("appointments").insert({
      user_id: user.id,
      doctor_id: doc.id,
      hospital_id: doc.hospital_id,
      appointment_date: date,
      appointment_time: time,
      patient_name: name || user.email?.split("@")[0] || "Patient",
      notes,
    });
    if (error) return toast.error(error.message);
    toast.success("Appointment booked! You'll receive a reminder.");
    setNotes(""); setName("");
    qc.invalidateQueries({ queryKey: ["appts", user.id] });
    nav({ to: "/appointments", search: { doctor: "" } });
  };

  const cancel = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Appointment cancelled");
    qc.invalidateQueries({ queryKey: ["appts", user!.id] });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 grid lg:grid-cols-2 gap-8">
      <section>
        <h1 className="font-display text-3xl font-bold">Book Appointment</h1>
        {doc ? (
          <div className="mt-4 p-4 rounded-2xl bg-card border border-border">
            <div className="font-semibold">{doc.name}</div>
            <div className="text-sm text-muted-foreground">{doc.specialization} · {doc.hospitals?.name}, {doc.hospitals?.city}</div>
            <div className="text-xs text-muted-foreground mt-1">{doc.timing} · ₹{doc.consultation_fee}</div>
          </div>
        ) : (
          <p className="mt-2 text-muted-foreground">Pick a doctor from the <Link to="/doctors" className="text-primary underline">doctors page</Link>.</p>
        )}

        {doc && (
          <form onSubmit={book} className="mt-5 grid gap-3 p-5 rounded-2xl bg-card border border-border">
            <label className="text-sm">Patient name
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="mt-1 w-full px-3 py-2 rounded-lg bg-muted text-sm outline-none" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Date
                <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg bg-muted text-sm outline-none" />
              </label>
              <label className="text-sm">Time
                <input type="time" value={time} onChange={e=>setTime(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg bg-muted text-sm outline-none" />
              </label>
            </div>
            <label className="text-sm">Notes (optional)
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} className="mt-1 w-full px-3 py-2 rounded-lg bg-muted text-sm outline-none" />
            </label>
            <Button type="submit"><CalendarPlus className="size-4 mr-2" />Confirm Booking</Button>
          </form>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold">Your Appointments</h2>
        {appts.length === 0 ? (
          <p className="mt-3 text-muted-foreground text-sm">No appointments yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {appts.map((a: any) => (
              <li key={a.id} className="p-4 rounded-2xl bg-card border border-border flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold flex items-center gap-2"><CheckCircle2 className="size-4 text-success" />{a.doctors?.name}</div>
                  <div className="text-sm text-muted-foreground">{a.doctors?.specialization} · {a.hospitals?.name}</div>
                  <div className="text-sm mt-1">{a.appointment_date} at {a.appointment_time}</div>
                  {a.notes && <div className="text-xs text-muted-foreground mt-1">"{a.notes}"</div>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => cancel(a.id)} aria-label="Cancel"><Trash2 className="size-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
