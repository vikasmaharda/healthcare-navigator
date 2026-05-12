import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Building2, Send, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/submit-hospital")({ component: SubmitPage });

const SPECIALTIES = ["Cardiology","Neurology","Orthopedics","Pediatrics","Dermatology","Oncology","General Medicine","Dental","Gynaecology","ENT","Ophthalmology"];

const schema = z.object({
  name: z.string().trim().min(2).max(200),
  city: z.string().trim().min(2).max(100),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

function SubmitPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "", city: "", address: "", phone: "", notes: "",
    specialties: [] as string[],
    emergency_24x7: false, has_icu: false, has_mri: false, has_ambulance: false,
    is_government: false, ayushman: false,
    lat: "" as string, lng: "" as string,
  });

  const setF = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const toggleSpec = (s: string) =>
    setF("specialties", form.specialties.includes(s) ? form.specialties.filter((x) => x !== s) : [...form.specialties, s]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not available");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setF("lat", pos.coords.latitude.toFixed(6));
        setF("lng", pos.coords.longitude.toFixed(6));
        toast.success("Location captured");
      },
      (e) => toast.error(e.message),
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in first");
      return nav({ to: "/login" });
    }
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("pending_hospitals").insert({
      submitted_by: user.id,
      submitter_email: user.email,
      name: form.name.trim(),
      city: form.city.trim(),
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      specialties: form.specialties,
      emergency_24x7: form.emergency_24x7,
      has_icu: form.has_icu,
      has_mri: form.has_mri,
      has_ambulance: form.has_ambulance,
      is_government: form.is_government,
      ayushman: form.ayushman,
      lat: form.lat ? Number(form.lat) : null,
      lng: form.lng ? Number(form.lng) : null,
      notes: form.notes.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Submitted! Admin will review it shortly.");
    nav({ to: "/" });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="size-12 rounded-2xl gradient-primary grid place-items-center text-primary-foreground"><Building2 className="size-6" /></div>
        <div>
          <h1 className="font-display text-3xl font-bold">Add a hospital</h1>
          <p className="text-muted-foreground text-sm">Submit a hospital we don't list yet. The admin verifies submissions before they appear.</p>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-xl bg-primary/10 text-primary text-xs flex items-start gap-2">
        <ShieldCheck className="size-4 mt-0.5 shrink-0" />
        <span>Submissions are stored for admin review. Please share accurate, public information only.</span>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-5 bg-card border border-border rounded-2xl p-5">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Hospital name *">
            <input className="ipt" required value={form.name} onChange={(e) => setF("name", e.target.value)} />
          </Field>
          <Field label="City *">
            <input className="ipt" required value={form.city} onChange={(e) => setF("city", e.target.value)} />
          </Field>
        </div>
        <Field label="Address">
          <input className="ipt" value={form.address} onChange={(e) => setF("address", e.target.value)} />
        </Field>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Phone"><input className="ipt" value={form.phone} onChange={(e) => setF("phone", e.target.value)} /></Field>
          <Field label="Latitude"><input className="ipt" inputMode="decimal" value={form.lat} onChange={(e) => setF("lat", e.target.value)} /></Field>
          <Field label="Longitude"><input className="ipt" inputMode="decimal" value={form.lng} onChange={(e) => setF("lng", e.target.value)} /></Field>
        </div>
        <button type="button" onClick={useMyLocation} className="text-xs text-primary underline">Use my current location</button>

        <div>
          <div className="text-sm font-medium mb-2">Specialties</div>
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map((s) => {
              const active = form.specialties.includes(s);
              return (
                <button type="button" key={s} onClick={() => toggleSpec(s)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${active ? "bg-primary text-primary-foreground border-primary" : "border-border bg-muted hover:bg-card text-muted-foreground"}`}>
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-2 text-sm">
          {[
            ["emergency_24x7", "24×7 Emergency"],
            ["has_icu", "ICU"],
            ["has_mri", "MRI"],
            ["has_ambulance", "Ambulance"],
            ["is_government", "Government"],
            ["ayushman", "Ayushman Bharat"],
          ].map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
              <input type="checkbox" checked={(form as any)[k]} onChange={(e) => setF(k as any, e.target.checked)} />
              {label}
            </label>
          ))}
        </div>

        <Field label="Notes (optional)">
          <Textarea value={form.notes} onChange={(e) => setF("notes", e.target.value)} placeholder="Anything else the admin should know" />
        </Field>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={busy}><Send className="size-4 mr-2" />{busy ? "Submitting…" : "Submit for review"}</Button>
          <Link to="/" className="text-sm text-muted-foreground underline">Cancel</Link>
        </div>
      </form>

      <style>{`.ipt{display:block;width:100%;padding:.5rem .75rem;border-radius:.5rem;background:var(--muted);border:1px solid transparent;font-size:.875rem;outline:none}.ipt:focus{border-color:color-mix(in oklab,var(--primary) 50%,transparent)}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm font-medium mb-1">{label}</div>
      {children}
    </label>
  );
}
