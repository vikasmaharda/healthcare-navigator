import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Shield, CheckCircle2, XCircle, MailOpen, Mail, Building2, Stethoscope, Layers, Wrench, BarChart3, Plus, Trash2, Pencil, Save, X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  adminAnalytics, adminCheckSelf,
  adminListPending, adminApproveHospital, adminRejectHospital,
  adminListMessages, adminResolveMessage,
  adminListDoctors, adminCreateDoctor, adminUpdateDoctor, adminDeleteDoctor,
  adminCreateHospital, adminUpdateHospital, adminDeleteHospital,
  adminListDepartments, adminCreateDepartment, adminDeleteDepartment,
  adminListFacilities, adminCreateFacility, adminDeleteFacility,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type Tab = "dashboard" | "hospitals" | "doctors" | "departments" | "facilities" | "pending" | "messages";

function AdminPage() {
  const { user, loading } = useAuth();
  const checkSelf = useServerFn(adminCheckSelf);
  const me = useQuery({
    queryKey: ["admin", "self"],
    queryFn: () => checkSelf(),
    enabled: !!user,
  });

  if (loading || (user && me.isLoading))
    return <div className="p-12 text-center text-muted-foreground">Loading…</div>;

  if (!user) return <Gate title="Admin sign-in required" body="Please sign in with the admin account." cta={<Link to="/login"><Button>Go to login</Button></Link>} />;
  if (!me.data?.isAdmin) return <Gate title="Admins only" body={`You're signed in as ${user.email}. This account doesn't have admin role.`} />;

  return <AdminInner />;
}

function Gate({ title, body, cta }: { title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="size-14 mx-auto rounded-2xl gradient-primary grid place-items-center text-primary-foreground mb-4"><Shield className="size-7" /></div>
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground mt-2">{body}</p>
      {cta && <div className="mt-6">{cta}</div>}
    </div>
  );
}

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "hospitals", label: "Hospitals", icon: Building2 },
  { id: "doctors", label: "Doctors", icon: Stethoscope },
  { id: "departments", label: "Departments", icon: Layers },
  { id: "facilities", label: "Facilities", icon: Wrench },
  { id: "pending", label: "Pending", icon: Mail },
  { id: "messages", label: "Messages", icon: Mail },
];

function AdminInner() {
  const [tab, setTab] = useState<Tab>("dashboard");
  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-12 rounded-2xl gradient-primary grid place-items-center text-primary-foreground"><Shield className="size-6" /></div>
        <div>
          <h1 className="font-display text-3xl font-bold">Admin</h1>
          <p className="text-muted-foreground text-sm">Manage hospitals, doctors, departments and facilities.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-6 border-b border-border">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Icon className="size-4" />{t.label}
            </button>
          );
        })}
      </div>

      {tab === "dashboard" && <DashboardTab />}
      {tab === "hospitals" && <HospitalsTab />}
      {tab === "doctors" && <DoctorsTab />}
      {tab === "departments" && <DepartmentsTab />}
      {tab === "facilities" && <FacilitiesTab />}
      {tab === "pending" && <PendingTab />}
      {tab === "messages" && <MessagesTab />}
    </div>
  );
}

