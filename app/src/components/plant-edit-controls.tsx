import { useRef, useState } from 'react'
import { X, Pencil, Trash2, Plus, Star } from 'lucide-react'
import { PlantMedia } from '../types'
import { ft } from '../lib/plantDisplay'

export const LIGHT_OPTIONS = ['Full Sun', 'Full Sun to Partial Shade', 'Partial Shade', 'Partial Shade to Full Shade', 'Full Shade']
export const SEASON_OPTIONS = ['Spring', 'Summer', 'Fall', 'Winter']

// ── Inline editable field ────────────────────────────────────────────────────

export function EditableField({
  value,
  placeholder,
  onSave,
  hint,
}: {
  value: string | null
  placeholder: string
  onSave: (v: string | null) => void
  hint?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  function commit() {
    onSave(draft.trim() || null)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        placeholder={placeholder}
        className="text-xs border border-green-400 rounded px-1.5 py-0.5 w-28 focus:outline-none"
      />
    )
  }

  return (
    <button
      onClick={() => { setDraft(value ?? ''); setEditing(true) }}
      className="flex items-center gap-1 group text-xs"
      title={hint}
    >
      {value
        ? <span className="text-stone-700">{value}</span>
        : <span className="text-stone-300 italic">{placeholder}</span>}
      <Pencil size={9} className="text-stone-300 group-hover:text-stone-500 shrink-0" />
    </button>
  )
}

