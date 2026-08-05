import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Bot, Send, Mic, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";


export const Route = createFileRoute("/ai-assistant")({ component: Page });

type Msg = { role: "user" | "assistant"; content: string };

const EXAMPLES = [
  "I'm 32, male. Fever 101°F and headache for 2 days.",
  "My son is 5 years old, has rash on cheeks since this morning.",
  "I'm 58, sharp chest pain when I breathe, started 1 hour ago.",
  "I'm 28, female. Persistent dry cough for 3 weeks, no fever.",
];

function Page() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    if (content.length > 2000) { toast.error("Message is too long."); return; }
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Please log in to use the AI assistant.");
        setBusy(false);
        return;
      }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/symptom-assistant`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: next.slice(-20) }),
      });

      if (resp.status === 401) { toast.error("Please log in to use the AI assistant."); setBusy(false); return; }
      if (resp.status === 429) { toast.error("Rate limit reached. Please wait a moment."); setBusy(false); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted. Add credits in Settings → Workspace → Usage."); setBusy(false); return; }
      if (!resp.ok || !resp.body) { toast.error("AI request failed"); setBusy(false); return; }


      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = ""; let so = ""; let done = false;
      setMessages(m => [...m, { role: "assistant", content: "" }]);

      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(j);
            const c = p.choices?.[0]?.delta?.content;
            if (c) {
              so += c;
              setMessages(m => { const cp = [...m]; cp[cp.length-1] = { role:"assistant", content: so }; return cp; });
            }
          } catch { buf = line + "\n" + buf; break; }
        }
        endRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally { setBusy(false); }
  };

  const voice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return toast.error("Voice not supported");
    const r = new SR(); r.lang = "en-IN"; r.start();
    r.onresult = (e: any) => setInput(e.results[0][0].transcript);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-2xl gradient-primary grid place-items-center text-primary-foreground"><Bot className="size-6" /></div>
        <div>
          <h1 className="font-display text-3xl font-bold">AI Symptom Assistant</h1>
          <p className="text-muted-foreground text-sm">Describe how you feel — get triage guidance and a suggested specialist.</p>
        </div>
      </div>

      <div className="mt-4 p-3 rounded-xl bg-warning/15 text-warning-foreground text-xs flex items-start gap-2">
        <AlertTriangle className="size-4 mt-0.5 shrink-0" />
        <span>This is general guidance only and not a medical diagnosis. In an emergency, call 102 immediately.</span>
      </div>

      <div className="mt-6 min-h-[300px] rounded-2xl bg-card border border-border p-4 space-y-4">
        {messages.length === 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-3">Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map(ex => (
                <button key={ex} onClick={() => send(ex)} className="px-3 py-1.5 rounded-full text-xs border border-border bg-muted hover:bg-card hover:border-primary/40 transition">{ex}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${m.role==="user" ? "gradient-primary text-primary-foreground" : "bg-muted"}`}>{m.content || "…"}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-4 flex items-center gap-2 p-2 bg-card border border-border rounded-2xl shadow-soft">
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder="Describe your symptoms…" className="flex-1 px-3 py-2 bg-transparent outline-none text-sm" />
        <button type="button" onClick={voice} className="p-2 rounded-lg hover:bg-muted text-muted-foreground" aria-label="Voice"><Mic className="size-4" /></button>
        <Button type="submit" disabled={busy}><Send className="size-4 mr-1" />Send</Button>
      </form>
    </div>
  );
}
