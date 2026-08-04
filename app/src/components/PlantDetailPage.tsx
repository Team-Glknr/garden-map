import { useEffect } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Star, X } from 'lucide-react'
import { usePlantDetail } from '../hooks/usePlantDetail'
import { getPlantColors, getPlantIcon } from '../lib/plantIcons'
import { primaryName, scientificName } from '../lib/plantDisplay'
import {
  EditableField, EditableTextarea, EditableTags, EditableNumberRange,
  PhotoManager, CommonNameAdd, LIGHT_OPTIONS, SEASON_OPTIONS,
} from './plant-edit-controls'

interface Props {
  plantId: string
  index: number
  total: number
  onPrev: (() => void) | null
  onNext: (() => void) | null
  onClose: () => void
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

export function PlantDetailPage({ plantId, index, total, onPrev, onNext, onClose }: Props) {
  const {
    plant, loading, updatePlant,
    addCommonName, removeCommonName, setPrimaryCommonName,
    addPhoto, removePhoto, setPrimaryPhoto,
  } = usePlantDetail(plantId)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const colors = plant ? getPlantColors(plant.taxonomic_type) : { bg: '#f1f5f9', fg: '#475569' }
  const Icon = plant ? getPlantIcon(plant.taxonomic_type) : null
  const photo = plant?.plant_media?.find(m => m.is_primary) ?? plant?.plant_media?.[0] ?? null

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
            <div
              className="w-28 h-28 rounded-2xl shrink-0 overflow-hidden flex items-center justify-center"
              style={{ backgroundColor: photo ? undefined : colors.bg }}
            >
              {photo
                ? <img src={photo.original_url} alt={primaryName(plant)} className="w-full h-full object-cover" />
                : Icon && <Icon size={40} color={colors.fg} />}
            </div>
            <div className="min-w-0 flex-1 pt-1">
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
            {plant.bloom_window_text && <span className="text-xs text-stone-400 italic">{plant.bloom_window_text}</span>}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-stone-400">Bloom start</span>
              <EditableField value={plant.bloom_start_md} placeholder="MM-DD" onSave={v => updatePlant({ bloom_start_md: v })} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-stone-400">Bloom end</span>
              <EditableField value={plant.bloom_end_md} placeholder="MM-DD" onSave={v => updatePlant({ bloom_end_md: v })} />
            </div>
          </div>

          {/* Foliage */}
          <SectionLabel>Foliage</SectionLabel>
          <div className="flex flex-wrap gap-2 mt-3 items-center">
            <Pill><EditableTags values={plant.leaf_color} onSave={v => updatePlant({ leaf_color: v })} /></Pill>
            <Pill><EditableTags values={plant.deciduous_fall_color} onSave={v => updatePlant({ deciduous_fall_color: v })} /></Pill>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-stone-400">Render color</span>
              <EditableField value={plant.foliage_color} placeholder="e.g. Green" onSave={v => updatePlant({ foliage_color: v })} />
            </div>
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
