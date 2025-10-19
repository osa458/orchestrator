export const runtime = "nodejs";

export async function POST(req: Request){
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  if(!repo || !token){
    return new Response(JSON.stringify({ error: "GitHub not configured" }), { status: 500 });
  }
  const { title, body } = await req.json();

  const r = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, body, labels: ["scaffold"] }),
  });

  if(!r.ok){
    const txt = await r.text();
    return new Response(JSON.stringify({ error: "GitHub API error", detail: txt }), { status: 500 });
  }
  const data = await r.json();
  return Response.json(data);
}
