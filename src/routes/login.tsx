import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Mail, KeyRound } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({ redirect: fallback(z.string(), "/").default("/") });
export const Route = createFileRoute("/login")({
  validateSearch: zodValidator(schema),
  component: Page,
});

function Page() {
  const { redirect } = Route.useSearch();
  const { user } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) nav({ to: redirect as any, replace: true }); }, [user, redirect, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your email to verify, then log in.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-[70vh] grid place-items-center px-4 py-10">
      <div className="w-full max-w-md p-6 rounded-2xl bg-card border border-border shadow-soft">
        <h1 className="font-display text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage appointments, reviews and health records.</p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === "signup" && (
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full px-3 py-2 rounded-lg bg-muted text-sm outline-none" />
          )}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
            <Mail className="size-4 text-muted-foreground" />
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required placeholder="Email" className="flex-1 bg-transparent outline-none text-sm" />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
            <KeyRound className="size-4 text-muted-foreground" />
            <input value={password} onChange={e=>setPassword(e.target.value)} type="password" required minLength={6} placeholder="Password" className="flex-1 bg-transparent outline-none text-sm" />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : (mode === "login" ? "Log in" : "Sign up")}</Button>
        </form>

        <button onClick={() => setMode(m => m === "login" ? "signup" : "login")} className="w-full text-sm text-muted-foreground mt-4 hover:text-foreground">
          {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
