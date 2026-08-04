import { PlantDetail } from '../types'

type Nameable = Pick<PlantDetail, 'genus' | 'species' | 'cultivar' | 'plant_common_names'>

export function primaryName(p: Nameable): string {
  return p.plant_common_names?.find(n => n.is_primary)?.name
    ?? p.plant_common_names?.[0]?.name
    ?? [p.genus, p.species, p.cultivar ? `'${p.cultivar}'` : null].filter(Boolean).join(' ')
}

export function scientificName(p: Pick<PlantDetail, 'genus' | 'species' | 'cultivar'>): string {
  return [p.genus, p.species, p.cultivar ? `'${p.cultivar}'` : null].filter(Boolean).join(' ')
}

export function ft(min: number | null, max: number | null, unit = '′') {
  if (!min && !max) return '—'
  if (min === max || !max) return `${min}${unit}`
  if (!min) return `up to ${max}${unit}`
  return `${min}–${max}${unit}`
}
