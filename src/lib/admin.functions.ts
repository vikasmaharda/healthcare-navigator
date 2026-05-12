import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ADMIN_EMAIL } from "./admin";

function assertAdmin(claims: any) {
  const email: string | undefined = claims?.email;
  if (!email || email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    throw new Response("Forbidden", { status: 403 });
  }
}

export const adminListPending = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertAdmin(context.claims);
    const { data, error } = await supabaseAdmin
      .from("pending_hospitals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminListMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertAdmin(context.claims);
    const { data, error } = await supabaseAdmin
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminApproveHospital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    assertAdmin(context.claims);
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("pending_hospitals")
      .select("*")
      .eq("id", data.id)
      .single();
    if (fetchErr || !row) throw new Error(fetchErr?.message ?? "Not found");

    const { error: insErr } = await supabaseAdmin.from("hospitals").insert({
      name: row.name,
      city: row.city,
      address: row.address,
      phone: row.phone,
      specialties: row.specialties ?? [],
      emergency_24x7: row.emergency_24x7 ?? false,
      has_icu: row.has_icu ?? false,
      has_mri: row.has_mri ?? false,
      has_ambulance: row.has_ambulance ?? false,
      is_government: row.is_government ?? false,
      ayushman: row.ayushman ?? false,
      lat: row.lat,
      lng: row.lng,
      rating: 4.0,
      cost_tier: "medium",
    });
    if (insErr) throw new Error(insErr.message);

    await supabaseAdmin
      .from("pending_hospitals")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", data.id);

    return { ok: true };
  });

export const adminRejectHospital = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    assertAdmin(context.claims);
    const { error } = await supabaseAdmin
      .from("pending_hospitals")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminResolveMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid(), resolved: z.boolean() }).parse(data))
  .handler(async ({ context, data }) => {
    assertAdmin(context.claims);
    const { error } = await supabaseAdmin
      .from("contact_messages")
      .update({ resolved: data.resolved })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
