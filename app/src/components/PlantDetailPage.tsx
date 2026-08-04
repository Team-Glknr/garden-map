import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Star, X } from 'lucide-react'
import { usePlantDetail } from '../hooks/usePlantDetail'
import { supabase } from '../lib/supabase'
import { getPlantColors, getPlantIcon } from '../lib/plantIcons'
import { primaryName, scientificName } from '../lib/plantDisplay'
import {
  EditableField, EditableTextarea, EditableTags, EditableNumberRange, EditableBoolean, EditableChildTags,
  PhotoManager, CommonNameAdd, LIGHT_OPTIONS, SEASON_OPTIONS,
} from './plant-edit-controls'
import { PlantPestDisease, PlantRelationship } from '../types'

interface Props {
  plantId: string
  index: number
  total: number
  onPrev: (() => void) | null
  onNext: (() => void) | null
  onClose: () => void
  onSelectPlant: (plantId: string) => void
}

interface RelatedPlantSummary {
  id: string
  name: string
  scientificName: string
  taxonomicType: string
  photo: string | null
}

function useRelatedPlantSummaries(relationships: PlantRelationship[]): Record<string, RelatedPlantSummary> {
  const relatedIds = useMemo(
    () => Array.from(new Set(relationships.map(r => r.related_plant_id).filter((id): id is string => !!id))),
    [relationships],
  )
  const [summaries, setSummaries] = useState<Record<string, RelatedPlantSummary>>({})

  useEffect(() => {
    if (!relatedIds.length) { setSummaries({}); return }
    let cancelled = false
    supabase
      .from('plants')
      .select('id, genus, species, cultivar, taxonomic_type, plant_common_names(name, is_primary), plant_media(original_url, is_primary)')
      .in('id', relatedIds)
      .then(({ data }) => {
        if (cancelled || !data) return
        const map: Record<string, RelatedPlantSummary> = {}
        for (const row of data as any[]) {
          map[row.id] = {
            id: row.id,
            name: primaryName(row),
            scientificName: scientificName(row),
            taxonomicType: row.taxonomic_type,
            photo: row.plant_media?.find((m: any) => m.is_primary)?.original_url ?? row.plant_media?.[0]?.original_url ?? null,
          }
        }
        setSummaries(map)
      })
    return () => { cancelled = true }
  }, [relatedIds])

  return summaries
}

const WOODY_TYPES = ['Tree', 'Shrub', 'Vine']
const HERBACEOUS_TYPES = ['Herbaceous Perennial', 'Annual', 'Biennial']

const RELATIONSHIP_LABELS: Record<PlantRelationship['relationship_type'], string> = {
  confused_with: 'Confused with',
  similar_to: 'Similar to',
  fills_niche: 'Fills a similar niche as',
  native_alternative_for: 'Native alternative for',
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg px-3.5 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">{label}</div>
      <div className="text-sm font-medium text-stone-700 mt-1">{children}</div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400 mt-8">{children}</div>
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-stone-100 border border-stone-200 text-stone-600">
      {children}
    </span>
  )
}

function InlineField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-stone-400">{label}</span>
      {children}
    </div>
  )
}

function PestDiseaseList({
  items,
  onAdd,
  onRemove,
}: {
  items: PlantPestDisease[]
  onAdd: (entryType: 'pest' | 'disease', name: string) => void
  onRemove: (id: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [entryType, setEntryType] = useState<'pest' | 'disease'>('pest')
  const [name, setName] = useState('')

  function commit() {
    if (name.trim()) onAdd(entryType, name.trim())
    setName('')
    setAdding(false)
  }

  return (
    <div className="flex flex-col gap-1.5 mt-3">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-2 text-xs">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${item.entry_type === 'pest' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
            {item.entry_type}
          </span>
          <span className="text-stone-600">{item.name}</span>
          <button onClick={() => onRemove(item.id)} className="text-stone-300 hover:text-red-500 ml-auto"><X size={11} /></button>
        </div>
      ))}
      {adding ? (
        <div className="flex items-center gap-2">
          <select
            value={entryType}
            onChange={e => setEntryType(e.target.value as 'pest' | 'disease')}
            className="text-[11px] border border-green-400 rounded px-1 py-0.5 focus:outline-none"
          >
            <option value="pest">Pest</option>
            <option value="disease">Disease</option>
          </select>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setAdding(false) }}
            onBlur={commit}
            placeholder="Name…"
            className="text-xs border border-green-400 rounded px-1.5 py-0.5 flex-1 focus:outline-none"
          />
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 w-fit">
          <Plus size={11} /> Add pest or disease
        </button>
      )}
    </div>
  )
}

