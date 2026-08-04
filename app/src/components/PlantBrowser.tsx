import { useEffect, useMemo, useState } from 'react'
import { Search, ArrowUpDown, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getPlantIcon, getPlantColors } from '../lib/plantIcons'
import { PlantDetailPage } from './PlantDetailPage'
import {
  FACET_DEFS, FacetFilters, FacetPlant, ZONE_MIN, ZONE_MAX,
  buildFacetGroups, plantMatchesFacets, plantMatchesZone, facetSwatch,
} from '../lib/plantFacets'

interface PlantRow extends FacetPlant {
  genus: string
  species: string | null
  cultivar: string | null
  height_min_ft: number | null
  plant_common_names: { name: string; is_primary: boolean }[]
  plant_media: { original_url: string; is_primary: boolean }[]
}

// Plant columns only — no joined tables. plant_common_names/plant_media are
// fetched separately and merged in JS (see fetchAllPlants below): joining
// them here makes every page of the paginated plants query pay for a nested
// aggregate, and that cost grows with OFFSET until it blows the statement
// timeout on later pages.
const PLANT_COLS = `
  id, genus, species, cultivar, taxonomic_type, life_cycle,
  height_min_ft, height_max_ft,
  light, soil_texture, soil_drainage, soil_ph,
  bloom_seasons, flower_color, attracts, maintenance, growth_rate,
  usda_hardiness_zone_min, usda_hardiness_zone_max
`

const PAGE_SIZE = 1000

// Supabase's PostgREST caps every response at PAGE_SIZE rows regardless of
// the requested .range(), so pull each table in pages and concatenate.
async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await page(offset, offset + PAGE_SIZE - 1)
    if (error || !data) break
    rows.push(...data)
    if (data.length < PAGE_SIZE) break
  }
  return rows
}

async function fetchAllPlants(): Promise<PlantRow[]> {
  const [plants, names, media] = await Promise.all([
    fetchAllRows<Omit<PlantRow, 'plant_common_names' | 'plant_media'>>((from, to) =>
      supabase.from('plants').select(PLANT_COLS).order('genus').range(from, to) as any),
    fetchAllRows<{ plant_id: string; name: string; is_primary: boolean }>((from, to) =>
      supabase.from('plant_common_names').select('plant_id, name, is_primary').range(from, to)),
    fetchAllRows<{ plant_id: string; original_url: string; is_primary: boolean }>((from, to) =>
      supabase.from('plant_media').select('plant_id, original_url, is_primary').range(from, to)),
  ])

  const namesByPlant = new Map<string, { name: string; is_primary: boolean }[]>()
  for (const n of names) {
    const arr = namesByPlant.get(n.plant_id) ?? []
    arr.push({ name: n.name, is_primary: n.is_primary })
    namesByPlant.set(n.plant_id, arr)
  }
  const mediaByPlant = new Map<string, { original_url: string; is_primary: boolean }[]>()
  for (const m of media) {
    const arr = mediaByPlant.get(m.plant_id) ?? []
    arr.push({ original_url: m.original_url, is_primary: m.is_primary })
    mediaByPlant.set(m.plant_id, arr)
  }

  return plants.map(p => ({
    ...p,
    plant_common_names: namesByPlant.get(p.id) ?? [],
    plant_media: mediaByPlant.get(p.id) ?? [],
  }))
}

const SORTS = [
  { key: 'name', label: 'Name (A–Z)' },
  { key: 'name-desc', label: 'Name (Z–A)' },
  { key: 'type', label: 'Plant Type' },
] as const
type SortKey = typeof SORTS[number]['key']

const DEFAULT_EXPANDED: Record<string, boolean> = { plantType: true, light: true }

function displayName(p: PlantRow): string {
  const primary = p.plant_common_names?.find(n => n.is_primary)?.name ?? p.plant_common_names?.[0]?.name
  return primary ?? [p.genus, p.species, p.cultivar ? `'${p.cultivar}'` : null].filter(Boolean).join(' ')
}

function scientificName(p: PlantRow): string {
  return [p.genus, p.species, p.cultivar ? `'${p.cultivar}'` : null].filter(Boolean).join(' ')
}

function primaryPhoto(p: PlantRow): string | null {
  return p.plant_media?.find(m => m.is_primary)?.original_url ?? p.plant_media?.[0]?.original_url ?? null
}

