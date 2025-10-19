'use client'
import { useState } from 'react'

type SubmitResp = { runId: string; issueNumber: number } | { error: string, detail?: string }

export default function Page() {
  const [prompt, setPrompt] = useState('Build a Next.js app with a contact form and a /api/health route.')
  const [result, setResult] = useState<SubmitResp | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true); setError(null); setResult(null)
    try {
      const r = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const j = await r.json()
      if (!r.ok) setError(j?.error || 'Submission failed')
      else setResult(j)
    } catch (e:any) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 820, margin: '0 auto' }}>
      <h1>Prompt → Preview Orchestrator</h1>
      <p style={{ color: '#555' }}>Type a prompt, click Generate. I’ll open a scaffold issue in your GitHub repo.</p>

      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        style={{ width: '100%', height: 160, padding: 12, marginTop: 12 }}
      />

      <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
        <button onClick={handleGenerate} disabled={loading}
          style={{ padding: '8px 14px', background: 'black', color: 'white', borderRadius: 6 }}>
          {loading ? 'Generating…' : 'Generate'}
        </button>
        <button onClick={()=>{ setPrompt('Build a Next.js app with a contact form and a /api/health route. Add acceptance criteria.')}}>
          Use example
        </button>
      </div>

      {error && <p style={{ color: 'crimson', marginTop: 16 }}>Error: {error}</p>}

      {result && 'runId' in result && (
        <div style={{ marginTop: 16, border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
          <div><b>Run ID:</b> <code>{(result as any).runId}</code></div>
          <div><b>GitHub Issue #:</b> {(result as any).issueNumber}</div>
          <p style={{ marginTop: 8, color: '#555' }}>
            Check your repo’s Issues for details:
            {' '}
            <a target="_blank" href={`https://github.com/osa458/target-repo/issues/${(result as any).issueNumber}`}>
              open on GitHub
            </a>
          </p>
        </div>
      )}
    </main>
  )
}
