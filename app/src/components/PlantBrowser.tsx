import { useEffect, useMemo, useState } from 'react'
import { Search, ArrowUpDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getPlantIcon, getPlantColors } from '../lib/plantIcons'
import { PlantDetailPanel } from './PlantDetailPanel'

interface PlantRow {
  id: string
  genus: string
  species: string | null
  cultivar: string | null
  taxonomic_type: string
  height_min_ft: number | null
  height_max_ft: number | null
  light: string[] | null
  plant_common_names: { name: string; is_primary: boolean }[]
  plant_media: { original_url: string; is_primary: boolean }[]
}

const TYPES = ['Tree', 'Shrub', 'Herbaceous Perennial', 'Annual', 'Vine', 'Bulb', 'Fern', 'Ground Cover', 'Ornamental Grass']

const SORTS = [
  { key: 'name', label: 'Name (A–Z)' },
  { key: 'type', label: 'Type' },
  { key: 'height-asc', label: 'Height (low–high)' },
  { key: 'height-desc', label: 'Height (high–low)' },
  { key: 'light', label: 'Light' },
] as const
type SortKey = typeof SORTS[number]['key']

// Rough sort order so "Full Sun" sorts before "Full Shade", etc.
const LIGHT_ORDER = ['Full Sun', 'Full Sun to Partial Shade', 'Partial Shade', 'Partial Shade to Full Shade', 'Full Shade']

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
    case 'type':
      return sorted.sort((a, b) => a.taxonomic_type.localeCompare(b.taxonomic_type) || displayName(a).localeCompare(displayName(b)))
    case 'height-asc':
      return sorted.sort((a, b) => (a.height_max_ft ?? Infinity) - (b.height_max_ft ?? Infinity))
    case 'height-desc':
      return sorted.sort((a, b) => (b.height_max_ft ?? -Infinity) - (a.height_max_ft ?? -Infinity))
    case 'light':
      return sorted.sort((a, b) => {
        const la = LIGHT_ORDER.indexOf(a.light?.[0] ?? '')
        const lb = LIGHT_ORDER.indexOf(b.light?.[0] ?? '')
        return (la === -1 ? 99 : la) - (lb === -1 ? 99 : lb) || displayName(a).localeCompare(displayName(b))
      })
  }
}

export function PlantBrowser() {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [results, setResults] = useState<PlantRow[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    setSearching(true)
    const timer = setTimeout(async () => {
      const q = query.trim()
      const cols = 'id, genus, species, cultivar, taxonomic_type, height_min_ft, height_max_ft, light, plant_common_names(name, is_primary), plant_media(original_url, is_primary)'
      let request = supabase
        .from('plants')
        .select(cols)
        .order('genus')
        .limit(150)

      if (typeFilter) request = request.eq('taxonomic_type', typeFilter)

      if (q) {
        // Search common names, then merge genus matches
        const [cnRes, genusRes] = await Promise.all([
          supabase
            .from('plant_common_names')
            .select(`plant_id, name, plants!inner(${cols})`)
            .ilike('name', `%${q}%`)
            .limit(80),
          request.ilike('genus', `%${q}%`),
        ])

        const seen = new Set<string>()
        const plants: PlantRow[] = []

        for (const cn of (cnRes.data ?? []) as any[]) {
          const p = cn.plants
          if (!seen.has(p.id) && (!typeFilter || p.taxonomic_type === typeFilter)) {
            seen.add(p.id)
            plants.push(p)
          }
        }
        for (const p of (genusRes.data ?? []) as any[]) {
          if (!seen.has(p.id)) { seen.add(p.id); plants.push(p) }
        }
        setResults(plants.slice(0, 120))
      } else {
        const { data } = await request
        setResults((data ?? []) as PlantRow[])
      }

      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, typeFilter])

  const sortedResults = useMemo(() => sortPlants(results, sortKey), [results, sortKey])

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Library: search + filter + sort + card grid */}
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
            {searching && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-stone-300">…</span>}
          </div>

          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setTypeFilter(null)}
              className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${!typeFilter ? 'bg-stone-700 text-white border-stone-700' : 'border-stone-200 text-stone-500 hover:bg-stone-50'}`}
            >
              All
            </button>
            {TYPES.map(t => {
              const colors = getPlantColors(t)
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                  className="text-[10px] px-2 py-0.5 rounded border transition-colors"
                  style={typeFilter === t
                    ? { backgroundColor: colors.fg, color: 'white', borderColor: colors.fg }
                    : { backgroundColor: colors.bg, color: colors.fg, borderColor: 'transparent' }}
                >
                  {t.split(' ')[0]}
                </button>
              )
            })}
          </div>

          <div className="ml-auto flex items-center gap-1.5 shrink-0">
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

        {/* Card grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {sortedResults.length === 0 && !searching && (
            <p className="text-sm text-stone-400 text-center py-12">No plants found.</p>
          )}
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
            {sortedResults.map(p => {
              const colors = getPlantColors(p.taxonomic_type)
              const Icon = getPlantIcon(p.taxonomic_type)
              const isSelected = p.id === selectedId
              const name = displayName(p)
              const sci = scientificName(p)
              const photo = primaryPhoto(p)
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(isSelected ? null : p.id)}
                  className={`text-left bg-white border rounded-lg p-3 transition-all flex flex-col gap-2 ${
                    isSelected ? 'border-green-400 ring-2 ring-green-200' : 'border-stone-200 hover:border-stone-300 hover:shadow-sm'
                  }`}
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

        <div className="px-4 py-1.5 border-t border-stone-200 bg-white shrink-0">
          <span className="text-[10px] text-stone-400">{sortedResults.length} plant{sortedResults.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Detail panel */}
      {selectedId && (
        <PlantDetailPanel
          plantId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
