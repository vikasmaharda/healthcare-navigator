import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MediRole = "super_admin" | "hospital_admin" | "patient";

export interface RoleInfo {
  role: MediRole;
  hospitalId: string | null;
  hospitalName: string | null;
  email: string | null;
}

/**
 * Resolves the signed-in user's role from the database only.
 * Never trust a client-side email check for authorization.
 */
export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RoleInfo> => {
    const { supabase, userId, claims } = context;
    const email = (claims as { email?: string } | null)?.email ?? null;

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    if ((roles ?? []).some((r) => r.role === "admin")) {
      return { role: "super_admin", hospitalId: null, hospitalName: null, email };
    }

    const { data: link } = await supabase
      .from("hospital_admins")
      .select("hospital_id, approved, hospitals(name)")
      .eq("approved", true)
      .limit(1)
      .maybeSingle();

    if (link?.hospital_id) {
      return {
        role: "hospital_admin",
        hospitalId: link.hospital_id,
        hospitalName: (link as { hospitals?: { name?: string } | null }).hospitals?.name ?? null,
        email,
      };
    }

    return { role: "patient", hospitalId: null, hospitalName: null, email };
  });
