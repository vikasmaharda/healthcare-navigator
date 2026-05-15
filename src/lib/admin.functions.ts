import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// --- Authorization: check has_role(admin) using the DB; trust the DB, not just email ---
async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Response("Forbidden — admin role required", { status: 403 });
}

// --- Shared schemas ---
const hospitalSchema = z.object({
  name: z.string().min(2).max(200),
  city: z.string().min(2).max(100),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  specialties: z.array(z.string()).default([]),
  emergency_24x7: z.boolean().default(false),
  has_icu: z.boolean().default(false),
  has_mri: z.boolean().default(false),
  has_ambulance: z.boolean().default(false),
  is_government: z.boolean().default(false),
  ayushman: z.boolean().default(false),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  rating: z.number().min(0).max(5).default(4.0),
  cost_tier: z.enum(["low", "medium", "high"]).default("medium"),
  image_url: z.string().url().optional().nullable(),
});

const doctorSchema = z.object({
  name: z.string().min(2).max(200),
  specialization: z.string().min(2).max(100),
  hospital_id: z.string().uuid().optional().nullable(),
  experience_years: z.number().int().min(0).max(70).default(5),
  consultation_fee: z.number().int().min(0).default(500),
  rating: z.number().min(0).max(5).default(4.5),
  timing: z.string().max(100).optional(),
  available_days: z.array(z.string()).default(["Mon","Tue","Wed","Thu","Fri"]),
  avatar_url: z.string().url().optional().nullable(),
});

// =================== ANALYTICS ===================
export const adminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const [hospitals, doctors, appts, pending, msgs, departments, facilities] = await Promise.all([
      supabaseAdmin.from("hospitals").select("id, is_government, city", { count: "exact" }),
      supabaseAdmin.from("doctors").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("appointments").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("pending_hospitals").select("id, status"),
      supabaseAdmin.from("contact_messages").select("id, resolved"),
      supabaseAdmin.from("departments").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("facilities").select("id", { count: "exact", head: true }),
    ]);

    const byCity: Record<string, number> = {};
    (hospitals.data ?? []).forEach((h: any) => { byCity[h.city] = (byCity[h.city] ?? 0) + 1; });
    const topCities = Object.entries(byCity).sort((a,b)=>b[1]-a[1]).slice(0,8);

    return {
      counts: {
        hospitals: hospitals.count ?? 0,
        govt_hospitals: (hospitals.data ?? []).filter((h: any) => h.is_government).length,
        doctors: doctors.count ?? 0,
        appointments: appts.count ?? 0,
        departments: departments.count ?? 0,
        facilities: facilities.count ?? 0,
        pending_submissions: (pending.data ?? []).filter((p: any) => p.status === "pending").length,
        open_messages: (msgs.data ?? []).filter((m: any) => !m.resolved).length,
      },
      topCities,
    };
  });

// =================== PENDING HOSPITAL REVIEW (existing) ===================
export const adminListPending = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin.from("pending_hospitals").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminApproveHospital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin.from("pending_hospitals").select("*").eq("id", data.id).single();
    if (error || !row) throw new Error(error?.message ?? "Not found");
    const { error: insErr } = await supabaseAdmin.from("hospitals").insert({
      name: row.name, city: row.city, address: row.address, phone: row.phone,
      specialties: row.specialties ?? [], emergency_24x7: row.emergency_24x7 ?? false,
      has_icu: row.has_icu ?? false, has_mri: row.has_mri ?? false,
      has_ambulance: row.has_ambulance ?? false, is_government: row.is_government ?? false,
      ayushman: row.ayushman ?? false, lat: row.lat, lng: row.lng,
      rating: 4.0, cost_tier: "medium",
    });
    if (insErr) throw new Error(insErr.message);
    await supabaseAdmin.from("pending_hospitals").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", data.id);
    return { ok: true };
  });

export const adminRejectHospital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("pending_hospitals").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =================== HOSPITALS CRUD ===================
export const adminCreateHospital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => hospitalSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin.from("hospitals").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminUpdateHospital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), patch: hospitalSchema.partial() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("hospitals").update(data.patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteHospital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("hospitals").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =================== DOCTORS CRUD ===================
export const adminListDoctors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin.from("doctors").select("*").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminCreateDoctor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => doctorSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin.from("doctors").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminUpdateDoctor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), patch: doctorSchema.partial() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("doctors").update(data.patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteDoctor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("doctors").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =================== DEPARTMENTS CRUD ===================
const departmentSchema = z.object({
  hospital_id: z.string().uuid().optional().nullable(),
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional().nullable(),
  head_doctor: z.string().max(120).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
});

export const adminListDepartments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin.from("departments").select("*").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminCreateDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => departmentSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin.from("departments").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeleteDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("departments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =================== FACILITIES CRUD ===================
const facilitySchema = z.object({
  hospital_id: z.string().uuid().optional().nullable(),
  name: z.string().min(2).max(120),
  category: z.string().max(60).default("general"),
  available: z.boolean().default(true),
  notes: z.string().max(500).optional().nullable(),
});

export const adminListFacilities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin.from("facilities").select("*").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminCreateFacility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => facilitySchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin.from("facilities").insert(data).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeleteFacility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("facilities").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =================== MESSAGES (existing) ===================
export const adminListMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin.from("contact_messages").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminResolveMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), resolved: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("contact_messages").update({ resolved: data.resolved }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =================== Whoami helper for client gating ===================
export const adminCheckSelf = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });
