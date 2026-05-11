import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Landmark, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/schemes")({ component: Page });

function Page() {
  const { data = [] } = useQuery({
    queryKey: ["schemes"], queryFn: async () => (await supabase.from("schemes").select("*")).data ?? [],
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-12 rounded-2xl bg-primary/15 text-primary grid place-items-center"><Landmark className="size-6" /></div>
        <div>
          <h1 className="font-display text-3xl font-bold">Government Health Schemes</h1>
          <p className="text-muted-foreground">Free and subsidised treatment programs.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {data.map((s: any) => (
          <a key={s.id} href={s.link} target="_blank" rel="noreferrer" className="p-5 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-soft transition group">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{s.name}</h3>
              <ExternalLink className="size-4 text-muted-foreground group-hover:text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
            <div className="mt-3 grid gap-1 text-xs">
              <div><span className="font-semibold">Eligibility:</span> <span className="text-muted-foreground">{s.eligibility}</span></div>
              <div><span className="font-semibold">Benefits:</span> <span className="text-muted-foreground">{s.benefits}</span></div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
