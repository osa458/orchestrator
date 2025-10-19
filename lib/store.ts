type Status = { stage:string; prNumber?:number; previewUrl?:string };
const mem = new Map<string, Status>();

export async function setStatus(id:string, s:Status){ mem.set(id, s); }
export async function getStatus(id:string){ return mem.get(id) || null; }
