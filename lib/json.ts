export function extractJson(text: string): string {
  // Trim and try raw first
  const t = text.trim();
  try { JSON.parse(t); return t; } catch {}

  // Try ```json ... ``` fenced blocks
  const m = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (m && m[1]) {
    const inside = m[1].trim();
    try { JSON.parse(inside); return inside; } catch {}
  }

  // Try fixing common mistakes (single quotes)
  const fixed = t.replace(/(^|[^\\])'/g, '$1"');
  try { JSON.parse(fixed); return fixed; } catch {}

  // Give up, return original
  return t;
}
