'use client'
import { useState, useCallback } from 'react'
import { Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import Papa from 'papaparse'
import toast from 'react-hot-toast'

type Row = Record<string, string>

interface ImportResult {
  inserted: number
  errors: string[]
  parseErrors?: string[]
  total?: number
  message?: string
}

export function CsvImporter() {
  const [rows, setRows] = useState<Row[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const parseFile = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const data = res.data as Row[]
        setRows(data)
        setHeaders(res.meta.fields ?? [])
        setResult(null)
        toast.success(`Parsed ${data.length} rows`)
      },
      error: (err) => toast.error(`Parse error: ${err.message}`),
    })
  }

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.name.endsWith('.csv')) parseFile(file)
    else toast.error('Please drop a CSV file')
  }, [])

  const handleImport = async () => {
    if (!rows.length) return
    setImporting(true)
    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()

      if (!res.ok) {
        // Surface auth/server errors clearly
        toast.error(data.error ?? `Import failed (${res.status})`)
        setResult({ inserted: 0, errors: [data.error ?? 'Unknown error'], total: rows.length })
        return
      }

      setResult(data)
      const count = data.inserted ?? 0
      const errCount = (data.errors?.length ?? 0) + (data.parseErrors?.length ?? 0)
      toast.success(`${count} podcast${count !== 1 ? 's' : ''} imported`)
      if (errCount > 0) toast.error(`${errCount} row${errCount !== 1 ? 's' : ''} had errors — see below`)
    } catch (err) {
      toast.error('Network error — import failed')
      console.error(err)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          dragOver ? 'border-crimson/60 bg-crimson/5' : 'border-white/10 hover:border-white/20'
        }`}
      >
        <Upload size={32} className="mx-auto mb-4 text-stone-subtle" />
        <p className="text-stone text-sm font-medium mb-1">Drop your CSV file here</p>
        <p className="text-stone-subtle text-xs mb-4">or click to browse</p>
        <label className="btn-outline cursor-pointer">
          Choose file
          <input type="file" accept=".csv" onChange={onFileInput} className="sr-only" />
        </label>
      </div>

      {/* Column headers info */}
      {headers.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-stone mb-2 uppercase tracking-wide">Detected columns ({headers.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {headers.map(h => (
              <span key={h} className="tag text-xs">{h}</span>
            ))}
          </div>
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-stone font-medium">{rows.length} rows ready to import</p>
            <button
              onClick={handleImport}
              disabled={importing}
              className="btn-primary"
            >
              {importing ? 'Importing…' : `Import ${rows.length} rows`}
            </button>
          </div>

          <div className="card overflow-hidden overflow-x-auto">
            <table className="text-xs min-w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {headers.slice(0, 6).map(h => (
                    <th key={h} className="text-left px-3 py-2 text-stone-subtle font-medium whitespace-nowrap">{h}</th>
                  ))}
                  {headers.length > 6 && <th className="px-3 py-2 text-stone-subtle">+{headers.length - 6} more</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {rows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    {headers.slice(0, 6).map(h => (
                      <td key={h} className="px-3 py-2 text-stone-muted max-w-[180px] truncate">{row[h] ?? ''}</td>
                    ))}
                    {headers.length > 6 && <td className="px-3 py-2 text-stone-subtle">…</td>}
                  </tr>
                ))}
                {rows.length > 5 && (
                  <tr>
                    <td colSpan={Math.min(headers.length, 7)} className="px-3 py-2 text-stone-subtle text-center">
                      …and {rows.length - 5} more rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="card p-5 space-y-3">
          <p className="text-sm font-semibold text-stone mb-1">Import results</p>
          {result.total != null && (
            <p className="text-xs text-stone-subtle mb-2">{result.total} rows processed</p>
          )}
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle size={16} className="text-emerald-400" />
            <span className="text-stone">{result.inserted} podcast{result.inserted !== 1 ? 's' : ''} imported / updated</span>
          </div>
          {[...(result.errors ?? []), ...(result.parseErrors ?? [])].length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <XCircle size={16} className="text-crimson" />
                <span className="text-stone">{[...(result.errors ?? []), ...(result.parseErrors ?? [])].length} errors</span>
              </div>
              <div className="pl-6 space-y-1 max-h-48 overflow-y-auto">
                {[...(result.errors ?? []), ...(result.parseErrors ?? [])].map((e, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-xs text-stone-muted">
                    <AlertCircle size={12} className="text-crimson/60 mt-0.5 shrink-0" />
                    {e}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expected format */}
      <div className="card p-5">
        <p className="text-xs font-semibold text-stone mb-3 uppercase tracking-wide">Expected CSV columns</p>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1 text-xs text-stone-muted">
          {[
            'podcast_name (or title)',
            'what_is_it_about (or description)',
            'who_is_it_for (or short_description)',
            'case_types (comma-separated)',
            'format (or format_type)',
            'tone (or factual_style)',
            'binge_factor_1_10 (1–10)',
            'time_commitment (or episode_length)',
            'best_episode_to_start_with',
            'if_you_liked_this_try',
            'quick_verdict',
            'newsletter_summary',
            'country (ISO code, e.g. US)',
            'platforms (comma-separated)',
            'image_url',
          ].map(f => (
            <span key={f} className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-crimson/50 shrink-0" />
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