// ---------------- Dashboard ----------------
function DashboardTab() {
  const fn = useServerFn(adminAnalytics);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "analytics"], queryFn: () => fn() });
  if (isLoading || !data) return <Skeleton />;
  const c = data.counts;
  const stats = [
    { label: "Hospitals", v: c.hospitals }, { label: "Govt hospitals", v: c.govt_hospitals },
    { label: "Doctors", v: c.doctors }, { label: "Appointments", v: c.appointments },
    { label: "Departments", v: c.departments }, { label: "Facilities", v: c.facilities },
    { label: "Pending submissions", v: c.pending_submissions }, { label: "Open messages", v: c.open_messages },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {stats.map(s => (
          <div key={s.label} className="p-4 rounded-xl bg-card border border-border">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className="text-2xl font-bold mt-1">{s.v}</div>
          </div>
        ))}
      </div>
      <Section title="Top cities by hospital count">
        {data.topCities.length === 0 ? <Empty>No data.</Empty> : (
          <div className="grid gap-2">
            {data.topCities.map(([city, n]) => {
              const max = data.topCities[0][1] as number;
              return (
                <div key={city} className="flex items-center gap-3">
                  <div className="w-32 text-sm">{city}</div>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full gradient-primary" style={{ width: `${((n as number)/max)*100}%` }} />
                  </div>
                  <div className="w-10 text-right text-sm font-semibold">{n as number}</div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

// ---------------- Hospitals CRUD ----------------
function HospitalsTab() {
  const qc = useQueryClient();
  const create = useServerFn(adminCreateHospital);
  const update = useServerFn(adminUpdateHospital);
  const del = useServerFn(adminDeleteHospital);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: hospitals = [], isLoading } = useQuery({
    queryKey: ["admin", "hospitals"],
    queryFn: async () => (await supabase.from("hospitals").select("*").order("name")).data ?? [],
  });

  const mDel = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin","hospitals"] }); qc.invalidateQueries({ queryKey: ["hospitals"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm text-muted-foreground">{hospitals.length} hospitals</div>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="size-4 mr-1" />New hospital</Button>
      </div>
      {creating && (
        <HospitalForm
          onCancel={() => setCreating(false)}
          onSubmit={async (v) => {
            try { await create({ data: v as any }); toast.success("Created"); setCreating(false); qc.invalidateQueries({ queryKey: ["admin","hospitals"] }); qc.invalidateQueries({ queryKey: ["hospitals"] }); }
            catch (e: any) { toast.error(e?.message ?? "Failed"); }
          }}
        />
      )}
      {isLoading ? <Skeleton /> : (
        <div className="grid gap-2">
          {(hospitals as any[]).map(h => (
            <div key={h.id} className="p-4 rounded-xl bg-card border border-border">
              {editing?.id === h.id ? (
                <HospitalForm
                  initial={h}
                  onCancel={() => setEditing(null)}
                  onSubmit={async (v) => {
                    try { await update({ data: { id: h.id, patch: v as any } }); toast.success("Saved"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin","hospitals"] }); qc.invalidateQueries({ queryKey: ["hospitals"] }); }
                    catch (e: any) { toast.error(e?.message ?? "Failed"); }
                  }}
                />
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{h.name}</div>
                    <div className="text-xs text-muted-foreground">{h.city}{h.address ? ` · ${h.address}` : ""}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(h.specialties ?? []).slice(0,5).map((s: string) => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{s}</span>)}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setEditing(h)}><Pencil className="size-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => { if (confirm(`Delete ${h.name}?`)) mDel.mutate(h.id); }}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HospitalForm({ initial, onSubmit, onCancel }: { initial?: any; onSubmit: (v: any) => Promise<void>; onCancel: () => void }) {
  const [v, setV] = useState({
    name: initial?.name ?? "", city: initial?.city ?? "", address: initial?.address ?? "", phone: initial?.phone ?? "",
    specialties: (initial?.specialties ?? []).join(", "),
    emergency_24x7: initial?.emergency_24x7 ?? false, has_icu: initial?.has_icu ?? false,
    has_mri: initial?.has_mri ?? false, has_ambulance: initial?.has_ambulance ?? false,
    is_government: initial?.is_government ?? false, ayushman: initial?.ayushman ?? false,
    lat: initial?.lat ?? "", lng: initial?.lng ?? "",
    rating: initial?.rating ?? 4.0, cost_tier: initial?.cost_tier ?? "medium",
    image_url: initial?.image_url ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const path = `${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
      const { error } = await supabase.storage.from("hospital-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("hospital-images").getPublicUrl(path);
      setV(s => ({ ...s, image_url: data.publicUrl }));
      toast.success("Image uploaded");
    } catch (e: any) { toast.error(e?.message ?? "Upload failed"); }
    finally { setUploading(false); }
  };

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      setBusy(true);
      try {
        await onSubmit({
          ...v,
          specialties: v.specialties.split(",").map((s: string) => s.trim()).filter(Boolean),
          lat: v.lat === "" ? null : Number(v.lat),
          lng: v.lng === "" ? null : Number(v.lng),
          rating: Number(v.rating),
          image_url: v.image_url || null,
          address: v.address || null, phone: v.phone || null,
        });
      } finally { setBusy(false); }
    }} className="grid gap-2 p-3 rounded-lg bg-muted/30">
      <div className="grid sm:grid-cols-2 gap-2">
        <Input label="Name *" value={v.name} onChange={x => setV(s=>({...s, name:x}))} required />
        <Input label="City *" value={v.city} onChange={x => setV(s=>({...s, city:x}))} required />
        <Input label="Address" value={v.address} onChange={x => setV(s=>({...s, address:x}))} />
        <Input label="Phone" value={v.phone} onChange={x => setV(s=>({...s, phone:x}))} />
        <Input label="Latitude" value={String(v.lat)} onChange={x => setV(s=>({...s, lat:x as any}))} />
        <Input label="Longitude" value={String(v.lng)} onChange={x => setV(s=>({...s, lng:x as any}))} />
        <Input label="Rating (0–5)" value={String(v.rating)} onChange={x => setV(s=>({...s, rating:x as any}))} />
        <Select label="Cost tier" value={v.cost_tier} onChange={x => setV(s=>({...s, cost_tier:x as any}))} options={["low","medium","high"]} />
      </div>
      <Input label="Specialties (comma separated)" value={v.specialties} onChange={x => setV(s=>({...s, specialties:x}))} />
      <div className="grid sm:grid-cols-3 gap-2 text-sm">
        <Check label="24×7 Emergency" v={v.emergency_24x7} on={x=>setV(s=>({...s, emergency_24x7:x}))} />
        <Check label="ICU" v={v.has_icu} on={x=>setV(s=>({...s, has_icu:x}))} />
        <Check label="MRI" v={v.has_mri} on={x=>setV(s=>({...s, has_mri:x}))} />
        <Check label="Ambulance" v={v.has_ambulance} on={x=>setV(s=>({...s, has_ambulance:x}))} />
        <Check label="Government" v={v.is_government} on={x=>setV(s=>({...s, is_government:x}))} />
        <Check label="Ayushman" v={v.ayushman} on={x=>setV(s=>({...s, ayushman:x}))} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Image</label>
        <div className="flex items-center gap-2 mt-1">
          <input type="file" accept="image/*" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} className="text-sm" />
          {uploading && <span className="text-xs">Uploading…</span>}
          {v.image_url && <img src={v.image_url} alt="" className="size-12 rounded object-cover" />}
        </div>
      </div>
      <div className="flex gap-2 mt-1">
        <Button type="submit" size="sm" disabled={busy}><Save className="size-4 mr-1" />{busy ? "Saving…" : "Save"}</Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}><X className="size-4 mr-1" />Cancel</Button>
      </div>
    </form>
  );
}

// ---------------- Doctors CRUD ----------------
function DoctorsTab() {
  const qc = useQueryClient();
  const list = useServerFn(adminListDoctors);
  const create = useServerFn(adminCreateDoctor);
  const update = useServerFn(adminUpdateDoctor);
  const del = useServerFn(adminDeleteDoctor);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const { data = [], isLoading } = useQuery({ queryKey: ["admin","doctors"], queryFn: () => list() });
  const { data: hospitals = [] } = useQuery({ queryKey: ["hospitals","brief"], queryFn: async () => (await supabase.from("hospitals").select("id,name").order("name")).data ?? [] });

  const mDel = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin","doctors"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm text-muted-foreground">{(data as any[]).length} doctors</div>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="size-4 mr-1" />New doctor</Button>
      </div>
      {creating && (
        <DoctorForm hospitals={hospitals as any} onCancel={() => setCreating(false)}
          onSubmit={async v => { try { await create({ data: v as any }); toast.success("Created"); setCreating(false); qc.invalidateQueries({ queryKey: ["admin","doctors"] }); } catch(e:any){ toast.error(e?.message); }}} />
      )}
      {isLoading ? <Skeleton /> : (
        <div className="grid gap-2">
          {(data as any[]).map(d => (
            <div key={d.id} className="p-4 rounded-xl bg-card border border-border">
              {editing?.id === d.id ? (
                <DoctorForm initial={d} hospitals={hospitals as any} onCancel={() => setEditing(null)}
                  onSubmit={async v => { try { await update({ data: { id: d.id, patch: v as any } }); toast.success("Saved"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin","doctors"] }); } catch(e:any){ toast.error(e?.message); }}} />
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">Dr. {d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.specialization} · ₹{d.consultation_fee} · {d.experience_years}y exp</div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setEditing(d)}><Pencil className="size-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => confirm(`Delete Dr. ${d.name}?`) && mDel.mutate(d.id)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DoctorForm({ initial, hospitals, onSubmit, onCancel }: { initial?: any; hospitals: { id: string; name: string }[]; onSubmit: (v: any) => Promise<void>; onCancel: () => void }) {
  const [v, setV] = useState({
    name: initial?.name ?? "", specialization: initial?.specialization ?? "",
    hospital_id: initial?.hospital_id ?? "",
    experience_years: initial?.experience_years ?? 5,
    consultation_fee: initial?.consultation_fee ?? 500,
    rating: initial?.rating ?? 4.5,
    timing: initial?.timing ?? "10:00 AM - 5:00 PM",
    available_days: (initial?.available_days ?? ["Mon","Tue","Wed","Thu","Fri"]).join(", "),
    avatar_url: initial?.avatar_url ?? "",
  });
  const [busy, setBusy] = useState(false);
  return (
    <form onSubmit={async e => { e.preventDefault(); setBusy(true); try {
      await onSubmit({ ...v,
        hospital_id: v.hospital_id || null,
        experience_years: Number(v.experience_years), consultation_fee: Number(v.consultation_fee), rating: Number(v.rating),
        available_days: v.available_days.split(",").map(s=>s.trim()).filter(Boolean),
        avatar_url: v.avatar_url || null,
      });
    } finally { setBusy(false); } }} className="grid gap-2 p-3 rounded-lg bg-muted/30">
      <div className="grid sm:grid-cols-2 gap-2">
        <Input label="Name *" value={v.name} onChange={x=>setV(s=>({...s, name:x}))} required />
        <Input label="Specialization *" value={v.specialization} onChange={x=>setV(s=>({...s, specialization:x}))} required />
        <div>
          <label className="text-xs font-medium text-muted-foreground">Hospital</label>
          <select value={v.hospital_id} onChange={e => setV(s=>({...s, hospital_id: e.target.value}))} className="w-full px-3 py-2 rounded-lg bg-muted text-sm mt-1">
            <option value="">— None —</option>
            {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <Input label="Experience (years)" value={String(v.experience_years)} onChange={x=>setV(s=>({...s, experience_years:x as any}))} />
        <Input label="Consultation fee (₹)" value={String(v.consultation_fee)} onChange={x=>setV(s=>({...s, consultation_fee:x as any}))} />
        <Input label="Rating" value={String(v.rating)} onChange={x=>setV(s=>({...s, rating:x as any}))} />
        <Input label="Timing" value={v.timing} onChange={x=>setV(s=>({...s, timing:x}))} />
        <Input label="Available days (comma)" value={v.available_days} onChange={x=>setV(s=>({...s, available_days:x}))} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}><Save className="size-4 mr-1" />{busy ? "Saving…" : "Save"}</Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}><X className="size-4 mr-1" />Cancel</Button>
      </div>
    </form>
  );
}

// ---------------- Departments ----------------
function DepartmentsTab() {
  const qc = useQueryClient();
  const list = useServerFn(adminListDepartments);
  const create = useServerFn(adminCreateDepartment);
  const del = useServerFn(adminDeleteDepartment);
  const [creating, setCreating] = useState(false);
  const { data = [], isLoading } = useQuery({ queryKey: ["admin","departments"], queryFn: () => list() });
  const { data: hospitals = [] } = useQuery({ queryKey: ["hospitals","brief"], queryFn: async () => (await supabase.from("hospitals").select("id,name").order("name")).data ?? [] });
  const mDel = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin","departments"] }); }});
  return (
    <SimpleListPage
      label="department"
      items={data as any[]}
      isLoading={isLoading}
      creating={creating}
      onNew={() => setCreating(true)}
      onCancelNew={() => setCreating(false)}
      onDelete={(id) => mDel.mutate(id)}
      renderItem={(d: any) => (<><div className="font-semibold">{d.name}</div><div className="text-xs text-muted-foreground">{(hospitals as any[]).find(h=>h.id===d.hospital_id)?.name ?? "All hospitals"} {d.head_doctor ? `· Head: ${d.head_doctor}` : ""}</div></>)}
      form={(close) => (
        <SimpleForm
          fields={[
            { key: "name", label: "Name *", required: true },
            { key: "head_doctor", label: "Head doctor" },
            { key: "phone", label: "Phone" },
            { key: "description", label: "Description" },
          ]}
          extra={(state, set) => (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Hospital</label>
              <select value={state.hospital_id ?? ""} onChange={e => set({ ...state, hospital_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted text-sm mt-1">
                <option value="">— All hospitals —</option>
                {(hospitals as any[]).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
          )}
          onSubmit={async v => { try { await create({ data: { ...v, hospital_id: v.hospital_id || null } as any }); toast.success("Created"); close(); qc.invalidateQueries({ queryKey: ["admin","departments"] }); } catch(e:any){ toast.error(e?.message); }}}
          onCancel={close}
        />
      )}
    />
  );
}

// ---------------- Facilities ----------------
function FacilitiesTab() {
  const qc = useQueryClient();
  const list = useServerFn(adminListFacilities);
  const create = useServerFn(adminCreateFacility);
  const del = useServerFn(adminDeleteFacility);
  const [creating, setCreating] = useState(false);
  const { data = [], isLoading } = useQuery({ queryKey: ["admin","facilities"], queryFn: () => list() });
  const { data: hospitals = [] } = useQuery({ queryKey: ["hospitals","brief"], queryFn: async () => (await supabase.from("hospitals").select("id,name").order("name")).data ?? [] });
  const mDel = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin","facilities"] }); }});
  return (
    <SimpleListPage
      label="facility"
      items={data as any[]}
      isLoading={isLoading}
      creating={creating}
      onNew={() => setCreating(true)}
      onCancelNew={() => setCreating(false)}
      onDelete={(id) => mDel.mutate(id)}
      renderItem={(f: any) => (<><div className="font-semibold">{f.name} <span className="text-xs text-muted-foreground">({f.category})</span></div><div className="text-xs text-muted-foreground">{(hospitals as any[]).find(h=>h.id===f.hospital_id)?.name ?? "All hospitals"} · {f.available ? "Available" : "Unavailable"}</div></>)}
      form={(close) => (
        <SimpleForm
          fields={[
            { key: "name", label: "Name *", required: true },
            { key: "category", label: "Category", default: "general" },
            { key: "notes", label: "Notes" },
          ]}
          extra={(state, set) => (
            <>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Hospital</label>
                <select value={state.hospital_id ?? ""} onChange={e => set({ ...state, hospital_id: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted text-sm mt-1">
                  <option value="">— All hospitals —</option>
                  {(hospitals as any[]).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <Check label="Available" v={state.available !== false} on={x => set({ ...state, available: x })} />
            </>
          )}
          onSubmit={async v => { try { await create({ data: { ...v, hospital_id: v.hospital_id || null, available: v.available !== false } as any }); toast.success("Created"); close(); qc.invalidateQueries({ queryKey: ["admin","facilities"] }); } catch(e:any){ toast.error(e?.message); }}}
          onCancel={close}
        />
      )}
    />
  );
}

// ---------------- Pending submissions ----------------
function PendingTab() {
  const qc = useQueryClient();
  const list = useServerFn(adminListPending);
  const approve = useServerFn(adminApproveHospital);
  const reject = useServerFn(adminRejectHospital);
  const { data = [], isLoading } = useQuery({ queryKey: ["admin","pending"], queryFn: () => list() });
  const mA = useMutation({ mutationFn: (id: string) => approve({ data: { id } }), onSuccess: () => { toast.success("Approved"); qc.invalidateQueries({ queryKey: ["admin","pending"] }); qc.invalidateQueries({ queryKey: ["hospitals"] }); }});
  const mR = useMutation({ mutationFn: (id: string) => reject({ data: { id } }), onSuccess: () => { toast.success("Rejected"); qc.invalidateQueries({ queryKey: ["admin","pending"] }); }});
  const pendings = (data as any[]).filter(p => p.status === "pending");
  if (isLoading) return <Skeleton />;
  if (pendings.length === 0) return <Empty>No pending submissions.</Empty>;
  return (
    <div className="grid gap-3">
      {pendings.map((p: any) => (
        <div key={p.id} className="p-4 rounded-xl bg-card border border-border flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold">{p.name}</div>
            <div className="text-sm text-muted-foreground">{p.city}{p.address ? ` · ${p.address}` : ""}</div>
            <div className="text-xs text-muted-foreground mt-1">By {p.submitter_email ?? p.submitted_by}</div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" onClick={() => mA.mutate(p.id)}><CheckCircle2 className="size-4 mr-1" />Approve</Button>
            <Button size="sm" variant="outline" onClick={() => mR.mutate(p.id)}><XCircle className="size-4 mr-1" />Reject</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------- Messages ----------------
function MessagesTab() {
  const qc = useQueryClient();
  const list = useServerFn(adminListMessages);
  const resolve = useServerFn(adminResolveMessage);
  const { data = [], isLoading } = useQuery({ queryKey: ["admin","messages"], queryFn: () => list() });
  const mR = useMutation({ mutationFn: (v: { id: string; resolved: boolean }) => resolve({ data: v }), onSuccess: () => qc.invalidateQueries({ queryKey: ["admin","messages"] }) });
  const open = (data as any[]).filter(m => !m.resolved);
  if (isLoading) return <Skeleton />;
  if (open.length === 0) return <Empty>No open messages.</Empty>;
  return (
    <div className="grid gap-3">
      {open.map((m: any) => (
        <div key={m.id} className="p-4 rounded-xl bg-card border border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="font-semibold">{m.subject || `(${m.category})`}</div>
              <div className="text-xs text-muted-foreground">{m.name} &lt;{m.email}&gt; · {new Date(m.created_at).toLocaleString()}</div>
              <p className="text-sm mt-2 whitespace-pre-wrap">{m.message}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject || "Your MediRoute message")}`} className="text-xs text-primary underline self-center">Reply</a>
              <Button size="sm" variant="outline" onClick={() => mR.mutate({ id: m.id, resolved: true })}><MailOpen className="size-4 mr-1" />Resolve</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------- Generic helpers ----------------
function SimpleListPage({ label, items, isLoading, creating, onNew, onCancelNew, onDelete, renderItem, form }:
  { label: string; items: any[]; isLoading: boolean; creating: boolean; onNew: () => void; onCancelNew: () => void;
    onDelete: (id: string) => void; renderItem: (i: any) => React.ReactNode; form: (close: () => void) => React.ReactNode }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <div className="text-sm text-muted-foreground">{items.length} {label}{items.length === 1 ? "" : "s"}</div>
        <Button size="sm" onClick={onNew}><Plus className="size-4 mr-1" />New {label}</Button>
      </div>
      {creating && form(onCancelNew)}
      {isLoading ? <Skeleton /> : (
        <div className="grid gap-2">
          {items.map(i => (
            <div key={i.id} className="p-4 rounded-xl bg-card border border-border flex items-center justify-between gap-3">
              <div>{renderItem(i)}</div>
              <Button size="sm" variant="outline" onClick={() => confirm(`Delete this ${label}?`) && onDelete(i.id)}><Trash2 className="size-4" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SimpleForm({ fields, extra, onSubmit, onCancel }: {
  fields: { key: string; label: string; required?: boolean; default?: string }[];
  extra?: (state: any, set: (s: any) => void) => React.ReactNode;
  onSubmit: (v: any) => Promise<void>; onCancel: () => void;
}) {
  const init: any = {}; fields.forEach(f => init[f.key] = f.default ?? "");
  const [v, setV] = useState<any>(init);
  const [busy, setBusy] = useState(false);
  return (
    <form onSubmit={async e => { e.preventDefault(); setBusy(true); try { await onSubmit(v); } finally { setBusy(false); }}} className="grid gap-2 p-3 rounded-lg bg-muted/30 mb-3">
      <div className="grid sm:grid-cols-2 gap-2">
        {fields.map(f => <Input key={f.key} label={f.label} value={v[f.key] ?? ""} onChange={x => setV((s: any) => ({ ...s, [f.key]: x }))} required={f.required} />)}
      </div>
      {extra?.(v, setV)}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}><Save className="size-4 mr-1" />{busy ? "Saving…" : "Save"}</Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}><X className="size-4 mr-1" />Cancel</Button>
      </div>
    </form>
  );
}

function Input({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} required={required} className="w-full px-3 py-2 rounded-lg bg-muted text-sm mt-1 outline-none focus:ring-2 focus:ring-primary/30" />
    </div>
  );
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted text-sm mt-1">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function Check({ label, v, on }: { label: string; v: boolean; on: (x: boolean) => void }) {
  return (<label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={v} onChange={e => on(e.target.checked)} />{label}</label>);
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<section className="mb-6"><h2 className="font-display text-lg font-bold mb-2">{title}</h2><div className="p-4 rounded-xl bg-card border border-border">{children}</div></section>);
}
function Empty({ children }: { children: React.ReactNode }) { return <div className="p-8 text-center text-sm text-muted-foreground bg-card border border-border rounded-xl">{children}</div>; }
function Skeleton() { return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>; }