function RelatedPlantCard({
  label,
  summary,
  fallbackText,
  onSelect,
  onRemove,
}: {
  label: string
  summary: RelatedPlantSummary | undefined
  fallbackText: string | null
  onSelect: (() => void) | null
  onRemove: () => void
}) {
  const colors = summary ? getPlantColors(summary.taxonomicType) : { bg: '#f1f5f9', fg: '#475569' }
  const Icon = summary ? getPlantIcon(summary.taxonomicType) : null

  return (
    <div className="flex items-center gap-3 bg-white border border-stone-200 rounded-lg pl-2 pr-3 py-2">
      {onSelect ? (
        <button onClick={onSelect} className="group/related flex items-center gap-3 flex-1 min-w-0 text-left">
          <span className="w-10 h-10 rounded-md overflow-hidden bg-stone-100 flex items-center justify-center shrink-0">
            {summary!.photo ? (
              <img src={summary!.photo} alt={summary!.name} loading="lazy" className="w-full h-full object-cover" />
            ) : (
              <span className="flex items-center justify-center w-full h-full" style={{ backgroundColor: colors.bg, color: colors.fg }}>
                {Icon && <Icon size={16} />}
              </span>
            )}
          </span>
          <div className="min-w-0">
            <div className="text-[10px] text-stone-400">{label}</div>
            <div className="text-sm font-medium text-stone-700 truncate group-hover/related:underline">{summary!.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {summary!.scientificName !== summary!.name && (
                <span className="text-[11px] italic text-stone-400 truncate">{summary!.scientificName}</span>
              )}
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: colors.bg, color: colors.fg }}>
                {summary!.taxonomicType}
              </span>
            </div>
          </div>
        </button>
      ) : (
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="w-10 h-10 rounded-md bg-stone-100 shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] text-stone-400">{label}</div>
            <div className="text-sm font-medium text-stone-700 truncate">{fallbackText}</div>
          </div>
        </div>
      )}
      <button onClick={onRemove} className="text-stone-300 hover:text-red-500 shrink-0"><X size={12} /></button>
    </div>
  )
}

