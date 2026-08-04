import { PlantDetail } from '../types'

export function primaryName(p: PlantDetail): string {
  return p.plant_common_names?.find(n => n.is_primary)?.name
    ?? p.plant_common_names?.[0]?.name
    ?? [p.genus, p.species, p.cultivar ? `'${p.cultivar}'` : null].filter(Boolean).join(' ')
}

export function scientificName(p: PlantDetail): string {
  return [p.genus, p.species, p.cultivar ? `'${p.cultivar}'` : null].filter(Boolean).join(' ')
}

export function ft(min: number | null, max: number | null, unit = '′') {
  if (!min && !max) return '—'
  if (min === max || !max) return `${min}${unit}`
  if (!min) return `up to ${max}${unit}`
  return `${min}–${max}${unit}`
}
