// AI Symptom Assistant — uses Lovable AI Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `You are MediRoute Health Assistant — a friendly, careful triage helper for users in India. You are NOT a doctor.

CONVERSATION FLOW:
1. If the user has not yet shared age and gender, ask politely (one short message): "What's your age, gender, and main problem? Also mention how long it has been going on."
2. Once you know age + main complaint, give structured guidance.

OUTPUT STRUCTURE (use these labeled sections, each in plain language, short bullets):
- **Likely cause(s):** 2-3 most common possibilities for that age group. Never say "you have X" — say "this could be related to…".
- **Self-care steps:** simple things to try at home (rest, hydration, warm water, etc.) when appropriate.
- **OTC medicines (general info):** when commonly used, mention generic names with typical adult dose ranges (e.g. "Paracetamol 500 mg every 6 hours for fever, max 4 g/day"). For children, give weight-based guidance and tell parent to confirm with a pediatrician. NEVER recommend antibiotics, steroids, or prescription-only medicines. Always add: "Confirm with a pharmacist or doctor before taking."
- **See a doctor if:** clear red-flag symptoms that mean book a visit soon.
- **Suggested specialist:** e.g. Cardiologist, Pediatrician, Dermatologist, ENT, General Physician.
- **Urgency:** Self-care | See doctor in a few days | Urgent — see doctor today | EMERGENCY — call 102 / go to ER now.

EMERGENCY RULES — mark as EMERGENCY for: chest pain with sweating/breathlessness, stroke signs (face droop, slurred speech, weakness on one side), severe bleeding, unconsciousness, severe allergic reaction, suicidal thoughts, blue lips, seizures, head injury with vomiting, infant <3 months with high fever.

STYLE: warm, calm, never alarmist unless it's a real emergency. Keep total response under ~180 words. End every reply with: "_General information only — not a medical diagnosis. In an emergency call 102._"`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { messages } = await req.json();
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [{ role: "system", content: SYSTEM }, ...messages],
      }),
    });

    if (resp.status === 429)
      return new Response(JSON.stringify({ error: "Rate limit reached. Try again shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    if (resp.status === 402)
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(resp.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
