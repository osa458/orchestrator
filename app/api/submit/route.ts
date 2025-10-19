import { Spec, ProjectSpec, specToYAML } from "@/lib/spec";
import { setStatus } from "@/lib/store";
import { extractJson } from "@/lib/json";

export const runtime = "edge";

async function llm(prompt:any){
  const r = await fetch(`${process.env.LLM_API_BASE}/chat/completions`,{
    method:"POST",
    headers:{
      "Authorization":`Bearer ${process.env.LLM_API_KEY}`,
      "Content-Type":"application/json"
    },
    body: JSON.stringify(prompt)
  });
  if(!r.ok){
    const txt = await r.text();
    throw new Error(`LLM HTTP ${r.status}: ${txt}`);
  }
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "{}";
}

export async function POST(req: Request){
  const { prompt } = await req.json();
  const runId = crypto.randomUUID();
  await setStatus(runId,{ stage:"nlp:structuring" });

  // 1) Ask for JSON only + enable json response_format for OpenAI
  const specRaw = await llm({
    model: process.env.DEFAULT_PROVIDER === "google" ? "google/gemini-2.5-pro" : "gpt-4.1",
    temperature: 0,
    response_format: process.env.DEFAULT_PROVIDER === "openai" ? { type: "json_object" } : undefined,
    messages:[
      { role:"system", content:
        "Return ONLY valid JSON matching:\n"+
        "{ name:string, stack:{frontend:'nextjs-14'|'remix',backend:'fastapi'|'express'|'none',db:'postgres'|'sqlite'|'none',auth:'email-otp'|'none'}, features:string[], nonfunc:Record<string,string>, acceptance:string[] }"
      },
      { role:"user", content: `Convert this product prompt to JSON ONLY (no commentary, no code fences):\n${prompt}` }
    ]
  });

  // 2) Extract/coerce JSON and validate
  const jsonText = extractJson(specRaw);
  let spec: ProjectSpec;
  try {
    spec = Spec.parse(JSON.parse(jsonText));
  } catch (e:any) {
    // Safe fallback spec so the pipeline continues, plus error detail for you
    const fallback: ProjectSpec = {
      name: "Untitled App",
      stack: { frontend:"nextjs-14", backend:"none", db:"none", auth:"none" },
      features: [],
      nonfunc: {},
      acceptance: []
    };
    return new Response(JSON.stringify({
      error: "Spec validation failed",
      detail: String(e),
      model_output_preview: specRaw?.slice(0, 400) || null
    }), { status: 400 });
  }

  const yaml = specToYAML(spec);

  // 3) Create GitHub issue (relative URL — no APP_URL pitfalls)
  const issue = await fetch(`/api/github/open-issue`,{
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