function RelationshipList({
  items,
  summaries,
  onAdd,
  onRemove,
  onSelectPlant,
}: {
  items: PlantRelationship[]
  summaries: Record<string, RelatedPlantSummary>
  onAdd: (type: PlantRelationship['relationship_type'], text: string) => void
  onRemove: (id: string) => void
  onSelectPlant: (plantId: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [type, setType] = useState<PlantRelationship['relationship_type']>('similar_to')
  const [text, setText] = useState('')

  function commit() {
    if (text.trim()) onAdd(type, text.trim())
    setText('')
    setAdding(false)
  }

  return (
    <div className="flex flex-col gap-2 mt-3">
      {items.map(item => {
        const summary = item.related_plant_id ? summaries[item.related_plant_id] : undefined
        return (
          <RelatedPlantCard
            key={item.id}
            label={RELATIONSHIP_LABELS[item.relationship_type]}
            summary={summary}
            fallbackText={item.related_name_text}
            onSelect={summary ? () => onSelectPlant(summary.id) : null}
            onRemove={() => onRemove(item.id)}
          />
        )
      })}
      {adding ? (
        <div className="flex items-center gap-2">
          <select
            value={type}
            onChange={e => setType(e.target.value as PlantRelationship['relationship_type'])}
            className="text-[11px] border border-green-400 rounded px-1 py-0.5 focus:outline-none"
          >
            {Object.entries(RELATIONSHIP_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
          <input
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setAdding(false) }}
            onBlur={commit}
            placeholder="Plant name…"
            className="text-xs border border-green-400 rounded px-1.5 py-0.5 flex-1 focus:outline-none"
          />
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-600 w-fit">
          <Plus size={11} /> Add related plant
        </button>
      )}
    </div>
  )
}

export function PlantDetailPage({ plantId, index, total, onPrev, onNext, onClose, onSelectPlant }: Props) {
  const {
    plant, loading, updatePlant,
    addCommonName, removeCommonName, setPrimaryCommonName,
    addPhoto, removePhoto, setPrimaryPhoto,
    addSynonym, removeSynonym,
    updatePronunciation,
    addStateCode, removeStateCode,
    updateWoodyDetails, updateHerbaceousDetails,
    addPestDisease, removePestDisease,
    addRelationship, removeRelationship,
  } = usePlantDetail(plantId)
  const relatedSummaries = useRelatedPlantSummaries(plant?.plant_relationships ?? [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const colors = plant ? getPlantColors(plant.taxonomic_type) : { bg: '#f1f5f9', fg: '#475569' }
  const woody = plant?.plant_woody_details ?? undefined
  const herbaceous = plant?.plant_herbaceous_details ?? undefined
  const showWoody = !!plant && (WOODY_TYPES.includes(plant.taxonomic_type) || !!woody)
  const showHerbaceous = !!plant && (HERBACEOUS_TYPES.includes(plant.taxonomic_type) || !!herbaceous)

  return (
    <div className="fixed inset-0 bg-stone-50 z-50 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-stone-200 bg-white sticky top-0 z-10">
        <button onClick={onClose} className="flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-800">
          <ArrowLeft size={16} /> Back to Plants
        </button>
        <div className="flex items-center gap-4">
          {total > 0 && <span className="text-xs text-stone-400">{index + 1} of {total}</span>}
          <div className="flex gap-1.5">
            <button
              onClick={() => onPrev?.()}
              disabled={!onPrev}
              className="w-8 h-8 rounded-lg border border-stone-200 bg-white flex items-center justify-center disabled:opacity-30"
            >
              <ChevronLeft size={15} className="text-stone-600" />
            </button>
            <button
              onClick={() => onNext?.()}
              disabled={!onNext}
              className="w-8 h-8 rounded-lg border border-stone-200 bg-white flex items-center justify-center disabled:opacity-30"
            >
              <ChevronRight size={15} className="text-stone-600" />
            </button>
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-stone-400 text-center py-16">Loading…</p>}

      {plant && (
        <div className="max-w-3xl mx-auto px-6 pt-9 pb-20">
          {/* Hero */}
          <div className="flex gap-5 items-start">
            <div className="min-w-0 flex-1">
              <span
                className="inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: colors.bg, color: colors.fg }}
              >
                {plant.taxonomic_type}
              </span>
              <h1 className="text-2xl font-bold text-stone-800 mt-2 leading-tight">{primaryName(plant)}</h1>
              <p className="text-base italic text-stone-400 mt-0.5">{scientificName(plant)}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                {plant.plant_common_names.map(n => (
                  <span key={n.id} className="group/tag flex items-center gap-1 text-[11px] bg-white border border-stone-200 text-stone-500 rounded-full px-2.5 py-1">
                    {n.is_primary
                      ? <Star size={9} className="text-amber-500 fill-amber-500" />
                      : (
                        <button onClick={() => setPrimaryCommonName(n.id)} title="Set as primary">
                          <Star size={9} className="text-stone-300 hover:text-amber-500" />
                        </button>
                      )}
                    {n.name}
                    <button onClick={() => removeCommonName(n.id)} className="text-stone-300 group-hover/tag:text-red-500">
                      <X size={9} />
                    </button>
                  </span>
                ))}
                <CommonNameAdd onAdd={addCommonName} />
              </div>
            </div>
          </div>

          {/* Identity */}
          <SectionLabel>Identity</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <Stat label="Family"><EditableField value={plant.family} placeholder="e.g. Rosaceae" onSave={v => updatePlant({ family: v })} /></Stat>
            <Stat label="Habit / Form"><EditableTags values={plant.habit_form} onSave={v => updatePlant({ habit_form: v })} /></Stat>
            <Stat label="Country of Origin"><EditableTags values={plant.country_of_origin} onSave={v => updatePlant({ country_of_origin: v })} /></Stat>
            <Stat label="Texture"><EditableField value={plant.texture} placeholder="e.g. Medium" onSave={v => updatePlant({ texture: v })} /></Stat>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-3">
            <InlineField label="Pronunciation">
              <EditableField
                value={plant.plant_pronunciations?.phonetic_spelling ?? null}
                placeholder="Add phonetic spelling…"
                onSave={v => updatePronunciation({ phonetic_spelling: v })}
              />
            </InlineField>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-stone-400">Synonyms</span>
            <EditableChildTags
              values={plant.plant_synonyms.map(s => s.synonym)}
              onAdd={addSynonym}
              onRemove={v => {
                const s = plant.plant_synonyms.find(x => x.synonym === v)
                if (s) removeSynonym(s.id)
              }}
            />
          </div>

          {/* Photos */}
          <SectionLabel>Photos</SectionLabel>
          <div className="mt-3">
            <PhotoManager
              media={plant.plant_media}
              altBase={primaryName(plant)}
              onAdd={addPhoto}
              onRemove={removePhoto}
              onSetPrimary={setPrimaryPhoto}
            />
          </div>

          {/* At a glance */}
          <SectionLabel>At a Glance</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <Stat label="Light"><EditableTags values={plant.light} options={LIGHT_OPTIONS} onSave={v => updatePlant({ light: v })} /></Stat>
            <Stat label="Soil Drainage"><EditableTags values={plant.soil_drainage} onSave={v => updatePlant({ soil_drainage: v })} /></Stat>
            <Stat label="Growth Rate"><EditableField value={plant.growth_rate} placeholder="e.g. Medium" onSave={v => updatePlant({ growth_rate: v })} /></Stat>
            <Stat label="Maintenance"><EditableField value={plant.maintenance} placeholder="e.g. Low" onSave={v => updatePlant({ maintenance: v })} /></Stat>
          </div>

          {/* Size */}
          <SectionLabel>Size</SectionLabel>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <Stat label="Height"><EditableNumberRange min={plant.height_min_ft} max={plant.height_max_ft} onSave={v => updatePlant({ height_min_ft: v.min, height_max_ft: v.max })} /></Stat>
            <Stat label="Spread"><EditableNumberRange min={plant.spread_min_ft} max={plant.spread_max_ft} onSave={v => updatePlant({ spread_min_ft: v.min, spread_max_ft: v.max })} /></Stat>
            <Stat label="Spacing"><EditableNumberRange min={plant.spacing_min_ft} max={plant.spacing_max_ft} onSave={v => updatePlant({ spacing_min_ft: v.min, spacing_max_ft: v.max })} /></Stat>
          </div>

          {/* Bloom */}
          <SectionLabel>Bloom</SectionLabel>
          <div className="flex flex-wrap gap-2 mt-3 items-center">
            <Pill><EditableTags values={plant.bloom_seasons} options={SEASON_OPTIONS} onSave={v => updatePlant({ bloom_seasons: v })} /></Pill>
            <Pill><EditableTags values={plant.flower_color} onSave={v => updatePlant({ flower_color: v })} /></Pill>
            <Pill><EditableField value={plant.flower_inflorescence} placeholder="Inflorescence" onSave={v => updatePlant({ flower_inflorescence: v })} /></Pill>
            <Pill><EditableField value={plant.flower_shape} placeholder="Shape" onSave={v => updatePlant({ flower_shape: v })} /></Pill>
            <Pill><EditableTags values={plant.flower_value} onSave={v => updatePlant({ flower_value: v })} /></Pill>
            {plant.bloom_window_text && <span className="text-xs text-stone-400 italic">{plant.bloom_window_text}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-3">
            <InlineField label="Bloom start"><EditableField value={plant.bloom_start_md} placeholder="MM-DD" onSave={v => updatePlant({ bloom_start_md: v })} /></InlineField>
            <InlineField label="Bloom end"><EditableField value={plant.bloom_end_md} placeholder="MM-DD" onSave={v => updatePlant({ bloom_end_md: v })} /></InlineField>
            <InlineField label="Size"><EditableNumberRange min={plant.flower_size_min_in} max={plant.flower_size_max_in} unit={'"'} onSave={v => updatePlant({ flower_size_min_in: v.min, flower_size_max_in: v.max })} /></InlineField>
            <InlineField label="Petals"><EditableNumberRange min={plant.flower_petals_min} max={plant.flower_petals_max} unit="" onSave={v => updatePlant({ flower_petals_min: v.min, flower_petals_max: v.max })} /></InlineField>
          </div>
          <div className="mt-3 max-w-xl">
            <EditableTextarea value={plant.flower_description} placeholder="Flower description…" onSave={v => updatePlant({ flower_description: v })} />
          </div>

          {/* Fruit */}
          <SectionLabel>Fruit</SectionLabel>
          <div className="flex flex-wrap gap-2 mt-3 items-center">
            <Pill><EditableTags values={plant.fruit_color} onSave={v => updatePlant({ fruit_color: v })} /></Pill>
            <Pill><EditableField value={plant.fruit_type} placeholder="Type" onSave={v => updatePlant({ fruit_type: v })} /></Pill>
            <Pill><EditableTags values={plant.fruit_value} onSave={v => updatePlant({ fruit_value: v })} /></Pill>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-3">
            <InlineField label="Length"><EditableNumberRange min={plant.fruit_length_min_in} max={plant.fruit_length_max_in} unit={'"'} onSave={v => updatePlant({ fruit_length_min_in: v.min, fruit_length_max_in: v.max })} /></InlineField>
            <InlineField label="Width"><EditableNumberRange min={plant.fruit_width_min_in} max={plant.fruit_width_max_in} unit={'"'} onSave={v => updatePlant({ fruit_width_min_in: v.min, fruit_width_max_in: v.max })} /></InlineField>
            <InlineField label="Harvest"><EditableField value={plant.fruit_harvest_time} placeholder="e.g. Fall" onSave={v => updatePlant({ fruit_harvest_time: v })} /></InlineField>
          </div>
          <div className="mt-3 max-w-xl">
            <EditableTextarea value={plant.fruit_description} placeholder="Fruit description…" onSave={v => updatePlant({ fruit_description: v })} />
          </div>

          {/* Foliage */}
          <SectionLabel>Foliage</SectionLabel>
          <div className="flex flex-wrap gap-2 mt-3 items-center">
            <Pill><EditableTags values={plant.leaf_color} onSave={v => updatePlant({ leaf_color: v })} /></Pill>
            <Pill><EditableTags values={plant.deciduous_fall_color} onSave={v => updatePlant({ deciduous_fall_color: v })} /></Pill>
            <Pill><EditableTags values={plant.leaf_feel} onSave={v => updatePlant({ leaf_feel: v })} /></Pill>
            <Pill><EditableField value={plant.leaf_type} placeholder="Type" onSave={v => updatePlant({ leaf_type: v })} /></Pill>
            <Pill><EditableField value={plant.leaf_arrangement} placeholder="Arrangement" onSave={v => updatePlant({ leaf_arrangement: v })} /></Pill>
            <Pill><EditableField value={plant.leaf_shape} placeholder="Shape" onSave={v => updatePlant({ leaf_shape: v })} /></Pill>
            <Pill><EditableTags values={plant.leaf_margin} onSave={v => updatePlant({ leaf_margin: v })} /></Pill>
            <Pill><EditableTags values={plant.leaf_value} onSave={v => updatePlant({ leaf_value: v })} /></Pill>
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-3">
            <InlineField label="Render color"><EditableField value={plant.foliage_color} placeholder="e.g. Green" onSave={v => updatePlant({ foliage_color: v })} /></InlineField>
            <InlineField label="Length"><EditableNumberRange min={plant.leaf_length_min_in} max={plant.leaf_length_max_in} unit={'"'} onSave={v => updatePlant({ leaf_length_min_in: v.min, leaf_length_max_in: v.max })} /></InlineField>
            <InlineField label="Width"><EditableNumberRange min={plant.leaf_width_min_in} max={plant.leaf_width_max_in} unit={'"'} onSave={v => updatePlant({ leaf_width_min_in: v.min, leaf_width_max_in: v.max })} /></InlineField>
            <InlineField label="Hairs present"><EditableBoolean value={plant.hairs_present} onSave={v => updatePlant({ hairs_present: v })} /></InlineField>
            <InlineField label="Dieback"><EditableField value={plant.dieback_start_md} placeholder="MM-DD" onSave={v => updatePlant({ dieback_start_md: v })} /></InlineField>
            <InlineField label="Regrowth"><EditableField value={plant.regrowth_start_md} placeholder="MM-DD" onSave={v => updatePlant({ regrowth_start_md: v })} /></InlineField>
          </div>
          <div className="mt-3 max-w-xl">
            <EditableTextarea value={plant.leaf_description} placeholder="Leaf description…" onSave={v => updatePlant({ leaf_description: v })} />
          </div>

          {/* Stem */}
          <SectionLabel>Stem</SectionLabel>
          <div className="flex flex-wrap gap-2 mt-3 items-center">
            <Pill><EditableTags values={plant.stem_color} onSave={v => updatePlant({ stem_color: v })} /></Pill>
            <Pill><EditableField value={plant.stem_form} placeholder="Form" onSave={v => updatePlant({ stem_form: v })} /></Pill>
            <Pill><EditableField value={plant.stem_surface} placeholder="Surface" onSave={v => updatePlant({ stem_surface: v })} /></Pill>
            <InlineField label="Aromatic"><EditableBoolean value={plant.stem_is_aromatic} onSave={v => updatePlant({ stem_is_aromatic: v })} /></InlineField>
          </div>
          <div className="mt-3 max-w-xl">
            <EditableTextarea value={plant.stem_description} placeholder="Stem description…" onSave={v => updatePlant({ stem_description: v })} />
          </div>

          {/* Soil & drainage */}
          <SectionLabel>Soil &amp; Drainage</SectionLabel>
          <div className="flex flex-wrap gap-2 mt-3 items-center">
            <Pill><EditableTags values={plant.soil_texture} onSave={v => updatePlant({ soil_texture: v })} /></Pill>
            <Pill><EditableTags values={plant.soil_ph} onSave={v => updatePlant({ soil_ph: v })} /></Pill>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-100 border border-stone-200 text-stone-600">
              Zones <EditableNumberRange min={plant.usda_hardiness_zone_min} max={plant.usda_hardiness_zone_max} unit="" onSave={v => updatePlant({ usda_hardiness_zone_min: v.min, usda_hardiness_zone_max: v.max })} />
            </span>
          </div>

          {/* Safety & edibility */}
          <SectionLabel>Safety &amp; Edibility</SectionLabel>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
            <Stat label="Poisonous (Humans)"><EditableBoolean value={plant.poisonous_to_humans} onSave={v => updatePlant({ poisonous_to_humans: v })} /></Stat>
            <Stat label="Poisonous (Pets)"><EditableBoolean value={plant.poisonous_to_pets} onSave={v => updatePlant({ poisonous_to_pets: v })} /></Stat>
            <Stat label="Medicinal"><EditableBoolean value={plant.medicinal} onSave={v => updatePlant({ medicinal: v })} /></Stat>
            <Stat label="Edible Fruit"><EditableBoolean value={plant.edible_fruit} onSave={v => updatePlant({ edible_fruit: v })} /></Stat>
            <Stat label="Edible Leaf"><EditableBoolean value={plant.edible_leaf} onSave={v => updatePlant({ edible_leaf: v })} /></Stat>
          </div>

          {/* Landscape use */}
          <SectionLabel>Landscape Use</SectionLabel>
          <div className="flex flex-wrap gap-2 mt-3 items-center">
            <Pill><EditableTags values={plant.landscape_location} onSave={v => updatePlant({ landscape_location: v })} /></Pill>
            <Pill><EditableTags values={plant.landscape_theme} onSave={v => updatePlant({ landscape_theme: v })} /></Pill>
            <Pill><EditableTags values={plant.design_feature} onSave={v => updatePlant({ design_feature: v })} /></Pill>
            <Pill><EditableTags values={plant.resistance_to_challenges} onSave={v => updatePlant({ resistance_to_challenges: v })} /></Pill>
            <Pill><EditableTags values={plant.play_value} onSave={v => updatePlant({ play_value: v })} /></Pill>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <InlineField label="Fire risk"><EditableField value={plant.fire_risk} placeholder="Low/Medium/High" onSave={v => updatePlant({ fire_risk: v })} /></InlineField>
          </div>

          {/* Woody details */}
          {showWoody && (
            <>
              <SectionLabel>Woody Details</SectionLabel>
              <div className="flex flex-wrap gap-2 mt-3 items-center">
                <Pill><EditableField value={woody?.woody_leaf_characteristics ?? null} placeholder="Deciduous/Evergreen" onSave={v => updateWoodyDetails({ woody_leaf_characteristics: v })} /></Pill>
                <Pill><EditableTags values={woody?.bark_color ?? null} onSave={v => updateWoodyDetails({ bark_color: v })} /></Pill>
                <Pill><EditableField value={woody?.bark_surface ?? null} placeholder="Bark surface" onSave={v => updateWoodyDetails({ bark_surface: v })} /></Pill>
              </div>
              <div className="mt-3 max-w-xl">
                <EditableTextarea value={woody?.bark_description ?? null} placeholder="Bark description…" onSave={v => updateWoodyDetails({ bark_description: v })} />
              </div>
            </>
          )}

          {/* Herbaceous details */}
          {showHerbaceous && (
            <>
              <SectionLabel>Herbaceous Details</SectionLabel>
              <div className="mt-3">
                <EditableTags values={herbaceous?.propagation_strategy ?? null} onSave={v => updateHerbaceousDetails({ propagation_strategy: v })} />
              </div>
            </>
          )}

          {/* Ecology */}
          <SectionLabel>Ecology</SectionLabel>
          <div className="flex flex-wrap gap-2 mt-3 items-center">
            {plant.life_cycle && <Pill>{plant.life_cycle}</Pill>}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-stone-100 border border-stone-200 text-stone-600">
              Attracts <EditableTags values={plant.attracts} onSave={v => updatePlant({ attracts: v })} />
            </span>
          </div>
          <div className="mt-3">
            <EditableTags values={plant.ecological_tags} onSave={v => updatePlant({ ecological_tags: v })} />
          </div>
          <p className="text-xs text-stone-500 mt-2">
            <EditableField value={plant.wildlife_value} placeholder="Describe wildlife value…" onSave={v => updatePlant({ wildlife_value: v })} />
          </p>

          {/* Distribution */}
          <SectionLabel>Distribution</SectionLabel>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs text-stone-400">Native to</span>
            <EditableChildTags
              values={plant.plant_state_distribution.map(s => s.state_code)}
              onAdd={addStateCode}
              onRemove={removeStateCode}
              placeholder="XX"
            />
          </div>

          {/* Pests & diseases */}
          <SectionLabel>Pests &amp; Diseases</SectionLabel>
          <PestDiseaseList items={plant.plant_pest_disease} onAdd={addPestDisease} onRemove={removePestDisease} />

          {/* Related plants */}
          <SectionLabel>Related Plants</SectionLabel>
          <RelationshipList
            items={plant.plant_relationships}
            summaries={relatedSummaries}
            onAdd={addRelationship}
            onRemove={removeRelationship}
            onSelectPlant={onSelectPlant}
          />

          {/* Other notes */}
          <SectionLabel>Other Notes</SectionLabel>
          <div className="mt-3">
            <EditableTags values={plant.particularly_resistant_to} onSave={v => updatePlant({ particularly_resistant_to: v })} />
          </div>
          <div className="mt-3 max-w-xl">
            <EditableTextarea value={plant.insect_disease_problems} placeholder="Insect / disease problems…" onSave={v => updatePlant({ insect_disease_problems: v })} />
          </div>

          {/* About */}
          <SectionLabel>About</SectionLabel>
          <div className="mt-3 max-w-xl">
            <EditableTextarea value={plant.description} placeholder="Add a description…" onSave={v => updatePlant({ description: v })} />
          </div>
        </div>
      )}
    </div>
  )
}
