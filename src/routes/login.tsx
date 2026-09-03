import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { getMyRole } from "@/lib/roles.functions";
import { Button } from "@/components/ui/button";
import { Mail, KeyRound, User, CalendarDays, Loader2, Building2, HeartPulse } from "lucide-react";
import { toast } from "sonner";


const schema = z.object({ redirect: fallback(z.string(), "/").default("/") });
export const Route = createFileRoute("/login")({
  validateSearch: zodValidator(schema),
  component: Page,
  head: () => ({
    meta: [
      { title: "Sign in to MediRoute — Hospital & Emergency Care Finder" },
      { name: "description", content: "Log in or create a MediRoute account with Google or email to book appointments, save records and share your live location in emergencies." },
      { property: "og:title", content: "Sign in to MediRoute" },
      { property: "og:description", content: "Access hospital search, appointments and emergency tools with your MediRoute account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const GENDERS = ["Female", "Male", "Other", "Prefer not to say"];

function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return "Password must include at least one letter and one number.";
  return null;
}

function Page() {
  const { redirect } = Route.useSearch();
  const { user } = useAuth();
  const nav = useNavigate();
  const fetchRole = useServerFn(getMyRole);
  const role = useQuery({ queryKey: ["me", "role"], queryFn: () => fetchRole(), enabled: !!user, retry: false });
  const [accountType, setAccountType] = useState<"patient" | "hospital">("patient");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [busy, setBusy] = useState(false);
  const [google, setGoogle] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (redirect && redirect !== "/") { nav({ to: redirect as any, replace: true }); return; }
    if (role.isLoading) return;
    const r = role.data?.role;
    // Patients always land on Home; staff accounts go to their workspace.
    if (r === "hospital_admin") nav({ to: "/hospital-dashboard", replace: true });
    else if (r === "super_admin") nav({ to: "/admin", replace: true });
    else nav({ to: "/", replace: true });
  }, [user, redirect, nav, role.isLoading, role.data]);


  const signInGoogle = async () => {
    setGoogle(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Google sign-in failed. Please try again.");
        return;
      }
      if (result.redirected) return;
      toast.success("Signed in with Google");
    } catch (err: any) {
      toast.error(err?.message ?? "Google sign-in failed. Please try again.");
    } finally {
      setGoogle(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
    if (!emailOk) return toast.error("Please enter a valid email address.");

    if (mode === "signup") {
      if (!name.trim()) return toast.error("Please enter your full name.");
      if (!gender) return toast.error("Please select your gender.");
      if (!dob) return toast.error("Please enter your date of birth.");
      const d = new Date(dob);
      if (Number.isNaN(d.getTime()) || d > new Date()) return toast.error("Please enter a valid date of birth.");
      const pwErr = passwordProblem(password);
      if (pwErr) return toast.error(pwErr);
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name.trim(), gender, dob },
          },
        });
        if (error) throw error;
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          toast.error("An account with this email already exists. Please log in instead.");
          setMode("login");
          return;
        }
        if (data.session) {
          toast.success("Account created. Welcome to MediRoute!");
          return;
        }
        toast.success("Account created. Check your email to confirm, then log in.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          if (/invalid login credentials/i.test(error.message)) {
            throw new Error("Incorrect email or password. Please try again.");
          }
          if (/email not confirmed/i.test(error.message)) {
            throw new Error("Please confirm your email first — check your inbox for the link.");
          }
          throw error;
        }
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      const msg: string = err?.message ?? "Something went wrong";
      toast.error(/already registered|already exists/i.test(msg)
        ? "An account with this email already exists. Please log in instead."
        : msg);
    } finally {
      setBusy(false);
    }
  };

  const inputBase = "flex-1 bg-transparent outline-none text-sm";

  return (
    <div className="min-h-[70vh] grid place-items-center px-4 py-10">
      <div className="w-full max-w-md p-6 rounded-2xl bg-card border border-border shadow-soft">
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted mb-5">
          <button type="button" onClick={() => { setAccountType("patient"); }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${accountType === "patient" ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"}`}>
            <HeartPulse className="size-4" /> Patient
          </button>
          <button type="button" onClick={() => { setAccountType("hospital"); setMode("login"); }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${accountType === "hospital" ? "bg-card shadow-soft text-foreground" : "text-muted-foreground"}`}>
            <Building2 className="size-4" /> Hospital
          </button>
        </div>
        <h1 className="font-display text-2xl font-bold">
          {accountType === "hospital" ? "Hospital sign-in" : mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {accountType === "hospital"
            ? "Sign in with your hospital's authorised email to manage your own hospital's details."
            : "Manage appointments, records and emergency contacts."}
        </p>


        <Button variant="outline" className="w-full mt-5" onClick={signInGoogle} disabled={google}>
          {google ? <Loader2 className="size-4 mr-2 animate-spin" /> : (
            <svg viewBox="0 0 24 24" className="size-4 mr-2" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
              <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
            </svg>
          )}
          Continue with Google
        </Button>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px bg-border flex-1" />
          <span className="text-xs text-muted-foreground">or use email</span>
          <div className="h-px bg-border flex-1" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
                <User className="size-4 text-muted-foreground" />
                <input value={name} onChange={e => setName(e.target.value)} required placeholder="Full name *" className={inputBase} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value)}
                  required
                  className="px-3 py-2 rounded-lg bg-muted text-sm outline-none"
                >
                  <option value="">Gender *</option>
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
                  <CalendarDays className="size-4 text-muted-foreground shrink-0" />
                  <input
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    type="date"
                    required
                    max={new Date().toISOString().slice(0, 10)}
                    aria-label="Date of birth"
                    className={inputBase}
                  />
                </div>
              </div>
            </>
          )}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
            <Mail className="size-4 text-muted-foreground" />
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="Email address *" className={inputBase} />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
            <KeyRound className="size-4 text-muted-foreground" />
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" required minLength={mode === "signup" ? 8 : 6} placeholder="Password *" className={inputBase} />
          </div>
          {mode === "signup" && (
            <p className="text-xs text-muted-foreground">At least 8 characters, including a letter and a number.</p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : (mode === "login" ? "Log in" : "Create account")}
          </Button>
        </form>

        {accountType === "patient" ? (
          <button onClick={() => setMode(m => m === "login" ? "signup" : "login")} className="w-full text-sm text-muted-foreground mt-4 hover:text-foreground">
            {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
          </button>
        ) : (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Hospital accounts are created after verification. Register your hospital from the “Add a hospital” form and the MediRoute team will link your email.
          </p>
        )}

      </div>
    </div>
  );
}
