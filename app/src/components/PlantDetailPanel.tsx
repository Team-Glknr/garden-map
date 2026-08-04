import { useRef, useState } from 'react'
import { X, Pencil, Trash2, Plus, Star } from 'lucide-react'
import { usePlantDetail } from '../hooks/usePlantDetail'
import { getPlantColors } from '../lib/plantIcons'
import { Planting, PlantDetail, PlantMedia } from '../types'

const LIGHT_OPTIONS = ['Full Sun', 'Full Sun to Partial Shade', 'Partial Shade', 'Partial Shade to Full Shade', 'Full Shade']
const SEASON_OPTIONS = ['Spring', 'Summer', 'Fall', 'Winter']

interface Props {
  plantId: string
  planting?: Planting
  onUpdatePlanting?: (fields: { planted_date?: string | null; custom_label?: string | null; notes?: string | null }) => void
  onRemovePlanting?: () => void
  onClose: () => void
}

// ── Inline editable field ────────────────────────────────────────────────────

function EditableField({
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

function EditableTextarea({
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

function EditableTags({
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

function EditableNumberRange({
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-stone-100 pt-3 mt-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-2">{title}</p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[11px] text-stone-400 w-24 shrink-0 pt-0.5">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function ft(min: number | null, max: number | null, unit = '′') {
  if (!min && !max) return '—'
  if (min === max || !max) return `${min}${unit}`
  if (!min) return `up to ${max}${unit}`
  return `${min}–${max}${unit}`
}

function primaryName(p: PlantDetail): string {
  return p.plant_common_names?.find(n => n.is_primary)?.name
    ?? p.plant_common_names?.[0]?.name
    ?? [p.genus, p.species, p.cultivar ? `'${p.cultivar}'` : null].filter(Boolean).join(' ')
}

function scientificName(p: PlantDetail): string {
  return [p.genus, p.species, p.cultivar ? `'${p.cultivar}'` : null].filter(Boolean).join(' ')
}

// ── Photo manager ────────────────────────────────────────────────────────────

function PhotoManager({
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

function CommonNameAdd({ onAdd }: { onAdd: (name: string) => Promise<void> }) {
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

// ── Main component ────────────────────────────────────────────────────────────

export function PlantDetailPanel({ plantId, planting, onUpdatePlanting, onRemovePlanting, onClose }: Props) {
  const {
    plant, loading, updatePlant,
    addCommonName, removeCommonName, setPrimaryCommonName,
    addPhoto, removePhoto, setPrimaryPhoto,
  } = usePlantDetail(plantId)

  const colors = plant ? getPlantColors(plant.taxonomic_type) : { bg: '#f1f5f9', fg: '#475569' }

  return (
    <div className="w-80 shrink-0 border-l border-stone-200 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-stone-100">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {loading || !plant ? (
              <div className="h-4 w-40 bg-stone-100 rounded animate-pulse" />
            ) : (
              <>
                <p className="font-semibold text-stone-800 text-sm leading-tight truncate">{primaryName(plant)}</p>
                <p className="text-xs text-stone-400 italic mt-0.5 truncate">{scientificName(plant)}</p>
                <span
                  className="inline-block mt-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: colors.bg, color: colors.fg }}
                >
                  {plant.taxonomic_type}
                </span>
              </>
            )}
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-600 shrink-0">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 text-sm">
        {loading && <p className="text-xs text-stone-400">Loading…</p>}

        {plant && (
          <>
            {/* Photos */}
            <PhotoManager
              media={plant.plant_media}
              altBase={primaryName(plant)}
              onAdd={addPhoto}
              onRemove={removePhoto}
              onSetPrimary={setPrimaryPhoto}
            />

            {/* Description */}
            <EditableTextarea
              value={plant.description}
              placeholder="Add a description…"
              onSave={v => updatePlant({ description: v })}
            />

            <Section title="Size">
              <Row label="Height"><EditableNumberRange min={plant.height_min_ft} max={plant.height_max_ft} onSave={v => updatePlant({ height_min_ft: v.min, height_max_ft: v.max })} /></Row>
              <Row label="Spread"><EditableNumberRange min={plant.spread_min_ft} max={plant.spread_max_ft} onSave={v => updatePlant({ spread_min_ft: v.min, spread_max_ft: v.max })} /></Row>
              <Row label="Spacing"><EditableNumberRange min={plant.spacing_min_ft} max={plant.spacing_max_ft} onSave={v => updatePlant({ spacing_min_ft: v.min, spacing_max_ft: v.max })} /></Row>
            </Section>

            <Section title="Care">
              <Row label="Light"><EditableTags values={plant.light} options={LIGHT_OPTIONS} onSave={v => updatePlant({ light: v })} /></Row>
              <Row label="Water">
                <EditableField value={plant.watering_need} placeholder="e.g. Medium" onSave={v => updatePlant({ watering_need: v })} />
              </Row>
              <Row label="Soil"><EditableTags values={plant.soil_texture} onSave={v => updatePlant({ soil_texture: v })} /></Row>
              <Row label="Drainage"><EditableTags values={plant.soil_drainage} onSave={v => updatePlant({ soil_drainage: v })} /></Row>
              <Row label="USDA Zones">
                <EditableNumberRange min={plant.usda_hardiness_zone_min} max={plant.usda_hardiness_zone_max} unit="" onSave={v => updatePlant({ usda_hardiness_zone_min: v.min, usda_hardiness_zone_max: v.max })} />
              </Row>
              <Row label="Growth rate">
                <EditableField value={plant.growth_rate} placeholder="e.g. Medium" onSave={v => updatePlant({ growth_rate: v })} />
              </Row>
              <Row label="Maintenance">
                <EditableField value={plant.maintenance} placeholder="e.g. Low" onSave={v => updatePlant({ maintenance: v })} />
              </Row>
            </Section>

            <Section title="Bloom">
              <Row label="Seasons"><EditableTags values={plant.bloom_seasons} options={SEASON_OPTIONS} onSave={v => updatePlant({ bloom_seasons: v })} /></Row>
              {plant.bloom_window_text && (
                <Row label="Window"><span className="text-xs text-stone-500 italic">{plant.bloom_window_text}</span></Row>
              )}
              <Row label="Flower color"><EditableTags values={plant.flower_color} onSave={v => updatePlant({ flower_color: v })} /></Row>
              <Row label="Bloom start">
                <EditableField
                  value={plant.bloom_start_md}
                  placeholder="MM-DD"
                  hint="Exact bloom start date for seasonal rendering"
                  onSave={v => updatePlant({ bloom_start_md: v })}
                />
              </Row>
              <Row label="Bloom end">
                <EditableField
                  value={plant.bloom_end_md}
                  placeholder="MM-DD"
                  onSave={v => updatePlant({ bloom_end_md: v })}
                />
              </Row>
            </Section>

            <Section title="Foliage">
              <Row label="Leaf color"><EditableTags values={plant.leaf_color} onSave={v => updatePlant({ leaf_color: v })} /></Row>
              <Row label="Fall color"><EditableTags values={plant.deciduous_fall_color} onSave={v => updatePlant({ deciduous_fall_color: v })} /></Row>
              <Row label="Foliage color">
                <EditableField
                  value={plant.foliage_color}
                  placeholder="e.g. Green"
                  onSave={v => updatePlant({ foliage_color: v })}
                />
              </Row>
              <Row label="Dieback">
                <EditableField
                  value={plant.dieback_start_md}
                  placeholder="MM-DD"
                  hint="When herbaceous plants die back"
                  onSave={v => updatePlant({ dieback_start_md: v })}
                />
              </Row>
              <Row label="Regrowth">
                <EditableField
                  value={plant.regrowth_start_md}
                  placeholder="MM-DD"
                  onSave={v => updatePlant({ regrowth_start_md: v })}
                />
              </Row>
            </Section>

            <Section title="Wildlife">
              <Row label="Attracts"><EditableTags values={plant.attracts} onSave={v => updatePlant({ attracts: v })} /></Row>
              <Row label="Value">
                <EditableField value={plant.wildlife_value} placeholder="Describe value…" onSave={v => updatePlant({ wildlife_value: v })} />
              </Row>
            </Section>

            <Section title="Ecology">
              <EditableTags values={plant.ecological_tags} onSave={v => updatePlant({ ecological_tags: v })} />
            </Section>

            {/* Planting-specific section */}
            {planting && onUpdatePlanting && (
              <Section title="This Planting">
                <Row label="Planted">
                  <EditableField
                    value={planting.planted_date}
                    placeholder="YYYY-MM-DD"
                    onSave={v => onUpdatePlanting({ planted_date: v })}
                  />
                </Row>
                <Row label="Label">
                  <EditableField
                    value={planting.custom_label}
                    placeholder="Custom name"
                    onSave={v => onUpdatePlanting({ custom_label: v })}
                  />
                </Row>
                <Row label="Notes">
                  <EditableTextarea
                    value={planting.notes}
                    placeholder="Add notes…"
                    onSave={v => onUpdatePlanting({ notes: v })}
                  />
                </Row>
                {onRemovePlanting && (
                  <button
                    onClick={onRemovePlanting}
                    className="mt-2 flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 border border-red-200 rounded px-2 py-1 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={11} /> Remove planting
                  </button>
                )}
              </Section>
            )}

            {/* Common names */}
            <Section title="Common names">
              <div className="flex flex-wrap items-center gap-1">
                {plant.plant_common_names.map(n => (
                  <span key={n.id} className="group/tag flex items-center gap-1 text-[10px] bg-stone-100 text-stone-600 rounded px-1.5 py-0.5">
                    {!n.is_primary && (
                      <button onClick={() => setPrimaryCommonName(n.id)} title="Set as primary" className="text-stone-300 hover:text-amber-500">
                        <Star size={9} />
                      </button>
                    )}
                    {n.is_primary && <Star size={9} className="text-amber-500 fill-amber-500" />}
                    {n.name}
                    <button onClick={() => removeCommonName(n.id)} className="text-stone-300 group-hover/tag:text-red-500">
                      <X size={9} />
                    </button>
                  </span>
                ))}
                <CommonNameAdd onAdd={addCommonName} />
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  )
}
