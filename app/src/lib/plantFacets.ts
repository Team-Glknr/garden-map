import { NC_COLOR_MAP } from './plantSeasons'

export const NOT_SPECIFIED = 'Not specified'

export const ZONE_MIN = 1
export const ZONE_MAX = 13

// Long-tail taxonomic_type values (each <25 plants) collapse into "Other"
const MAIN_TAXONOMIC_TYPES = [
  'Herbaceous Perennial', 'Shrub', 'Tree', 'Annual', 'Ground Cover',
  'Bulb', 'Houseplant', 'Fern', 'Epiphyte', 'Ornamental Grass', 'Vine',
]

// Long-tail attracts values (each <30 plants) collapse into "Other wildlife"
const MAIN_ATTRACTS = [
  'Butterflies', 'Pollinators', 'Bees', 'Songbirds',
  'Small Mammals', 'Hummingbirds', 'Moths', 'Specialized Bees',
]

const HEIGHT_BUCKET_ORDER = ['Under 1 ft', '1–3 ft', '3–6 ft', '6–15 ft', '15–30 ft', '30 ft+', NOT_SPECIFIED]

export function heightBucket(heightMaxFt: number | null): string {
  if (heightMaxFt == null) return NOT_SPECIFIED
  if (heightMaxFt < 1) return 'Under 1 ft'
  if (heightMaxFt < 3) return '1–3 ft'
  if (heightMaxFt < 6) return '3–6 ft'
  if (heightMaxFt < 15) return '6–15 ft'
  if (heightMaxFt < 30) return '15–30 ft'
  return '30 ft+'
}

export interface FacetPlant {
  id: string
  taxonomic_type: string
  life_cycle: string | null
  height_max_ft: number | null
  light: string[] | null
  soil_texture: string[] | null
  soil_drainage: string[] | null
  soil_ph: string[] | null
  bloom_seasons: string[] | null
  flower_color: string[] | null
  attracts: string[] | null
  maintenance: string | null
  growth_rate: string | null
  usda_hardiness_zone_min: number | null
  usda_hardiness_zone_max: number | null
}

function tagsOrNotSpecified(values: string[] | null | undefined): string[] {
  return values && values.length ? values : [NOT_SPECIFIED]
}

export interface FacetDef {
  key: string
  label: string
  getTags: (p: FacetPlant) => string[]
  swatch?: boolean
  order?: string[]
}

export const FACET_DEFS: FacetDef[] = [
  {
    key: 'plantType',
    label: 'Plant Type',
    getTags: p => [MAIN_TAXONOMIC_TYPES.includes(p.taxonomic_type) ? p.taxonomic_type : 'Other'],
  },
  {
    key: 'light',
    label: 'Light',
    getTags: p => tagsOrNotSpecified(p.light),
  },
  {
    key: 'soilDrainage',
    label: 'Soil Drainage',
    getTags: p => tagsOrNotSpecified(p.soil_drainage),
  },
  {
    key: 'soilTexture',
    label: 'Soil Texture',
    getTags: p => tagsOrNotSpecified(p.soil_texture),
  },
  {
    key: 'soilPH',
    label: 'Soil pH',
    getTags: p => tagsOrNotSpecified(p.soil_ph),
  },
  {
    key: 'bloomSeason',
    label: 'Bloom Season',
    getTags: p => tagsOrNotSpecified(p.bloom_seasons),
  },
  {
    key: 'flowerColor',
    label: 'Flower Color',
    swatch: true,
    // "Insignificant" isn't a color — it means the plant isn't grown for its bloom
    getTags: p => {
      const colors = (p.flower_color ?? []).filter(c => c !== 'Insignificant')
      return colors.length ? colors : [NOT_SPECIFIED]
    },
  },
  {
    key: 'attracts',
    label: 'Attracts',
    getTags: p => {
      const raw = p.attracts ?? []
      if (!raw.length) return [NOT_SPECIFIED]
      return Array.from(new Set(raw.map(v => (MAIN_ATTRACTS.includes(v) ? v : 'Other wildlife'))))
    },
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    getTags: p => tagsOrNotSpecified(p.maintenance ? [p.maintenance] : null),
  },
  {
    key: 'growthRate',
    label: 'Growth Rate',
    getTags: p => tagsOrNotSpecified(p.growth_rate ? [p.growth_rate] : null),
  },
  {
    key: 'heightBucket',
    label: 'Height',
    order: HEIGHT_BUCKET_ORDER,
    getTags: p => [heightBucket(p.height_max_ft)],
  },
  {
    key: 'lifeCycle',
    label: 'Life Cycle',
    getTags: p => tagsOrNotSpecified(p.life_cycle ? [p.life_cycle] : null),
  },
]

export interface FacetOption {
  value: string
  count: number
}

export interface FacetGroup {
  key: string
  label: string
  swatch: boolean
  options: FacetOption[]
}

// Counts are computed once against the full dataset and don't narrow as
// filters are applied — matches the approved Phase 1 design (simpler, and
// what the Plants.dc mock already shows).
export function buildFacetGroups(plants: FacetPlant[]): FacetGroup[] {
  return FACET_DEFS.map(def => {
    const counts = new Map<string, number>()
    for (const p of plants) {
      for (const tag of def.getTags(p)) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }
    const options = Array.from(counts.entries()).map(([value, count]) => ({ value, count }))
    if (def.order) {
      const order = def.order
      options.sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value))
    } else {
      options.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
      options.sort((a, b) => (a.value === NOT_SPECIFIED ? 1 : 0) - (b.value === NOT_SPECIFIED ? 1 : 0))
    }
    return { key: def.key, label: def.label, swatch: !!def.swatch, options }
  })
}

export type FacetFilters = Record<string, string[]>

// OR within a facet group, AND across groups.
export function plantMatchesFacets(p: FacetPlant, filters: FacetFilters): boolean {
  for (const def of FACET_DEFS) {
    const selected = filters[def.key]
    if (selected && selected.length) {
      const tags = def.getTags(p)
      if (!selected.some(v => tags.includes(v))) return false
    }
  }
  return true
}

export function plantMatchesZone(p: FacetPlant, zone: number | null): boolean {
  if (zone == null) return true
  if (p.usda_hardiness_zone_min == null || p.usda_hardiness_zone_max == null) return false
  return zone >= p.usda_hardiness_zone_min && zone <= p.usda_hardiness_zone_max
}

export function facetSwatch(value: string): string {
  if (value === NOT_SPECIFIED) return '#d6d3d1'
  return NC_COLOR_MAP[value] ?? '#a8a29e'
}
