import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { LifeBuoy, Send, Mail, MessageSquare, BookOpen, Stethoscope, MapPin, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ADMIN_EMAIL } from "@/lib/admin";

export const Route = createFileRoute("/help")({ component: HelpPage });

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().max(200).optional().or(z.literal("")),
  message: z.string().trim().min(5).max(5000),
});

const FAQ = [
  { q: "How do I find hospitals near me?", a: "Open Nearby on the menu and allow location access — we sort hospitals by distance and pin them on the map." },
  { q: "Can I trust the AI symptom assistant?", a: "It gives general triage guidance only. For anything serious, call 102 or visit emergency immediately." },
  { q: "How do I add my hospital?", a: "Use 'Add Hospital' from the menu. The admin verifies submissions before they go live." },
  { q: "How does the smart search work?", a: "It tolerates typos, understands symptoms, and routes 'chest pain' to cardiology, 'fracture' to orthopedics, etc." },
  { q: "Is my health data secure?", a: "Health records are protected by row-level security — only you can read or modify your own records." },
];

function HelpPage() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "", email: user?.email ?? "", category: "general", subject: "", message: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("Please sign in to send a message");
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "Check the form");
    setBusy(true);
    const { error } = await supabase.from("contact_messages").insert({
      user_id: user.id,
      name: form.name.trim(),
      email: form.email.trim(),
      category: form.category,
      subject: form.subject.trim() || null,
      message: form.message.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Message sent. The admin will get back to you.");
    setForm((p) => ({ ...p, subject: "", message: "" }));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="size-12 rounded-2xl gradient-primary grid place-items-center text-primary-foreground"><LifeBuoy className="size-6" /></div>
        <div>
          <h1 className="font-display text-3xl font-bold">Help & Support</h1>
          <p className="text-muted-foreground text-sm">Find quick answers or send a message to the admin.</p>
        </div>
      </div>

      <section className="grid md:grid-cols-3 gap-3 mt-6">
        {[
          { icon: MapPin, title: "Find a hospital", desc: "Use Nearby for map + distance.", to: "/nearby" },
          { icon: Stethoscope, title: "Browse directory", desc: "Filter by city, specialty, ER.", to: "/hospitals" },
          { icon: Bot, title: "AI Assistant", desc: "Describe symptoms for triage.", to: "/ai-assistant" },
        ].map((c) => (
          <Link key={c.title} to={c.to} className="p-4 rounded-2xl bg-card border border-border hover:border-primary/40 transition">
            <c.icon className="size-5 text-primary mb-2" />
            <div className="font-semibold">{c.title}</div>
            <div className="text-sm text-muted-foreground">{c.desc}</div>
          </Link>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-bold flex items-center gap-2"><BookOpen className="size-5 text-primary" />FAQ</h2>
        <div className="mt-4 divide-y divide-border bg-card border border-border rounded-2xl">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-4">
              <summary className="cursor-pointer font-medium list-none flex justify-between items-center">
                {f.q}
                <span className="text-muted-foreground group-open:rotate-45 transition">+</span>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-10 grid md:grid-cols-[1fr_320px] gap-6">
        <form onSubmit={submit} className="space-y-4 bg-card border border-border rounded-2xl p-5">
          <h2 className="font-display text-2xl font-bold flex items-center gap-2"><MessageSquare className="size-5 text-primary" />Send a message</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="ipt" required placeholder="Your name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <input className="ipt" required type="email" placeholder="Your email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <select className="ipt" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
              <option value="general">General</option>
              <option value="help">Need help</option>
              <option value="bug">Report a bug</option>
              <option value="feature">Feature request</option>
              <option value="other">Other</option>
            </select>
            <input className="ipt" placeholder="Subject (optional)" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
          </div>
          <Textarea required rows={6} placeholder="How can we help?" value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} />
          <Button type="submit" disabled={busy}><Send className="size-4 mr-2" />{busy ? "Sending…" : "Send message"}</Button>
          {!user && <p className="text-xs text-muted-foreground">You need to <Link to="/login" className="underline">sign in</Link> to send a message.</p>}
        </form>

        <aside className="bg-card border border-border rounded-2xl p-5 h-fit">
          <Mail className="size-5 text-primary mb-2" />
          <div className="font-semibold">Contact admin</div>
          <p className="text-sm text-muted-foreground mt-1">For urgent or sensitive matters:</p>
          <a className="text-primary text-sm underline break-all" href={`mailto:${ADMIN_EMAIL}`}>{ADMIN_EMAIL}</a>
          <p className="text-xs text-muted-foreground mt-3">For medical emergencies, call <a className="text-emergency font-semibold" href="tel:102">102</a> immediately.</p>
        </aside>
      </section>

      <style>{`.ipt{display:block;width:100%;padding:.5rem .75rem;border-radius:.5rem;background:var(--muted);border:1px solid transparent;font-size:.875rem;outline:none}.ipt:focus{border-color:color-mix(in oklab,var(--primary) 50%,transparent)}`}</style>
    </div>
  );
}
