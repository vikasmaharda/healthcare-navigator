import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Droplet, Phone, MapPin, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/blood-bank")({ component: Page });

const GROUPS = ["A+","A-","B+","B-","O+","O-","AB+","AB-"];

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [group, setGroup] = useState("");
  const [city, setCity] = useState("");

  const { data: banks = [] } = useQuery({
    queryKey: ["blood-banks"], queryFn: async () => (await supabase.from("blood_banks").select("*")).data ?? [],
  });
  const { data: donors = [] } = useQuery({
    queryKey: ["donors", group, city, user?.id ?? null],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from("blood_donors").select("*").eq("available", true);
      if (group) q = q.eq("blood_group", group);
      if (city) q = q.ilike("city", `%${city}%`);
      const { data } = await q; return data ?? [];
    },
  });


  const [donorName, setDonorName] = useState("");
  const [donorGroup, setDonorGroup] = useState("O+");
  const [donorCity, setDonorCity] = useState("");
  const [donorPhone, setDonorPhone] = useState("");

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Please log in first");
    const { error } = await supabase.from("blood_donors").insert({
      user_id: user.id, name: donorName, blood_group: donorGroup, city: donorCity, phone: donorPhone,
    });
    if (error) return toast.error(error.message);
    toast.success("Thank you! You're listed as a donor.");
    setDonorName(""); setDonorCity(""); setDonorPhone("");
    qc.invalidateQueries({ queryKey: ["donors"] });
  };

  const filteredBanks = banks.filter((b: any) =>
    (!group || (b.available_groups || []).includes(group)) &&
    (!city || b.city.toLowerCase().includes(city.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-12 rounded-2xl bg-emergency/15 text-emergency grid place-items-center"><Droplet className="size-6" /></div>
        <div>
          <h1 className="font-display text-3xl font-bold">Blood Bank & Donors</h1>
          <p className="text-muted-foreground">Find blood by group and city, or register as a donor.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 mb-6 flex flex-wrap gap-2">
        <select value={group} onChange={e=>setGroup(e.target.value)} className="px-3 py-2 rounded-lg bg-muted text-sm">
          <option value="">Any group</option>
          {GROUPS.map(g => <option key={g}>{g}</option>)}
        </select>
        <input value={city} onChange={e=>setCity(e.target.value)} placeholder="City" className="px-3 py-2 rounded-lg bg-muted text-sm flex-1 min-w-[180px]" />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <section>
          <h2 className="font-display text-xl font-bold mb-3">Blood banks</h2>
          <ul className="space-y-3">
            {filteredBanks.map((b: any) => (
              <li key={b.id} className="p-4 rounded-2xl bg-card border border-border">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{b.name}</div>
                    <div className="text-sm text-muted-foreground inline-flex items-center gap-1"><MapPin className="size-3.5" />{b.city}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(b.available_groups || []).map((g: string) => (
                        <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-emergency/15 text-emergency font-mono">{g}</span>
                      ))}
                    </div>
                  </div>
                  <a href={`tel:${(b.phone||"").replace(/[^0-9+]/g,"")}`}><Button size="icon" variant="outline"><Phone className="size-4" /></Button></a>
                </div>
              </li>
            ))}
          </ul>

          <h2 className="font-display text-xl font-bold mt-8 mb-3">Available donors</h2>
          {!user ? (
            <p className="text-sm text-muted-foreground">Please log in to view donor contact details. This protects donors' personal information.</p>
          ) : donors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No donors yet for this filter.</p>

          ) : (
            <ul className="grid sm:grid-cols-2 gap-3">
              {donors.map((d: any) => (
                <li key={d.id} className="p-3 rounded-xl bg-card border border-border">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{d.name}</div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emergency/15 text-emergency font-mono">{d.blood_group}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{d.city} · {d.phone}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="font-display text-xl font-bold mb-3">Become a donor</h2>
          <form onSubmit={register} className="p-5 rounded-2xl bg-card border border-border grid gap-3">
            <input required value={donorName} onChange={e=>setDonorName(e.target.value)} placeholder="Name" className="px-3 py-2 rounded-lg bg-muted text-sm outline-none" />
            <select value={donorGroup} onChange={e=>setDonorGroup(e.target.value)} className="px-3 py-2 rounded-lg bg-muted text-sm">
              {GROUPS.map(g => <option key={g}>{g}</option>)}
            </select>
            <input required value={donorCity} onChange={e=>setDonorCity(e.target.value)} placeholder="City" className="px-3 py-2 rounded-lg bg-muted text-sm outline-none" />
            <input required value={donorPhone} onChange={e=>setDonorPhone(e.target.value)} placeholder="Phone" className="px-3 py-2 rounded-lg bg-muted text-sm outline-none" />
            <Button type="submit"><UserPlus className="size-4 mr-2" />Register as donor</Button>
            {!user && <p className="text-xs text-muted-foreground">You need to log in to register.</p>}
          </form>
        </section>
      </div>
    </div>
  );
}
