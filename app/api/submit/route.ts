import { z } from "zod";
import { Spec, ProjectSpec, specToYAML } from "@/lib/spec";
import { setStatus } from "@/lib/store";

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
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "{}";
}

export async function POST(req: Request){
  const { prompt } = await req.json();
  const runId = crypto.randomUUID();
  await setStatus(runId,{ stage:"nlp:structuring" });

  const specJson = await llm({
    model: process.env.DEFAULT_PROVIDER === "google" ? "google/gemini-2.5-pro" : "gpt-4.1",
    temperature: 0.2,
    messages:[
      { role:"system", content:"Output ONLY strict JSON with fields: {name, stack:{frontend,backend,db,auth}, features[], nonfunc{}, acceptance[]}" },
      { role:"user", content:`Convert this product prompt to JSON:\n${prompt}` }
    ]
  });

  let spec: ProjectSpec;
  try { spec = Spec.parse(JSON.parse(specJson)); }
  catch(e:any){ return new Response(JSON.stringify({error:"Spec validation failed", detail:String(e)}),{status:400}); }

  const yaml = specToYAML(spec);

  // use relative path so no bad URL errors
  const issue = await fetch(`/api/github/open-issue`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ title:`Scaffold: ${spec.name}`, body:"```yaml\n"+yaml+"```\n" })
  }).then(r=>r.json());

  await setStatus(runId,{ stage:"queued" });
  return Response.json({ runId, issueNumber: issue.number });
}
