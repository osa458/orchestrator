import { Spec, ProjectSpec, specToYAML } from "@/lib/spec";
import { setStatus } from "@/lib/store";
import { extractJson } from "@/lib/json";

export const runtime = "edge";

// --- OpenAI + Gemini helpers ---
async function callOpenAI(messages:any[]){
  const base = process.env.LLM_API_BASE;        // e.g. https://api.openai.com/v1
  const key  = process.env.LLM_API_KEY;
  if(!base || !key) throw new Error("OpenAI not configured");
  const r = await fetch(`${base}/chat/completions`, {
    method:"POST",
    headers:{ "Authorization":`Bearer ${key}`, "Content-Type":"application/json" },
    body: JSON.stringify({
      model: "gpt-4.1",
      temperature: 0,
      response_format: { type: "json_object" },
      messages
    })
  });
  if(!r.ok) throw new Error(`LLM HTTP ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "{}";
}

async function callGemini(promptText:string){
  const base = process.env.GOOGLE_API_BASE;     // e.g. https://generativelanguage.googleapis.com/v1beta
  const key  = process.env.GOOGLE_API_KEY;
  if(!base || !key) throw new Error("Gemini not configured");
  const url = `${base}/models/gemini-2.5-pro:generateContent?key=${encodeURIComponent(key)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: promptText }] }
      ],
      generationConfig: { temperature: 0 }
    })
  });
  if(!r.ok) throw new Error(`LLM HTTP ${r.status}: ${await r.text()}`);
  const j = await r.json();
  // Extract text
  const text = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  return text;
}

export async function POST(req: Request){
  const { prompt } = await req.json();
  const runId = crypto.randomUUID();
  await setStatus(runId,{ stage:"nlp:structuring" });

  // Build one normalized instruction string for Gemini
  const schemaHint =
    "Return ONLY valid JSON matching: " +
    "{ name:string, stack:{frontend:'nextjs-14'|'remix', backend:'fastapi'|'express'|'none', db:'postgres'|'sqlite'|'none', auth:'email-otp'|'none'}, " +
    "features:string[], nonfunc:Record<string,string>, acceptance:string[] }";

  const provider = (process.env.DEFAULT_PROVIDER || "openai").toLowerCase();

  const specRaw = provider === "google"
    ? await callGemini(
        `${schemaHint}\n\nConvert this product prompt to JSON ONLY (no commentary, no code fences):\n${prompt}`
      )
    : await callOpenAI([
        { role:"system", content: schemaHint },
        { role:"user", content: `Convert this product prompt to JSON ONLY (no commentary, no code fences):\n${prompt}` }
      ]);

  const jsonText = extractJson(specRaw);

  let spec: ProjectSpec;
  try {
    spec = Spec.parse(JSON.parse(jsonText));
  } catch (e:any) {
    return new Response(JSON.stringify({
      error: "Spec validation failed",
      detail: String(e),
      model_output_preview: specRaw?.slice(0, 400) || null
    }), { status: 400 });
  }

  const yaml = specToYAML(spec);

  // Use absolute origin for Edge
  const { origin } = new URL(req.url);
  const issue = await fetch(`${origin}/api/github/open-issue`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      title: `Scaffold: ${spec.name}`,
      body: "```yaml\n"+yaml+"```\n"
    })
  }).then(r=>r.json());

  await setStatus(runId,{ stage:"queued" });
  return Response.json({ runId, issueNumber: issue.number });
}
