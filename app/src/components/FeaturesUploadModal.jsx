import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const DAYS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const ACCEPTED_TYPES = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
  'application/pdf': 'pdf',
}

export default function FeaturesUploadModal({ weekStart, onClose, onLoaded }) {
  const [tab, setTab] = useState('file')          // 'file' | 'paste'
  const [file, setFile] = useState(null)
  const [pasteText, setPasteText] = useState('')
  const [parsing, setParsing] = useState(false)
  const [entries, setEntries] = useState(null)    // parsed preview
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const canParse = tab === 'file' ? !!file : pasteText.trim().length > 10
  const hasPreview = entries && entries.length > 0

  // Group entries by day for the preview grid
  const byDay = hasPreview
    ? DAYS_FULL.reduce((acc, _, idx) => {
        acc[idx] = { lunch: null, dinner: null }
        entries.forEach(e => {
          if (e.day_of_week === idx) acc[idx][e.meal] = e.content
        })
        return acc
      }, {})
    : null

  async function handleParse() {
    setError('')
    setEntries(null)
    setParsing(true)
    try {
      let body

      if (tab === 'paste') {
        body = { rawText: pasteText.trim() }
      } else {
        const mimeType = file.type || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        const fileBase64 = await readFileAsBase64(file)
        body = { fileBase64, mimeType }
      }

      const { data, error: fnErr } = await supabase.functions.invoke('process-features', { body })
      if (fnErr) throw new Error(fnErr.message)
      if (!data.success) throw new Error(data.error || 'Parsing failed')
      if (!data.entries || data.entries.length === 0) throw new Error('No features found in the document. Check the format.')

      setEntries(data.entries)
    } catch (err) {
      setError(err.message)
    } finally {
      setParsing(false)
    }
  }

  async function handleLoad() {
    if (!entries || entries.length === 0) return
    setSaving(true)
    setError('')
    try {
      // Upsert all parsed entries for the target week
      const rows = entries.map(e => ({
        week_start: weekStart,
        day_of_week: e.day_of_week,
        meal: e.meal,
        content: e.content.trim(),
      }))

      const { error: upsertErr } = await supabase
        .from('weekly_features')
        .upsert(rows, { onConflict: 'week_start,day_of_week,meal' })

      if (upsertErr) throw new Error(upsertErr.message)
      onLoaded()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!ACCEPTED_TYPES[f.type] && !f.name.match(/\.(docx|pdf)$/i)) {
      setError('Please select a .docx or .pdf file.')
      return
    }
    setError('')
    setEntries(null)
    setFile(f)
  }

  function handleDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) {
      setFile(f)
      setEntries(null)
      setError('')
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
            <i className="fa-solid fa-utensils" style={{ color: 'var(--orange)', marginRight: '8px' }} />
            Load Features from Document
          </h2>
          <button className="wb-act-btn" onClick={onClose} title="Close" style={{ fontSize: '1rem' }}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[['file', 'fa-file-arrow-up', 'Upload File'], ['paste', 'fa-paste', 'Paste Text']].map(([id, icon, label]) => (
              <button
                key={id}
                onClick={() => { setTab(id); setEntries(null); setError('') }}
                style={{
                  padding: '7px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  borderColor: tab === id ? 'var(--orange)' : 'var(--border-color)',
                  background: tab === id ? 'rgba(230,107,53,0.12)' : 'transparent',
                  color: tab === id ? 'var(--orange)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: tab === id ? 600 : 400,
                  fontSize: '0.875rem',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <i className={`fa-solid ${icon}`} />{label}
              </button>
            ))}
          </div>

          {/* File upload zone */}
          {tab === 'file' && (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${file ? 'var(--orange)' : 'var(--border-color)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '32px',
                textAlign: 'center',
                cursor: 'pointer',
                background: file ? 'rgba(230,107,53,0.05)' : 'transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <i className="fa-solid fa-file-arrow-up" style={{ fontSize: '2rem', color: file ? 'var(--orange)' : 'var(--text-muted)', marginBottom: '8px', display: 'block' }} />
              {file ? (
                <>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{file.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Click to choose a different file</div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Drop a .docx or .pdf here</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>or click to browse</div>
                </>
              )}
            </div>
          )}

          {/* Paste text zone */}
          {tab === 'paste' && (
            <textarea
              value={pasteText}
              onChange={e => { setPasteText(e.target.value); setEntries(null) }}
              placeholder={'Paste the full features text here...\n\nExample:\nLUNCH / HAPPY HOUR\nMONDAY Item Name $11\nDescription here\n\nDINNER FEATURES\nMONDAY Item Name $17\nDescription here'}
              style={{
                width: '100%',
                minHeight: '180px',
                padding: '12px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: '0.875rem',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          )}

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', color: '#f87171', fontSize: '0.875rem' }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }} />{error}
            </div>
          )}

          {/* Parse button */}
          {!hasPreview && (
            <button
              className="btn btn-primary"
              style={{ background: 'var(--orange)', borderColor: 'var(--orange)', alignSelf: 'flex-start' }}
              onClick={handleParse}
              disabled={!canParse || parsing}
            >
              {parsing
                ? <><i className="fa-solid fa-spinner fa-spin" /> Parsing…</>
                : <><i className="fa-solid fa-wand-magic-sparkles" /> Parse with AI</>}
            </button>
          )}

          {/* Preview */}
          {hasPreview && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  <i className="fa-solid fa-check-circle" style={{ color: '#4ade80', marginRight: '6px' }} />
                  {entries.length} features parsed — review before loading
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setEntries(null); setError('') }}
                  style={{ fontSize: '0.75rem' }}
                >
                  Re-parse
                </button>
              </div>

              {/* Preview grid */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', fontSize: '0.8rem' }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--text-secondary)' }}>Day</div>
                  <div style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--orange)', borderLeft: '1px solid var(--border-color)' }}>Lunch</div>
                  <div style={{ padding: '8px 10px', fontWeight: 700, color: '#a78bfa', borderLeft: '1px solid var(--border-color)' }}>Dinner</div>
                </div>
                {DAYS_FULL.map((day, idx) => {
                  const row = byDay[idx]
                  return (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', borderBottom: idx < 6 ? '1px solid var(--border-color)' : 'none' }}>
                      <div style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start' }}>{DAYS_SHORT[idx]}</div>
                      <div style={{ padding: '8px 10px', borderLeft: '1px solid var(--border-color)', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                        {row.lunch || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </div>
                      <div style={{ padding: '8px 10px', borderLeft: '1px solid var(--border-color)', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                        {row.dinner || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <i className="fa-solid fa-info-circle" style={{ marginRight: '4px' }} />
                This will overwrite any existing features for the selected week.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Week of {new Date(weekStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>Cancel</button>
            {hasPreview && (
              <button
                className="btn btn-primary btn-sm"
                style={{ background: 'var(--orange)', borderColor: 'var(--orange)' }}
                onClick={handleLoad}
                disabled={saving}
              >
                {saving
                  ? <><i className="fa-solid fa-spinner fa-spin" /> Loading…</>
                  : <><i className="fa-solid fa-calendar-check" /> Load to Calendar</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
