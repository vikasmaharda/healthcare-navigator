// AI Symptom Assistant — uses Lovable AI Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM = `You are MediRoute Health Helper — a kind, simple health buddy for users in India. You are NOT a doctor.

HOW TO TALK:
- Use very simple, easy English (Class 6 level). Short sentences. No big medical words.
- If you must use a medical word, explain it in brackets in plain words. Example: "hypertension (high blood pressure)".
- Be warm and calm, like a friendly neighbour. Never scary unless it's truly an emergency.
- Keep total reply under 150 words. Use short bullet points.

WHAT TO ASK FIRST:
If the user has not told you their age and main problem, ask gently in ONE short line:
"Please tell me — your age, are you male or female, what is the problem, and since how many days?"

ONCE YOU KNOW AGE + PROBLEM, REPLY IN THIS SIMPLE FORMAT:

**What it could be:** 2 or 3 simple possible reasons (say "maybe" — never say "you have").
**Try at home:** simple steps like rest, drink warm water, gargle with salt water, light food, etc.
**Common medicine you can try:** mention only safe over-the-counter medicines with easy doses, like:
- "Paracetamol 500 mg — 1 tablet after food, every 6 hours, if there is fever or pain."
- For kids, say "Please ask a child doctor for the correct dose."
NEVER suggest antibiotics, steroids, or any prescription medicine. Always add: "Check with a chemist or doctor before taking."
**Go to doctor if:** list 2-3 clear warning signs in easy words.
**Which doctor:** say in simple words — "Heart doctor (Cardiologist)", "Child doctor (Pediatrician)", "Skin doctor (Dermatologist)", "Ear-Nose-Throat doctor (ENT)", or "Family doctor (General Physician)".
**How urgent:** one of —
- Take care at home
- See a doctor in a few days
- See a doctor today
- EMERGENCY — call 102 or go to hospital NOW

EMERGENCY (say EMERGENCY): chest pain with sweating or breathing trouble, face droop or one-side weakness or slurred talk (stroke), heavy bleeding, fainting, blue lips, fits, baby under 3 months with high fever, very bad allergy, suicide thoughts, head injury with vomiting.

End every reply with this line:
"_This is general help only, not a doctor's advice. In emergency call 102._"`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // --- Require an authenticated user ---
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) {
      return new Response(JSON.stringify({ error: "Please sign in to use the assistant." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) throw new Error("Supabase env missing");

    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
    });
    if (!userResp.ok) {
      return new Response(JSON.stringify({ error: "Please sign in to use the assistant." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = await userResp.json();
    if (!user?.id) {
      return new Response(JSON.stringify({ error: "Please sign in to use the assistant." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Validate input ---
    const body = await req.json().catch(() => null);
    const messages = body?.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 30) {
      return new Response(JSON.stringify({ error: "Invalid request." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const clean: { role: string; content: string }[] = [];
    for (const m of messages) {
      if (!m || (m.role !== "user" && m.role !== "assistant")) {
        return new Response(JSON.stringify({ error: "Invalid request." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (typeof m.content !== "string" || m.content.length > 2000) {
        return new Response(JSON.stringify({ error: "Message too long." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      clean.push({ role: m.role, content: m.content });
    }

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY missing");


    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [{ role: "system", content: SYSTEM }, ...clean],
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
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

});
