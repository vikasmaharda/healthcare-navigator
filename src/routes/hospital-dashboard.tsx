import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  Building2, BedDouble, Stethoscope, Wrench, Layers, History, Save, Plus, Trash2, Pencil, X, ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getMyHospital, updateMyHospital, updateMyBeds,
  saveMyDoctor, deleteMyDoctor,
  saveMyFacility, deleteMyFacility,
  saveMyDepartment, deleteMyDepartment,
} from "@/lib/hospital.functions";

export const Route = createFileRoute("/hospital-dashboard")({
  component: HospitalDashboardPage,
  head: () => ({
    meta: [
      { title: "Hospital Dashboard — MediRoute" },
      { name: "description", content: "Hospital administrators update beds, doctors, departments, facilities and emergency availability for their own hospital on MediRoute." },
      { property: "og:title", content: "Hospital Dashboard — MediRoute" },
      { property: "og:description", content: "Manage your hospital's live availability, doctors and facilities on MediRoute." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Tab = "overview" | "profile" | "beds" | "doctors" | "departments" | "facilities" | "history";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "overview", label: "Overview", icon: Building2 },
  { id: "profile", label: "Hospital profile", icon: Building2 },
  { id: "beds", label: "ICU / Beds", icon: BedDouble },
  { id: "doctors", label: "Doctors", icon: Stethoscope },
  { id: "departments", label: "Departments", icon: Layers },
  { id: "facilities", label: "Facilities", icon: Wrench },
  { id: "history", label: "Update history", icon: History },
];

const FACILITY_STATUS = [
  { v: "available", label: "Available" },
  { v: "limited", label: "Limited" },
  { v: "temporarily_unavailable", label: "Temporarily unavailable" },
  { v: "unavailable", label: "Unavailable" },
] as const;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmt(ts?: string | null) {
  if (!ts) return "unavailable";
  return new Date(ts).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

const input = "w-full px-3 py-2 rounded-lg bg-muted text-sm outline-none";

function HospitalDashboardPage() {
  const { user, loading } = useAuth();
  const load = useServerFn(getMyHospital);
  const q = useQuery({ queryKey: ["hospital", "me"], queryFn: () => load(), enabled: !!user, retry: false });
  const [tab, setTab] = useState<Tab>("overview");

  if (loading || (user && q.isLoading)) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;

  if (!user)
    return <Gate title="Hospital sign-in required" body="Please sign in with your hospital's authorised email address."
      cta={<Link to="/login" search={{ redirect: "/hospital-dashboard" }}><Button>Go to login</Button></Link>} />;

  if (q.isError || !q.data?.hospital)
    return <Gate title="No hospital linked to this account"
      body={`You're signed in as ${user.email}. This account isn't approved as an administrator of any hospital yet. Submit your hospital for verification, and the MediRoute team will link your account.`}
      cta={<Link to="/submit-hospital"><Button>Register your hospital</Button></Link>} />;

  const d = q.data;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-12 rounded-2xl gradient-primary grid place-items-center text-primary-foreground"><Building2 className="size-6" /></div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold truncate">{d.hospital.name}</h1>
          <p className="text-sm text-muted-foreground truncate">{[d.hospital.city, d.hospital.state].filter(Boolean).join(", ") || "Location not available"} · Last updated {fmt(d.hospital.updated_at)}</p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2 mb-6 border-b border-border">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2 rounded-t-md text-sm whitespace-nowrap inline-flex items-center gap-1.5 ${tab === t.id ? "bg-muted text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="size-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <Overview data={d} />}
      {tab === "profile" && <ProfileForm hospital={d.hospital} />}
      {tab === "beds" && <BedsForm beds={d.beds} />}
      {tab === "doctors" && <Doctors doctors={d.doctors} />}
      {tab === "departments" && <Departments departments={d.departments} />}
      {tab === "facilities" && <Facilities facilities={d.facilities} />}
      {tab === "history" && <HistoryList updates={d.updates} />}
    </div>
  );
}

function Gate({ title, body, cta }: { title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="size-14 mx-auto rounded-2xl gradient-primary grid place-items-center text-primary-foreground mb-4"><ShieldAlert className="size-7" /></div>
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground mt-2">{body}</p>
      {cta && <div className="mt-6">{cta}</div>}
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold font-display mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function Overview({ data }: { data: any }) {
  const b = data.beds;
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card label="ICU beds available" value={b?.icu_available != null ? String(b.icu_available) : "Not available"} sub={`Last updated: ${fmt(b?.updated_at)}`} />
        <Card label="Emergency beds" value={b?.emergency_available != null ? String(b.emergency_available) : "Not available"} sub={`Last updated: ${fmt(b?.updated_at)}`} />
        <Card label="Active doctors" value={String(data.doctors.filter((x: any) => x.is_active).length)} />
        <Card label="Departments" value={String(data.departments.length)} />
      </div>
      <div className="p-4 rounded-xl bg-card border border-border">
        <h2 className="font-semibold mb-3">Recent updates</h2>
        <HistoryList updates={data.updates.slice(0, 6)} bare />
      </div>
    </div>
  );
}

function ProfileForm({ hospital }: { hospital: any }) {
  const qc = useQueryClient();
  const save = useServerFn(updateMyHospital);
  const [f, setF] = useState({
    name: hospital.name ?? "", address: hospital.address ?? "", city: hospital.city ?? "", state: hospital.state ?? "",
    pincode: hospital.pincode ?? "", phone: hospital.phone ?? "", emergency_phone: hospital.emergency_phone ?? "",
    email: hospital.email ?? "", website: hospital.website ?? "", maps_link: hospital.maps_link ?? "",
    emergency_24x7: !!hospital.emergency_24x7, has_icu: !!hospital.has_icu, has_mri: !!hospital.has_mri,
    has_ambulance: !!hospital.has_ambulance, has_blood_bank: !!hospital.has_blood_bank,
    has_pharmacy: !!hospital.has_pharmacy, has_lab: !!hospital.has_lab,
  });
  const m = useMutation({
    mutationFn: () => save({ data: f }),
    onSuccess: () => { toast.success("Hospital profile updated"); qc.invalidateQueries({ queryKey: ["hospital", "me"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Could not save changes"),
  });

  const set = (k: string, v: any) => setF(s => ({ ...s, [k]: v }));
  const text = (k: keyof typeof f, label: string, type = "text") => (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input className={input} type={type} value={f[k] as string} onChange={e => set(k, e.target.value)} />
    </label>
  );
  const check = (k: keyof typeof f, label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={f[k] as boolean} onChange={e => set(k, e.target.checked)} /> {label}
    </label>
  );

  return (
    <form onSubmit={e => { e.preventDefault(); m.mutate(); }} className="space-y-5 max-w-3xl">
      <div className="grid sm:grid-cols-2 gap-3">
        {text("name", "Hospital name *")}
        {text("city", "City *")}
        {text("state", "State")}
        {text("pincode", "PIN code")}
        {text("phone", "Contact number")}
        {text("emergency_phone", "Emergency contact")}
        {text("email", "Email", "email")}
        {text("website", "Website")}
      </div>
      <label className="block">
        <span className="text-xs text-muted-foreground">Address</span>
        <textarea className={input} rows={2} value={f.address} onChange={e => set("address", e.target.value)} />
      </label>
      {text("maps_link", "Google Maps link")}
      <div className="grid sm:grid-cols-3 gap-2 p-4 rounded-xl bg-card border border-border">
        {check("emergency_24x7", "24x7 Emergency")}
        {check("has_icu", "ICU")}
        {check("has_ambulance", "Ambulance")}
        {check("has_blood_bank", "Blood bank")}
        {check("has_pharmacy", "Pharmacy")}
        {check("has_lab", "Laboratory")}
        {check("has_mri", "MRI")}
      </div>
      <Button type="submit" disabled={m.isPending}><Save className="size-4 mr-1" />{m.isPending ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}

function BedsForm({ beds }: { beds: any }) {
  const qc = useQueryClient();
  const save = useServerFn(updateMyBeds);
  const [f, setF] = useState({
    icu_available: beds?.icu_available ?? 0,
    oxygen_available: beds?.oxygen_available ?? 0,
    emergency_available: beds?.emergency_available ?? 0,
    general_available: beds?.general_available ?? 0,
  });
  const m = useMutation({
    mutationFn: () => save({ data: f }),
    onSuccess: () => { toast.success("Bed availability updated"); qc.invalidateQueries({ queryKey: ["hospital", "me"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Could not save"),
  });
  const num = (k: keyof typeof f, label: string) => (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input className={input} type="number" min={0} value={f[k]}
        onChange={e => setF(s => ({ ...s, [k]: Math.max(0, Number(e.target.value) || 0) }))} />
    </label>
  );
  return (
    <form onSubmit={e => { e.preventDefault(); m.mutate(); }} className="space-y-4 max-w-2xl">
      <p className="text-sm text-muted-foreground">Last updated: {fmt(beds?.updated_at)}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {num("icu_available", "ICU beds available")}
        {num("oxygen_available", "Oxygen beds available")}
        {num("emergency_available", "Emergency beds available")}
        {num("general_available", "General beds available")}
      </div>
      <Button type="submit" disabled={m.isPending}><Save className="size-4 mr-1" />{m.isPending ? "Saving…" : "Update availability"}</Button>
    </form>
  );
}

const emptyDoctor = {
  name: "", specialization: "", experience_years: 0, consultation_fee: 0,
  timing: "", available_days: [] as string[], is_available: true, is_active: true,
};

function Doctors({ doctors }: { doctors: any[] }) {
  const qc = useQueryClient();
  const save = useServerFn(saveMyDoctor);
  const del = useServerFn(deleteMyDoctor);
  const [editing, setEditing] = useState<string | null>(null);
  const [f, setF] = useState({ ...emptyDoctor });

  const reset = () => { setEditing(null); setF({ ...emptyDoctor }); };
  const done = (msg: string) => { toast.success(msg); qc.invalidateQueries({ queryKey: ["hospital", "me"] }); reset(); };

  const m = useMutation({
    mutationFn: () => save({ data: { id: editing, values: f } }),
    onSuccess: () => done("Doctor saved"),
    onError: (e: any) => toast.error(e?.message ?? "Could not save doctor"),
  });
  const dm = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => done("Doctor removed"),
    onError: (e: any) => toast.error(e?.message ?? "Could not remove doctor"),
  });

  const startEdit = (d: any) => {
    setEditing(d.id);
    setF({
      name: d.name ?? "", specialization: d.specialization ?? "", experience_years: d.experience_years ?? 0,
      consultation_fee: d.consultation_fee ?? 0, timing: d.timing ?? "", available_days: d.available_days ?? [],
      is_available: !!d.is_available, is_active: !!d.is_active,
    });
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={e => { e.preventDefault(); m.mutate(); }} className="p-4 rounded-xl bg-card border border-border space-y-3 h-fit">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{editing ? "Edit doctor" : "Add doctor"}</h2>
          {editing && <button type="button" onClick={reset} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>}
        </div>
        <input className={input} placeholder="Doctor name *" value={f.name} onChange={e => setF(s => ({ ...s, name: e.target.value }))} required />
        <input className={input} placeholder="Specialization *" value={f.specialization} onChange={e => setF(s => ({ ...s, specialization: e.target.value }))} required />
        <div className="grid grid-cols-2 gap-3">
          <input className={input} type="number" min={0} placeholder="Experience (years)" value={f.experience_years} onChange={e => setF(s => ({ ...s, experience_years: Number(e.target.value) || 0 }))} />
          <input className={input} type="number" min={0} placeholder="Consultation fee (₹)" value={f.consultation_fee} onChange={e => setF(s => ({ ...s, consultation_fee: Number(e.target.value) || 0 }))} />
        </div>
        <input className={input} placeholder="Timings e.g. 10:00 AM – 2:00 PM" value={f.timing} onChange={e => setF(s => ({ ...s, timing: e.target.value }))} />
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map(day => {
            const on = f.available_days.includes(day);
            return (
              <button type="button" key={day}
                onClick={() => setF(s => ({ ...s, available_days: on ? s.available_days.filter(x => x !== day) : [...s.available_days, day] }))}
                className={`px-2.5 py-1 rounded-md text-xs border ${on ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                {day}
              </button>
            );
          })}
        </div>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_available} onChange={e => setF(s => ({ ...s, is_available: e.target.checked }))} /> Available now</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_active} onChange={e => setF(s => ({ ...s, is_active: e.target.checked }))} /> Active</label>
        </div>
        <Button type="submit" disabled={m.isPending}><Plus className="size-4 mr-1" />{editing ? "Save doctor" : "Add doctor"}</Button>
      </form>

      <div className="space-y-2">
        {doctors.length === 0 && <p className="text-sm text-muted-foreground">No doctors added yet.</p>}
        {doctors.map(d => (
          <div key={d.id} className="p-3 rounded-xl bg-card border border-border flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{d.name}</div>
              <div className="text-xs text-muted-foreground">{d.specialization} · {d.timing || "Timings not available"}</div>
              <div className="text-xs mt-1">
                <span className={d.is_available ? "text-primary" : "text-muted-foreground"}>{d.is_available ? "Available" : "Unavailable"}</span>
                {!d.is_active && <span className="text-muted-foreground"> · Inactive</span>}
                {d.available_days?.length ? <span className="text-muted-foreground"> · {d.available_days.join(", ")}</span> : null}
              </div>
            </div>
            <button onClick={() => startEdit(d)} className="p-2 rounded-md hover:bg-muted"><Pencil className="size-4" /></button>
            <button onClick={() => dm.mutate(d.id)} className="p-2 rounded-md hover:bg-muted text-destructive"><Trash2 className="size-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Departments({ departments }: { departments: any[] }) {
  const qc = useQueryClient();
  const save = useServerFn(saveMyDepartment);
  const del = useServerFn(deleteMyDepartment);
  const [f, setF] = useState({ name: "", description: "", head_doctor: "", phone: "" });
  const done = (msg: string) => { toast.success(msg); qc.invalidateQueries({ queryKey: ["hospital", "me"] }); setF({ name: "", description: "", head_doctor: "", phone: "" }); };
  const m = useMutation({ mutationFn: () => save({ data: { id: null, values: f } }), onSuccess: () => done("Department saved"), onError: (e: any) => toast.error(e?.message ?? "Could not save") });
  const dm = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => done("Department removed"), onError: (e: any) => toast.error(e?.message ?? "Could not remove") });

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={e => { e.preventDefault(); m.mutate(); }} className="p-4 rounded-xl bg-card border border-border space-y-3 h-fit">
        <h2 className="font-semibold">Add department</h2>
        <input className={input} placeholder="Department name *" value={f.name} onChange={e => setF(s => ({ ...s, name: e.target.value }))} required />
        <input className={input} placeholder="Head doctor" value={f.head_doctor} onChange={e => setF(s => ({ ...s, head_doctor: e.target.value }))} />
        <input className={input} placeholder="Department phone" value={f.phone} onChange={e => setF(s => ({ ...s, phone: e.target.value }))} />
        <textarea className={input} rows={2} placeholder="Description" value={f.description} onChange={e => setF(s => ({ ...s, description: e.target.value }))} />
        <Button type="submit" disabled={m.isPending}><Plus className="size-4 mr-1" />Add department</Button>
      </form>
      <div className="space-y-2">
        {departments.length === 0 && <p className="text-sm text-muted-foreground">No departments added yet.</p>}
        {departments.map(d => (
          <div key={d.id} className="p-3 rounded-xl bg-card border border-border flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{d.name}</div>
              <div className="text-xs text-muted-foreground">{d.head_doctor || "Head not available"}{d.phone ? ` · ${d.phone}` : ""}</div>
            </div>
            <button onClick={() => dm.mutate(d.id)} className="p-2 rounded-md hover:bg-muted text-destructive"><Trash2 className="size-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Facilities({ facilities }: { facilities: any[] }) {
  const qc = useQueryClient();
  const save = useServerFn(saveMyFacility);
  const del = useServerFn(deleteMyFacility);
  const [f, setF] = useState<{ name: string; category: string; status: typeof FACILITY_STATUS[number]["v"]; notes: string }>(
    { name: "", category: "", status: "available", notes: "" });
  const done = (msg: string) => { toast.success(msg); qc.invalidateQueries({ queryKey: ["hospital", "me"] }); };
  const m = useMutation({
    mutationFn: (payload: { id: string | null; values: any }) => save({ data: payload }),
    onSuccess: () => { done("Facility saved"); setF({ name: "", category: "", status: "available", notes: "" }); },
    onError: (e: any) => toast.error(e?.message ?? "Could not save"),
  });
  const dm = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => done("Facility removed"), onError: (e: any) => toast.error(e?.message ?? "Could not remove") });

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <form onSubmit={e => { e.preventDefault(); m.mutate({ id: null, values: f }); }} className="p-4 rounded-xl bg-card border border-border space-y-3 h-fit">
        <h2 className="font-semibold">Add facility</h2>
        <input className={input} placeholder="Facility name *" value={f.name} onChange={e => setF(s => ({ ...s, name: e.target.value }))} required />
        <input className={input} placeholder="Category e.g. Diagnostics" value={f.category} onChange={e => setF(s => ({ ...s, category: e.target.value }))} />
        <select className={input} value={f.status} onChange={e => setF(s => ({ ...s, status: e.target.value as any }))}>
          {FACILITY_STATUS.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
        </select>
        <input className={input} placeholder="Notes" value={f.notes} onChange={e => setF(s => ({ ...s, notes: e.target.value }))} />
        <Button type="submit" disabled={m.isPending}><Plus className="size-4 mr-1" />Add facility</Button>
      </form>
      <div className="space-y-2">
        {facilities.length === 0 && <p className="text-sm text-muted-foreground">No facilities added yet.</p>}
        {facilities.map(x => (
          <div key={x.id} className="p-3 rounded-xl bg-card border border-border flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{x.name}</div>
              <div className="text-xs text-muted-foreground">{x.category || "Uncategorised"} · Last updated {fmt(x.updated_at)}</div>
            </div>
            <select
              className="px-2 py-1 rounded-md bg-muted text-xs outline-none"
              value={x.status ?? "available"}
              onChange={e => m.mutate({ id: x.id, values: { name: x.name, category: x.category ?? "", status: e.target.value, notes: x.notes ?? "" } })}
            >
              {FACILITY_STATUS.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
            <button onClick={() => dm.mutate(x.id)} className="p-2 rounded-md hover:bg-muted text-destructive"><Trash2 className="size-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryList({ updates, bare }: { updates: any[]; bare?: boolean }) {
  if (!updates.length) return <p className="text-sm text-muted-foreground">No updates recorded yet.</p>;
  const list = (
    <ul className="space-y-2">
      {updates.map(u => (
        <li key={u.id} className="text-sm flex items-start gap-2">
          <History className="size-4 text-primary mt-0.5 shrink-0" />
          <span><span className="font-medium">{u.summary}</span> <span className="text-muted-foreground">— {fmt(u.created_at)}</span></span>
        </li>
      ))}
    </ul>
  );
  return bare ? list : <div className="p-4 rounded-xl bg-card border border-border">{list}</div>;
}
