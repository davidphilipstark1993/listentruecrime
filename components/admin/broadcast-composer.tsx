'use client'
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, ImageIcon, Paperclip, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  ALLOWED_TYPES, BROADCAST_BUCKET, MAX_FILES, MAX_FILE_BYTES, formatBytes, renderBroadcastHtml,
  type BroadcastAttachment,
} from '@/lib/newsletter/broadcast'

interface HistoryRow {
  id: string
  subject: string
  status: string
  recipient_count: number | null
  error: string | null
  created_at: string
}

export function BroadcastComposer({ subscriberCount, history }: { subscriberCount: number; history: HistoryRow[] }) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<BroadcastAttachment[]>([])
  const [uploading, setUploading] = useState(0)
  const [busy, setBusy] = useState<null | 'test' | 'all'>(null)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const canSend = subject.trim() && message.trim() && !uploading && !busy
  const previewHtml = useMemo(
    () => (showPreview ? renderBroadcastHtml({ subject: subject || '(no subject)', message: message || '(no message)', attachments }) : ''),
    [showPreview, subject, message, attachments],
  )

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return
    setNotice(null)
    const supabase = createClient()
    const list = Array.from(files)
    if (attachments.length + list.length > MAX_FILES) {
      setNotice({ kind: 'error', text: `You can attach up to ${MAX_FILES} files.` })
      return
    }
    for (const file of list) {
      if (!ALLOWED_TYPES.includes(file.type)) { setNotice({ kind: 'error', text: `${file.name}: that file type isn't supported.` }); continue }
      if (file.size > MAX_FILE_BYTES) { setNotice({ kind: 'error', text: `${file.name} is over 25 MB.` }); continue }
      setUploading(n => n + 1)
      try {
        const res = await fetch('/api/admin/broadcasts/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, type: file.type, size: file.size }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Upload failed')
        const { error } = await supabase.storage.from(BROADCAST_BUCKET).uploadToSignedUrl(data.path, data.token, file, { contentType: file.type })
        if (error) throw new Error(error.message)
        setAttachments(prev => [...prev, { name: file.name, url: data.url, type: file.type, size: file.size }])
      } catch (err) {
        setNotice({ kind: 'error', text: `${file.name}: ${err instanceof Error ? err.message : 'upload failed'}` })
      } finally {
        setUploading(n => n - 1)
      }
    }
    if (fileInput.current) fileInput.current.value = ''
  }

  async function send(mode: 'test' | 'all') {
    if (mode === 'all') {
      const ok = window.confirm(
        `Send "${subject.trim()}" to ${subscriberCount} subscriber${subscriberCount === 1 ? '' : 's'} now?\n\nThis can't be undone.`,
      )
      if (!ok) return
    }
    setBusy(mode)
    setNotice(null)
    try {
      const res = await fetch('/api/admin/broadcasts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, attachments, mode }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Send failed')
      if (mode === 'test') {
        setNotice({ kind: 'ok', text: `Test sent to ${data.sentTo}. Check how it looks before sending to everyone.` })
      } else {
        setNotice({ kind: 'ok', text: `Sent to ${data.sentCount} subscriber${data.sentCount === 1 ? '' : 's'}.` })
        setSubject(''); setMessage(''); setAttachments([])
        router.refresh()
      }
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Send failed' })
      if (mode === 'all') router.refresh()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <h1 className="heading-display text-2xl mb-1">Send an email</h1>
      <p className="text-stone-muted text-sm mb-6">
        A one-off message to all {subscriberCount} active subscriber{subscriberCount === 1 ? '' : 's'}, with optional photos and files.
        This is separate from the weekly newsletter and doesn&apos;t affect it.
      </p>

      <div className="card p-5 space-y-5">
        <div>
          <label htmlFor="bc-subject" className="block text-sm text-stone-muted mb-1.5">Subject</label>
          <input id="bc-subject" className="input-base" value={subject} maxLength={150} onChange={e => setSubject(e.target.value)} />
        </div>

        <div>
          <label htmlFor="bc-message" className="block text-sm text-stone-muted mb-1.5">Message</label>
          <textarea
            id="bc-message"
            className="input-base min-h-[220px]"
            value={message}
            maxLength={20000}
            onChange={e => setMessage(e.target.value)}
            placeholder="Write your message. A blank line starts a new paragraph, and web addresses become links."
          />
        </div>

        <div>
          <p className="block text-sm text-stone-muted mb-1.5">Photos and files</p>
          <p className="text-stone-subtle text-xs mb-2">
            Photos appear in the email. PDFs and other files appear as download links (up to {MAX_FILES} files, 25 MB each).
            Anyone with a file&apos;s link can open it.
          </p>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(',')}
            onChange={e => uploadFiles(e.target.files)}
            className="hidden"
            id="bc-files"
          />
          <button type="button" className="btn-outline inline-flex items-center gap-2" onClick={() => fileInput.current?.click()} disabled={!!uploading}>
            <Paperclip size={15} /> {uploading ? 'Uploading…' : 'Add photos or files'}
          </button>

          {attachments.length > 0 && (
            <ul className="mt-3 space-y-2">
              {attachments.map(a => (
                <li key={a.url} className="flex items-center gap-3 text-sm bg-ink-800 rounded-lg px-3 py-2">
                  {a.type.startsWith('image/')
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={a.url} alt="" className="w-10 h-10 object-cover rounded" />
                    : <FileText size={18} className="text-stone-subtle shrink-0" />}
                  <span className="flex-1 min-w-0 truncate text-stone">{a.name}</span>
                  <span className="text-stone-subtle text-xs shrink-0">{formatBytes(a.size)}</span>
                  <button type="button" aria-label={`Remove ${a.name}`} className="text-stone-subtle hover:text-stone" onClick={() => setAttachments(prev => prev.filter(x => x.url !== a.url))}>
                    <X size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {notice && (
          <p role="status" className={notice.kind === 'ok' ? 'text-sm text-green-400' : 'text-sm text-red-400'}>{notice.text}</p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-outline" onClick={() => setShowPreview(v => !v)}>
            {showPreview ? 'Hide preview' : 'Preview'}
          </button>
          <button type="button" className="btn-outline" disabled={!canSend} onClick={() => send('test')}>
            {busy === 'test' ? 'Sending test…' : 'Send test to me'}
          </button>
          <button type="button" className="btn-primary" disabled={!canSend || subscriberCount === 0} onClick={() => send('all')}>
            {busy === 'all' ? 'Sending…' : `Send to ${subscriberCount} subscriber${subscriberCount === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>

      {showPreview && (
        <iframe title="Email preview" srcDoc={previewHtml} className="w-full h-[640px] mt-6 rounded-lg border border-white/[0.06] bg-black" />
      )}

      {history.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-lg text-stone mb-3">Recent sends</h2>
          <ul className="divide-y divide-white/[0.06] text-sm">
            {history.map(h => (
              <li key={h.id} className="py-2.5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-stone truncate">{h.subject}</p>
                  <p className="text-stone-subtle text-xs">{new Date(h.created_at).toLocaleString('en-GB')}{h.error ? ` · ${h.error}` : ''}</p>
                </div>
                <span className={`shrink-0 text-xs ${h.status === 'sent' ? 'text-green-400' : h.status === 'failed' ? 'text-red-400' : 'text-stone-subtle'}`}>
                  {h.status === 'sent' ? `Sent to ${h.recipient_count}` : h.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