function heightLabel(p: PlantRow): string {
  const { height_min_ft: min, height_max_ft: max } = p
  if (!min && !max) return '—'
  if (min === max || !max) return `${min}′`
  if (!min) return `up to ${max}′`
  return `${min}–${max}′`
}

function sortPlants(rows: PlantRow[], sortKey: SortKey): PlantRow[] {
  const sorted = [...rows]
  switch (sortKey) {
    case 'name':
      return sorted.sort((a, b) => displayName(a).localeCompare(displayName(b)))
    case 'name-desc':
      return sorted.sort((a, b) => displayName(b).localeCompare(displayName(a)))
    case 'type':
      return sorted.sort((a, b) => a.taxonomic_type.localeCompare(b.taxonomic_type) || displayName(a).localeCompare(displayName(b)))
  }
}

export function PlantBrowser() {
  const [allPlants, setAllPlants] = useState<PlantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [filters, setFilters] = useState<FacetFilters>({})
  const [zone, setZone] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>(DEFAULT_EXPANDED)
  const [zoneExpanded, setZoneExpanded] = useState(false)
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchAllPlants().then(rows => {
      if (!cancelled) {
        setAllPlants(rows)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  const facetGroups = useMemo(() => buildFacetGroups(allPlants), [allPlants])

  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = allPlants.filter(p => {
      if (!plantMatchesFacets(p, filters)) return false
      if (!plantMatchesZone(p, zone)) return false
      if (q && !displayName(p).toLowerCase().includes(q) && !scientificName(p).toLowerCase().includes(q)) return false
      return true
    })
    return sortPlants(list, sortKey)
  }, [allPlants, filters, zone, query, sortKey])

  function toggleFacet(key: string, value: string) {
    setFilters(prev => {
      const cur = prev[key] ?? []
      const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]
      const copy = { ...prev }
      if (next.length) copy[key] = next
      else delete copy[key]
      return copy
    })
  }

  function clearAll() {
    setFilters({})
    setZone(null)
    setQuery('')
  }

  const chips = useMemo(() => {
    const out: { key: string; label: string; onRemove: () => void }[] = []
    for (const def of FACET_DEFS) {
      for (const v of filters[def.key] ?? []) {
        out.push({ key: `${def.key}:${v}`, label: `${def.label}: ${v}`, onRemove: () => toggleFacet(def.key, v) })
      }
    }
    if (zone != null) out.push({ key: 'zone', label: `Zone: ${zone}`, onRemove: () => setZone(null) })
    return out
  }, [filters, zone])

  const selectedIndex = selectedPlantId != null ? filteredResults.findIndex(p => p.id === selectedPlantId) : -1

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar: facet filters */}
      <div className="w-64 shrink-0 border-r border-stone-200 bg-white flex flex-col overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 shrink-0">
          <span className="text-xs font-bold uppercase tracking-wide text-stone-500">Filters</span>
          <button onClick={clearAll} className="text-xs font-medium text-green-700 hover:underline">Clear all</button>
        </div>

        {facetGroups.map(group => {
          const selected = filters[group.key] ?? []
          const isExpanded = !!expanded[group.key]
          return (
            <div key={group.key} className="border-b border-stone-100 shrink-0">
              <button
                onClick={() => setExpanded(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-xs font-bold text-stone-700">{group.label}</span>
                <span className="text-stone-400 text-sm">{isExpanded ? '−' : '+'}</span>
              </button>
              {isExpanded && (
                <div className="px-4 pb-3 flex flex-col gap-1.5">
                  {group.options.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.includes(opt.value)}
                        onChange={() => toggleFacet(group.key, opt.value)}
                        className="accent-green-600 w-3.5 h-3.5 shrink-0"
                      />
                      {group.swatch && (
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-stone-200 shrink-0"
                          style={{ backgroundColor: facetSwatch(opt.value) }}
                        />
                      )}
                      <span className="flex-1 truncate">{opt.value}</span>
                      <span className="text-[10px] text-stone-400">{opt.count}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        <div className="px-4 py-3 border-b border-stone-100 shrink-0">
          <button
            onClick={() => setZoneExpanded(v => !v)}
            className="w-full flex items-center justify-between text-left mb-2"
          >
            <span className="text-xs font-bold text-stone-700">USDA Hardiness Zone</span>
            <span className="text-stone-400 text-sm">{zoneExpanded ? '−' : '+'}</span>
          </button>
          {zoneExpanded && (
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: ZONE_MAX - ZONE_MIN + 1 }, (_, i) => ZONE_MIN + i).map(z => {
                const active = zone === z
                return (
                  <button
                    key={z}
                    onClick={() => setZone(active ? null : z)}
                    className={`w-7 h-7 rounded-md text-[11px] font-bold border transition-colors ${
                      active ? 'bg-green-600 text-white border-green-600' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    {z}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Library: search + sort + chips + card grid */}
      <div className="flex-1 flex flex-col overflow-hidden bg-stone-50 min-w-0">
        {/* Controls */}
        <div className="bg-white border-b border-stone-200 px-4 py-2.5 flex items-center gap-3 flex-wrap shrink-0">
          <div className="relative w-64 shrink-0">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or genus…"
              className="w-full pl-6 pr-2 py-1.5 text-sm border border-stone-200 rounded focus:outline-none focus:border-green-400"
            />
          </div>

          <div className="ml-auto flex items-center gap-3 shrink-0">
            <span className="text-xs text-stone-400 whitespace-nowrap">
              {loading ? 'Loading…' : `${filteredResults.length} of ${allPlants.length} plants`}
            </span>
            <div className="flex items-center gap-1.5">
              <ArrowUpDown size={12} className="text-stone-400" />
              <select
                value={sortKey}
                onChange={e => setSortKey(e.target.value as SortKey)}
                className="text-xs border border-stone-200 rounded px-1.5 py-1 text-stone-600 focus:outline-none focus:border-green-400 bg-white"
              >
                {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Active filter chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-3 shrink-0">
            {chips.map(chip => (
              <button
                key={chip.key}
                onClick={chip.onRemove}
                className="flex items-center gap-1.5 text-[11px] font-medium bg-green-50 text-green-800 border border-green-200 rounded-full px-2.5 py-1 hover:bg-green-100"
              >
                {chip.label}
                <X size={9} />
              </button>
            ))}
          </div>
        )}

        {/* Card grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredResults.length === 0 && !loading && (
            <div className="text-center py-16">
              <p className="text-sm text-stone-400 mb-3">No plants match your filters.</p>
              <button onClick={clearAll} className="text-xs font-medium border border-stone-200 rounded px-3 py-1.5 hover:bg-white">
                Clear filters
              </button>
            </div>
          )}
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
            {filteredResults.map(p => {
              const colors = getPlantColors(p.taxonomic_type)
              const Icon = getPlantIcon(p.taxonomic_type)
              const name = displayName(p)
              const sci = scientificName(p)
              const photo = primaryPhoto(p)
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlantId(p.id)}
                  className="text-left bg-white border border-stone-200 rounded-lg p-3 transition-all flex flex-col gap-2 hover:border-stone-300 hover:shadow-sm"
                >
                  <div className="relative w-full aspect-[4/3] rounded-md overflow-hidden bg-stone-100 flex items-center justify-center shrink-0">
                    {photo ? (
                      <img src={photo} alt={name} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <span
                        className="flex items-center justify-center w-9 h-9 rounded-full"
                        style={{ backgroundColor: colors.bg, color: colors.fg }}
                      >
                        <Icon size={18} />
                      </span>
                    )}
                    <span
                      className="absolute top-1 right-1 text-[9px] font-medium px-1.5 py-0.5 rounded shrink-0"
                      style={photo
                        ? { backgroundColor: 'rgba(255,255,255,0.9)', color: colors.fg }
                        : { backgroundColor: colors.bg, color: colors.fg }}
                    >
                      {p.taxonomic_type}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-700 truncate">{name}</p>
                    {sci !== name && (
                      <p className="text-[11px] text-stone-400 italic truncate">{sci}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-stone-500 mt-auto pt-1 border-t border-stone-50">
                    <span>{heightLabel(p)}</span>
                    {p.light?.[0] && (
                      <span className="truncate">{p.light[0]}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Full-page detail overlay */}
      {selectedPlantId && (
        <PlantDetailPage
          plantId={selectedPlantId}
          index={selectedIndex}
          total={selectedIndex !== -1 ? filteredResults.length : 0}
          onPrev={selectedIndex > 0 ? () => setSelectedPlantId(filteredResults[selectedIndex - 1].id) : null}
          onNext={selectedIndex !== -1 && selectedIndex < filteredResults.length - 1 ? () => setSelectedPlantId(filteredResults[selectedIndex + 1].id) : null}
          onClose={() => setSelectedPlantId(null)}
          onSelectPlant={setSelectedPlantId}
        />
      )}
    </div>
  )
}