export function EditableTextarea({
  value,
  placeholder,
  onSave,
}: {
  value: string | null
  placeholder: string
  onSave: (v: string | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  function commit() {
    onSave(draft.trim() || null)
    setEditing(false)
  }

  if (editing) {
    return (
      <textarea
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        rows={3}
        className="text-xs border border-green-400 rounded px-2 py-1 w-full focus:outline-none resize-none"
        placeholder={placeholder}
      />
    )
  }

  return (
    <button
      onClick={() => { setDraft(value ?? ''); setEditing(true) }}
      className="flex items-start gap-1 group text-xs text-left w-full"
    >
      {value
        ? <span className="text-stone-700 whitespace-pre-wrap">{value}</span>
        : <span className="text-stone-300 italic">{placeholder}</span>}
      <Pencil size={9} className="text-stone-300 group-hover:text-stone-500 shrink-0 mt-0.5" />
    </button>
  )
}

export function EditableTags({
  values,
  options,
  onSave,
}: {
  values: string[] | null
  options?: string[]
  onSave: (v: string[] | null) => void
}) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const list = values ?? []

  function remove(v: string) {
    const next = list.filter(x => x !== v)
    onSave(next.length ? next : null)
  }

  function commitAdd(v: string) {
    const trimmed = v.trim()
    if (trimmed && !list.includes(trimmed)) onSave([...list, trimmed])
    setDraft('')
    setAdding(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {list.map(v => (
        <span key={v} className="group/tag flex items-center gap-1 text-[10px] bg-stone-100 text-stone-600 rounded px-1.5 py-0.5">
          {v}
          <button onClick={() => remove(v)} className="text-stone-300 group-hover/tag:text-red-500">
            <X size={9} />
          </button>
        </span>
      ))}
      {adding ? (
        options ? (
          <select
            autoFocus
            defaultValue=""
            onChange={e => commitAdd(e.target.value)}
            onBlur={() => setAdding(false)}
            className="text-[10px] border border-green-400 rounded px-1 py-0.5 focus:outline-none"
          >
            <option value="" disabled>Choose…</option>
            {options.filter(o => !list.includes(o)).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => (draft.trim() ? commitAdd(draft) : setAdding(false))}
            onKeyDown={e => { if (e.key === 'Enter') commitAdd(draft); if (e.key === 'Escape') setAdding(false) }}
            placeholder="Add…"
            className="text-[10px] border border-green-400 rounded px-1 py-0.5 w-20 focus:outline-none"
          />
        )
      ) : (
        <button onClick={() => setAdding(true)} className="text-stone-300 hover:text-stone-500">
          <Plus size={11} />
        </button>
      )}
    </div>
  )
}

export function EditableNumberRange({
  min,
  max,
  unit = '′',
  onSave,
}: {
  min: number | null
  max: number | null
  unit?: string
  onSave: (v: { min: number | null; max: number | null }) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draftMin, setDraftMin] = useState(min?.toString() ?? '')
  const [draftMax, setDraftMax] = useState(max?.toString() ?? '')

  function commit() {
    onSave({
      min: draftMin.trim() ? Number(draftMin) : null,
      max: draftMax.trim() ? Number(draftMax) : null,
    })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          type="number"
          value={draftMin}
          onChange={e => setDraftMin(e.target.value)}
          className="text-xs border border-green-400 rounded px-1 py-0.5 w-12 focus:outline-none"
        />
        <span className="text-stone-300 text-xs">–</span>
        <input
          type="number"
          value={draftMax}
          onChange={e => setDraftMax(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          className="text-xs border border-green-400 rounded px-1 py-0.5 w-12 focus:outline-none"
        />
        <span className="text-[10px] text-stone-400">{unit}</span>
      </div>
    )
  }

  return (
    <button
      onClick={() => { setDraftMin(min?.toString() ?? ''); setDraftMax(max?.toString() ?? ''); setEditing(true) }}
      className="flex items-center gap-1 group text-xs"
    >
      <span className="text-stone-700">{ft(min, max, unit)}</span>
      <Pencil size={9} className="text-stone-300 group-hover:text-stone-500 shrink-0" />
    </button>
  )
}

// ── Photo manager ────────────────────────────────────────────────────────────

export function PhotoManager({
  media,
  altBase,
  onAdd,
  onRemove,
  onSetPrimary,
}: {
  media: PlantMedia[]
  altBase: string
  onAdd: (file: File) => Promise<void>
  onRemove: (m: PlantMedia) => Promise<void>
  onSetPrimary: (id: string) => Promise<void>
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const sorted = [...media].sort((a, b) => Number(b.is_primary) - Number(a.is_primary))
  const primary = sorted[0]

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      await onAdd(file)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove(m: PlantMedia) {
    if (!confirm('Delete this photo?')) return
    try {
      await onRemove(m)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete photo')
    }
  }

  return (
    <div className="mb-3">
      <div className="grid grid-cols-3 gap-1.5">
        {sorted.map(m => (
          <div key={m.id} className="relative group aspect-square rounded-md overflow-hidden bg-stone-100">
            <img src={m.original_url} alt={m.caption ?? altBase} className="w-full h-full object-cover" />
            {m.is_primary && (
              <span className="absolute bottom-1 left-1 text-[8px] bg-white/90 text-green-700 rounded px-1 py-0.5">Primary</span>
            )}
            <div className="absolute inset-0 flex items-start justify-end gap-1 p-1 opacity-0 group-hover:opacity-100 bg-black/0 group-hover:bg-black/20 transition-colors">
              {!m.is_primary && (
                <button onClick={() => onSetPrimary(m.id)} title="Set as primary" className="p-1 bg-white/90 rounded hover:bg-white">
                  <Star size={10} className="text-stone-600" />
                </button>
              )}
              <button onClick={() => handleRemove(m)} title="Delete photo" className="p-1 bg-white/90 rounded hover:bg-white">
                <Trash2 size={10} className="text-red-500" />
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="aspect-square rounded-md border border-dashed border-stone-300 flex items-center justify-center text-stone-400 hover:border-stone-400 hover:text-stone-500"
        >
          {uploading ? <span className="text-[9px]">…</span> : <Plus size={16} />}
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {primary && (primary.photographer || primary.license_name) && (
        <p className="text-[10px] text-stone-400 mt-1">
          {primary.caption && <span>{primary.caption} — </span>}
          {primary.photographer && <span>{primary.photographer}</span>}
          {primary.license_name && (
            <>
              {primary.photographer && ', '}
              {primary.license_url ? (
                <a href={primary.license_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-600">
                  {primary.license_name}
                </a>
              ) : (
                <span>{primary.license_name}</span>
              )}
            </>
          )}
        </p>
      )}
    </div>
  )
}

export function CommonNameAdd({ onAdd }: { onAdd: (name: string) => Promise<void> }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  async function commit(v: string) {
    const trimmed = v.trim()
    setAdding(false)
    setDraft('')
    if (!trimmed) return
    try {
      await onAdd(trimmed)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add name')
    }
  }

  if (adding) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={e => { if (e.key === 'Enter') commit(draft); if (e.key === 'Escape') setAdding(false) }}
        placeholder="Add name…"
        className="text-[10px] border border-green-400 rounded px-1 py-0.5 w-24 focus:outline-none"
      />
    )
  }

  return (
    <button onClick={() => setAdding(true)} className="text-stone-300 hover:text-stone-500">
      <Plus size={11} />
    </button>
  )
}
