import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const schema = z.object({ ids: fallback(z.string(), "").default("") });
export const Route = createFileRoute("/compare")({
  validateSearch: zodValidator(schema),
  component: ComparePage,
});

function ComparePage() {
  const { ids } = Route.useSearch();
  const idArr = ids.split(",").filter(Boolean);

  const { data = [] } = useQuery({
    queryKey: ["compare", ids],
    queryFn: async () => {
      if (!idArr.length) return [];
      const { data, error } = await supabase.from("hospitals").select("*, beds(*)").in("id", idArr);
      if (error) throw error;
      return data;
    },
  });

  const yn = (v: boolean) => v ? <Check className="size-4 text-success mx-auto" /> : <X className="size-4 text-muted-foreground mx-auto" />;
  const rows = [
    { k: "City", get: (h: any) => h.city },
    { k: "Rating", get: (h: any) => Number(h.rating).toFixed(1) },
    { k: "Cost tier", get: (h: any) => h.cost_tier },
    { k: "24×7 ER", get: (h: any) => yn(h.emergency_24x7) },
    { k: "ICU", get: (h: any) => yn(h.has_icu) },
    { k: "MRI", get: (h: any) => yn(h.has_mri) },
    { k: "Ambulance", get: (h: any) => yn(h.has_ambulance) },
    { k: "Government", get: (h: any) => yn(h.is_government) },
    { k: "Ayushman", get: (h: any) => yn(h.ayushman) },
    { k: "ICU beds available", get: (h: any) => (h.beds?.[0]?.icu_available ?? 0) },
    { k: "Oxygen beds", get: (h: any) => (h.beds?.[0]?.oxygen_available ?? 0) },
    { k: "Specialties", get: (h: any) => (h.specialties || []).join(", ") },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <Link to="/hospitals"><Button variant="ghost" size="sm"><ArrowLeft className="size-4 mr-1" />Back</Button></Link>
      <h1 className="font-display text-3xl font-bold mt-3 mb-6">Hospital Comparison</h1>
      {data.length === 0 ? (
        <div className="p-10 text-center bg-card border border-border rounded-2xl text-muted-foreground">Pick hospitals from the list to compare.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-semibold">Feature</th>
                {data.map((h: any) => <th key={h.id} className="p-3 font-semibold">{h.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.k} className="border-t border-border">
                  <td className="p-3 font-medium text-muted-foreground">{r.k}</td>
                  {data.map((h: any) => <td key={h.id} className="p-3 text-center">{r.get(h)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
