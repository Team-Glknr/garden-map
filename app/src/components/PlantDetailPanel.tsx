import { X, Star, Trash2 } from 'lucide-react'
import { usePlantDetail } from '../hooks/usePlantDetail'
import { getPlantColors } from '../lib/plantIcons'
import { primaryName, scientificName } from '../lib/plantDisplay'
import {
  EditableField, EditableTextarea, EditableTags, EditableNumberRange,
  PhotoManager, CommonNameAdd, LIGHT_OPTIONS, SEASON_OPTIONS,
} from './plant-edit-controls'
import { Planting } from '../types'

interface Props {
  plantId: string
  planting?: Planting
  onUpdatePlanting?: (fields: { planted_date?: string | null; custom_label?: string | null; notes?: string | null }) => void
  onRemovePlanting?: () => void
  onClose: () => void
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
