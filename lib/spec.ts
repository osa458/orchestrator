import { z } from "zod";

export const Spec = z.object({
  name: z.string().min(1),
  stack: z.object({
    frontend: z.enum(["nextjs-14","remix"]).default("nextjs-14"),
    backend: z.enum(["fastapi","express","none"]).default("none"),
    db: z.enum(["postgres","sqlite","none"]).default("none"),
    auth: z.enum(["email-otp","none"]).default("none"),
  }),
  features: z.array(z.string()).default([]),
  nonfunc: z.record(z.string()).default({}),
  acceptance: z.array(z.string()).default([]),
});

export type ProjectSpec = z.infer<typeof Spec>;

export function specToYAML(s: ProjectSpec){
  const lines:string[] = [];
  lines.push(`name: ${s.name}`);
  lines.push(`stack:`);
  lines.push(`  frontend: ${s.stack.frontend}`);
  lines.push(`  backend: ${s.stack.backend}`);
  lines.push(`  db: ${s.stack.db}`);
  lines.push(`  auth: ${s.stack.auth}`);
  lines.push(`features:`);
  for(const f of s.features) lines.push(`  - ${f}`);
  lines.push(`nonfunc:`);
  for(const [k,v] of Object.entries(s.nonfunc)) lines.push(`  ${k}: "${v}"`);
  lines.push(`acceptance:`);
  for(const a of s.acceptance) lines.push(`  - "${a}"`);
  return lines.join("\n") + "\n";
}
