import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Hospital-dashboard server functions.
 * Every write goes through the caller's own Supabase client, so the
 * `is_hospital_admin()` row-level policies decide what they may touch.
 * A hospital admin can never reach another hospital's rows.
 */

async function myHospitalId(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("hospital_admins")
    .select("hospital_id")
    .eq("approved", true)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.hospital_id) {
    throw new Response("Forbidden — this account is not linked to a hospital", { status: 403 });
  }
  void userId;
  return data.hospital_id as string;
}

async function logUpdate(supabase: any, hospitalId: string, entity: string, summary: string) {
  await supabase.from("hospital_updates").insert({ hospital_id: hospitalId, entity, summary });
}

export const getMyHospital = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const hospitalId = await myHospitalId(supabase, userId);

    const [hospital, beds, doctors, departments, facilities, updates] = await Promise.all([
      supabase.from("hospitals").select("*").eq("id", hospitalId).single(),
      supabase.from("beds").select("*").eq("hospital_id", hospitalId).maybeSingle(),
      supabase.from("doctors").select("*").eq("hospital_id", hospitalId).order("name"),
      supabase.from("departments").select("*").eq("hospital_id", hospitalId).order("name"),
      supabase.from("facilities").select("*").eq("hospital_id", hospitalId).order("name"),
      supabase.from("hospital_updates").select("*").eq("hospital_id", hospitalId)
        .order("created_at", { ascending: false }).limit(25),
    ]);

    return {
      hospital: hospital.data ?? null,
      beds: beds.data ?? null,
      doctors: doctors.data ?? [],
      departments: departments.data ?? [],
      facilities: facilities.data ?? [],
      updates: updates.data ?? [],
    };
  });

const profileSchema = z.object({
  name: z.string().trim().min(2).max(200),
  address: z.string().trim().max(500).nullable().optional(),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().max(100).nullable().optional(),
  pincode: z.string().trim().regex(/^\d{6}$/, "PIN code must be 6 digits").nullable().optional().or(z.literal("")),
  phone: z.string().trim().max(30).nullable().optional(),
  emergency_phone: z.string().trim().max(30).nullable().optional(),
  email: z.string().trim().email().max(255).nullable().optional().or(z.literal("")),
  website: z.string().trim().url().max(300).nullable().optional().or(z.literal("")),
  maps_link: z.string().trim().url().max(500).nullable().optional().or(z.literal("")),
  emergency_24x7: z.boolean(),
  has_icu: z.boolean(),
  has_mri: z.boolean(),
  has_ambulance: z.boolean(),
  has_blood_bank: z.boolean(),
  has_pharmacy: z.boolean(),
  has_lab: z.boolean(),
});

export const updateMyHospital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => profileSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const hospitalId = await myHospitalId(supabase, userId);
    const patch = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, v === "" ? null : v]),
    ) as Record<string, unknown> as never;
    const { error } = await supabase.from("hospitals").update(patch).eq("id", hospitalId);
    if (error) throw new Error(error.message);
    await logUpdate(supabase, hospitalId, "hospital", "Hospital profile updated");
    return { ok: true };
  });

const bedSchema = z.object({
  icu_available: z.number().int().min(0).max(5000),
  oxygen_available: z.number().int().min(0).max(5000),
  emergency_available: z.number().int().min(0).max(5000),
  general_available: z.number().int().min(0).max(5000),
});

export const updateMyBeds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => bedSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const hospitalId = await myHospitalId(supabase, userId);
    const { error } = await supabase
      .from("beds")
      .upsert({ hospital_id: hospitalId, ...data, updated_at: new Date().toISOString() }, { onConflict: "hospital_id" });
    if (error) throw new Error(error.message);
    await logUpdate(
      supabase, hospitalId, "beds",
      `Bed availability updated — ICU ${data.icu_available}, Oxygen ${data.oxygen_available}, Emergency ${data.emergency_available}, General ${data.general_available}`,
    );
    return { ok: true };
  });

const doctorSchema = z.object({
  name: z.string().trim().min(2).max(200),
  specialization: z.string().trim().min(2).max(120),
  experience_years: z.number().int().min(0).max(70),
  consultation_fee: z.number().int().min(0).max(1000000),
  timing: z.string().trim().max(120),
  available_days: z.array(z.string().max(12)).max(7),
  is_available: z.boolean(),
  is_active: z.boolean(),
});

export const saveMyDoctor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid().nullable(), values: doctorSchema }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const hospitalId = await myHospitalId(supabase, userId);
    if (data.id) {
      const { error } = await supabase.from("doctors").update(data.values).eq("id", data.id).eq("hospital_id", hospitalId);
      if (error) throw new Error(error.message);
      await logUpdate(supabase, hospitalId, "doctor", `Doctor updated — ${data.values.name}`);
    } else {
      const { error } = await supabase.from("doctors").insert({ ...data.values, hospital_id: hospitalId });
      if (error) throw new Error(error.message);
      await logUpdate(supabase, hospitalId, "doctor", `Doctor added — ${data.values.name}`);
    }
    return { ok: true };
  });

export const deleteMyDoctor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const hospitalId = await myHospitalId(supabase, userId);
    const { error } = await supabase.from("doctors").delete().eq("id", data.id).eq("hospital_id", hospitalId);
    if (error) throw new Error(error.message);
    await logUpdate(supabase, hospitalId, "doctor", "Doctor removed");
    return { ok: true };
  });

const facilitySchema = z.object({
  name: z.string().trim().min(2).max(120),
  category: z.string().trim().max(60),
  status: z.enum(["available", "limited", "temporarily_unavailable", "unavailable"]),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const saveMyFacility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid().nullable(), values: facilitySchema }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const hospitalId = await myHospitalId(supabase, userId);
    const values = { ...data.values, available: data.values.status === "available" };
    if (data.id) {
      const { error } = await supabase.from("facilities").update(values).eq("id", data.id).eq("hospital_id", hospitalId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("facilities").insert({ ...values, hospital_id: hospitalId });
      if (error) throw new Error(error.message);
    }
    await logUpdate(supabase, hospitalId, "facility", `${data.values.name} — ${data.values.status.replace(/_/g, " ")}`);
    return { ok: true };
  });

export const deleteMyFacility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const hospitalId = await myHospitalId(supabase, userId);
    const { error } = await supabase.from("facilities").delete().eq("id", data.id).eq("hospital_id", hospitalId);
    if (error) throw new Error(error.message);
    await logUpdate(supabase, hospitalId, "facility", "Facility removed");
    return { ok: true };
  });

const departmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  head_doctor: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
});

export const saveMyDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid().nullable(), values: departmentSchema }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const hospitalId = await myHospitalId(supabase, userId);
    if (data.id) {
      const { error } = await supabase.from("departments").update(data.values).eq("id", data.id).eq("hospital_id", hospitalId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("departments").insert({ ...data.values, hospital_id: hospitalId });
      if (error) throw new Error(error.message);
    }
    await logUpdate(supabase, hospitalId, "department", `Department saved — ${data.values.name}`);
    return { ok: true };
  });

export const deleteMyDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const hospitalId = await myHospitalId(supabase, userId);
    const { error } = await supabase.from("departments").delete().eq("id", data.id).eq("hospital_id", hospitalId);
    if (error) throw new Error(error.message);
    await logUpdate(supabase, hospitalId, "department", "Department removed");
    return { ok: true };
  });
