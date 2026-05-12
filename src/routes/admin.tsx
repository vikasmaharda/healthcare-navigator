import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Shield, CheckCircle2, XCircle, MailOpen, Mail, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ADMIN_EMAIL, isAdmin } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import {
  adminListPending,
  adminListMessages,
  adminApproveHospital,
  adminRejectHospital,
  adminResolveMessage,
} from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;

  if (!user) {
    return (
      <Gate
        title="Admin sign-in required"
        body="Sign in with the configured admin account to access this page."
        cta={<Link to="/login"><Button>Go to login</Button></Link>}
      />
    );
  }

  if (!isAdmin(user.email)) {
    return (
      <Gate
        title="Admins only"
        body={`This page is restricted to ${ADMIN_EMAIL}. You're signed in as ${user.email}.`}
      />
    );
  }

  return <AdminInner />;
}

function Gate({ title, body, cta }: { title: string; body: string; cta?: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="size-14 mx-auto rounded-2xl gradient-primary grid place-items-center text-primary-foreground mb-4"><Shield className="size-7" /></div>
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground mt-2">{body}</p>
      {cta && <div className="mt-6">{cta}</div>}
    </div>
  );
}

function AdminInner() {
  const qc = useQueryClient();
  const listPending = useServerFn(adminListPending);
  const listMessages = useServerFn(adminListMessages);
  const approve = useServerFn(adminApproveHospital);
  const reject = useServerFn(adminRejectHospital);
  const resolve = useServerFn(adminResolveMessage);

  const pending = useQuery({ queryKey: ["admin", "pending"], queryFn: () => listPending() });
  const messages = useQuery({ queryKey: ["admin", "messages"], queryFn: () => listMessages() });

  const mApprove = useMutation({
    mutationFn: (id: string) => approve({ data: { id } }),
    onSuccess: () => { toast.success("Hospital approved & added"); qc.invalidateQueries({ queryKey: ["admin", "pending"] }); qc.invalidateQueries({ queryKey: ["hospitals"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const mReject = useMutation({
    mutationFn: (id: string) => reject({ data: { id } }),
    onSuccess: () => { toast.success("Rejected"); qc.invalidateQueries({ queryKey: ["admin", "pending"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const mResolve = useMutation({
    mutationFn: (v: { id: string; resolved: boolean }) => resolve({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "messages"] }); },
  });

  const pendings = (pending.data ?? []).filter((p: any) => p.status === "pending");
  const reviewed = (pending.data ?? []).filter((p: any) => p.status !== "pending");
  const open = (messages.data ?? []).filter((m: any) => !m.resolved);
  const done = (messages.data ?? []).filter((m: any) => m.resolved);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-12 rounded-2xl gradient-primary grid place-items-center text-primary-foreground"><Shield className="size-6" /></div>
        <div>
          <h1 className="font-display text-3xl font-bold">Admin</h1>
          <p className="text-muted-foreground text-sm">Review hospital submissions and contact messages.</p>
        </div>
      </div>

      <Section icon={Building2} title={`Pending hospital submissions (${pendings.length})`}>
        {pending.isLoading && <Skeleton />}
        {pendings.length === 0 && !pending.isLoading && <Empty>No pending submissions.</Empty>}
        <div className="grid gap-3">
          {pendings.map((p: any) => (
            <article key={p.id} className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-sm text-muted-foreground">{p.city}{p.address ? ` · ${p.address}` : ""}</div>
                  <div className="text-xs text-muted-foreground mt-1">By {p.submitter_email ?? p.submitted_by}</div>
                  {p.specialties?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.specialties.map((s: string) => <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-muted">{s}</span>)}
                    </div>
                  )}
                  {p.notes && <p className="text-sm mt-2 text-muted-foreground italic">"{p.notes}"</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={() => mApprove.mutate(p.id)} disabled={mApprove.isPending}><CheckCircle2 className="size-4 mr-1" />Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => mReject.mutate(p.id)} disabled={mReject.isPending}><XCircle className="size-4 mr-1" />Reject</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {reviewed.length > 0 && (
          <details className="mt-3">
            <summary className="text-sm text-muted-foreground cursor-pointer">Show {reviewed.length} reviewed</summary>
            <ul className="mt-2 text-sm text-muted-foreground space-y-1">
              {reviewed.map((p: any) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span>{p.name} — {p.city}</span>
                  <span className={p.status === "approved" ? "text-success" : "text-destructive"}>{p.status}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </Section>

      <Section icon={Mail} title={`Contact messages (${open.length} open)`}>
        {messages.isLoading && <Skeleton />}
        {open.length === 0 && !messages.isLoading && <Empty>No open messages.</Empty>}
        <div className="grid gap-3">
          {open.map((m: any) => (
            <article key={m.id} className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{m.subject || `(${m.category})`}</div>
                  <div className="text-xs text-muted-foreground">{m.name} &lt;{m.email}&gt; · {new Date(m.created_at).toLocaleString()}</div>
                  <p className="text-sm mt-2 whitespace-pre-wrap">{m.message}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject || "Your MediRoute message")}`} className="text-xs text-primary underline">Reply</a>
                  <Button size="sm" variant="outline" onClick={() => mResolve.mutate({ id: m.id, resolved: true })}><MailOpen className="size-4 mr-1" />Resolve</Button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {done.length > 0 && (
          <details className="mt-3">
            <summary className="text-sm text-muted-foreground cursor-pointer">Show {done.length} resolved</summary>
            <ul className="mt-2 text-sm text-muted-foreground space-y-1">
              {done.map((m: any) => (
                <li key={m.id}>{m.subject || m.category} — {m.email}</li>
              ))}
            </ul>
          </details>
        )}
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-display text-xl font-bold flex items-center gap-2 mb-3"><Icon className="size-5 text-primary" />{title}</h2>
      {children}
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="p-8 text-center text-sm text-muted-foreground bg-card border border-border rounded-xl">{children}</div>;
}
function Skeleton() {
  return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>;
}
