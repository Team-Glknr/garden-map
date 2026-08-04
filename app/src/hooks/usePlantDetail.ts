import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PlantDetail, PlantMedia, PlantPestDisease, PlantPronunciation, PlantRelationship, PlantWoodyDetails, PlantHerbaceousDetails } from '../types'

const PLANT_SELECT = `
  id, genus, species, cultivar, family, taxonomic_type, description, life_cycle,
  height_min_ft, height_max_ft, spread_min_ft, spread_max_ft, spacing_min_ft, spacing_max_ft,
  light, soil_texture, soil_drainage, soil_ph, watering_need, growth_rate, maintenance,
  usda_hardiness_zone_min, usda_hardiness_zone_max,
  flower_color, bloom_seasons, bloom_window_text, bloom_start_md, bloom_end_md,
  leaf_color, deciduous_fall_color, foliage_color, dieback_start_md, regrowth_start_md,
  attracts, wildlife_value, ecological_tags,
  habit_form, country_of_origin, texture, insect_disease_problems, particularly_resistant_to,
  flower_inflorescence, flower_shape, flower_size_min_in, flower_size_max_in,
  flower_petals_min, flower_petals_max, flower_value, flower_description,
  fruit_color, fruit_type, fruit_length_min_in, fruit_length_max_in,
  fruit_width_min_in, fruit_width_max_in, fruit_value, fruit_harvest_time, fruit_description,
  leaf_feel, leaf_type, leaf_arrangement, leaf_shape, leaf_margin,
  leaf_length_min_in, leaf_length_max_in, leaf_width_min_in, leaf_width_max_in,
  hairs_present, leaf_value, leaf_description,
  poisonous_to_humans, poisonous_to_pets, medicinal, edible_fruit, edible_leaf,
  landscape_location, landscape_theme, design_feature, resistance_to_challenges, play_value, fire_risk,
  stem_color, stem_form, stem_surface, stem_is_aromatic, stem_description,
  plant_common_names(id, name, is_primary),
  plant_media(id, original_url, caption, photographer, license_name, license_url, is_primary),
  plant_synonyms(id, synonym),
  plant_pronunciations(phonetic_spelling, audio_url),
  plant_state_distribution(state_code),
  plant_woody_details(woody_leaf_characteristics, bark_color, bark_surface, bark_description),
  plant_herbaceous_details(propagation_strategy),
  plant_pest_disease(id, entry_type, name, link_url),
  plant_relationships!plant_relationships_plant_id_fkey(id, relationship_type, related_name_text, related_plant_id)
`

const PHOTO_BUCKET = 'plant-photos'
const PUBLIC_PHOTO_PREFIX = `/storage/v1/object/public/${PHOTO_BUCKET}/`

async function resizeToWebp(file: File, maxDim = 800, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Image conversion failed'))), 'image/webp', quality)
  })
}

// Best-effort match against existing plants, so a typed relationship gets
// linked when it clearly refers to a plant already in the database.
async function resolveRelatedPlantId(text: string): Promise<string | null> {
  const trimmed = text.trim()
  if (!trimmed) return null

  const { data: byName } = await supabase
    .from('plant_common_names')
    .select('plant_id')
    .ilike('name', trimmed)
    .limit(1)
  if (byName && byName.length) return byName[0].plant_id

  const parts = trimmed.split(' ')
  if (parts.length >= 2) {
    const { data: byBinomial } = await supabase
      .from('plants')
      .select('id')
      .ilike('genus', parts[0])
      .ilike('species', parts.slice(1).join(' '))
      .limit(1)
    if (byBinomial && byBinomial.length) return byBinomial[0].id
  }
  return null
}

export function usePlantDetail(plantId: string | null) {
  const [plant, setPlant] = useState<PlantDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!plantId) { setPlant(null); return }
    setLoading(true)
    supabase
      .from('plants')
      .select(PLANT_SELECT)
      .eq('id', plantId)
      .single()
      .then(({ data }) => {
        setPlant(data as unknown as PlantDetail)
        setLoading(false)
      })
  }, [plantId])

  async function updatePlant(fields: Partial<PlantDetail>) {
    if (!plantId || !plant) return
    const { error } = await supabase.from('plants').update(fields).eq('id', plantId)
    if (!error) setPlant(prev => prev ? { ...prev, ...fields } : null)
  }

  // ── Common names ─────────────────────────────────────────────────────────

  async function addCommonName(name: string) {
    if (!plantId || !plant || !name.trim()) return
    const isPrimary = plant.plant_common_names.length === 0
    const { data, error } = await supabase
      .from('plant_common_names')
      .insert({ plant_id: plantId, name: name.trim(), is_primary: isPrimary })
      .select('id, name, is_primary')
      .single()
    if (error) throw error
    setPlant(prev => prev ? { ...prev, plant_common_names: [...prev.plant_common_names, data] } : null)
  }

  async function removeCommonName(id: string) {
    if (!plantId) return
    const { error } = await supabase.from('plant_common_names').delete().eq('id', id)
    if (error) throw error
    setPlant(prev => prev ? { ...prev, plant_common_names: prev.plant_common_names.filter(n => n.id !== id) } : null)
  }

  async function setPrimaryCommonName(id: string) {
    if (!plantId) return
    await supabase.from('plant_common_names').update({ is_primary: false }).eq('plant_id', plantId)
    const { error } = await supabase.from('plant_common_names').update({ is_primary: true }).eq('id', id)
    if (error) throw error
    setPlant(prev => prev
      ? { ...prev, plant_common_names: prev.plant_common_names.map(n => ({ ...n, is_primary: n.id === id })) }
      : null)
  }

  // ── Photos ───────────────────────────────────────────────────────────────

  async function addPhoto(file: File) {
    if (!plantId || !plant) return
    const webp = await resizeToWebp(file)
    const path = `${plantId}/${crypto.randomUUID()}.webp`
    const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(path, webp, {
      contentType: 'image/webp',
    })
    if (uploadError) throw uploadError
    const { data: { publicUrl } } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path)
    const isPrimary = plant.plant_media.length === 0
    const { data, error } = await supabase
      .from('plant_media')
      .insert({ plant_id: plantId, media_type: 'image', original_url: publicUrl, is_primary: isPrimary, source: 'manual' })
      .select('id, original_url, caption, photographer, license_name, license_url, is_primary')
      .single()
    if (error) throw error
    setPlant(prev => prev ? { ...prev, plant_media: [...prev.plant_media, data as PlantMedia] } : null)
  }

  async function removePhoto(media: PlantMedia) {
    if (!plantId) return
    const idx = media.original_url.indexOf(PUBLIC_PHOTO_PREFIX)
    if (idx !== -1) {
      const path = media.original_url.slice(idx + PUBLIC_PHOTO_PREFIX.length)
      await supabase.storage.from(PHOTO_BUCKET).remove([path])
    }
    const { error } = await supabase.from('plant_media').delete().eq('id', media.id)
    if (error) throw error
    const wasPrimary = media.is_primary
    setPlant(prev => {
      if (!prev) return null
      const remaining = prev.plant_media.filter(m => m.id !== media.id)
      if (wasPrimary && remaining.length > 0 && !remaining.some(m => m.is_primary)) {
        remaining[0] = { ...remaining[0], is_primary: true }
        supabase.from('plant_media').update({ is_primary: true }).eq('id', remaining[0].id)
      }
      return { ...prev, plant_media: remaining }
    })
  }

  async function setPrimaryPhoto(id: string) {
    if (!plantId) return
    await supabase.from('plant_media').update({ is_primary: false }).eq('plant_id', plantId)
    const { error } = await supabase.from('plant_media').update({ is_primary: true }).eq('id', id)
    if (error) throw error
    setPlant(prev => prev
      ? { ...prev, plant_media: prev.plant_media.map(m => ({ ...m, is_primary: m.id === id })) }
      : null)
  }

  // ── Synonyms ─────────────────────────────────────────────────────────────

  async function addSynonym(text: string) {
    if (!plantId || !text.trim()) return
    const { data, error } = await supabase
      .from('plant_synonyms')
      .insert({ plant_id: plantId, synonym: text.trim() })
      .select('id, synonym')
      .single()
    if (error) throw error
    setPlant(prev => prev ? { ...prev, plant_synonyms: [...prev.plant_synonyms, data] } : null)
  }

  async function removeSynonym(id: string) {
    if (!plantId) return
    const { error } = await supabase.from('plant_synonyms').delete().eq('id', id)
    if (error) throw error
    setPlant(prev => prev ? { ...prev, plant_synonyms: prev.plant_synonyms.filter(s => s.id !== id) } : null)
  }

  // ── Pronunciation ────────────────────────────────────────────────────────

  async function updatePronunciation(fields: Partial<PlantPronunciation>) {
    if (!plantId || !plant) return
    const current = plant.plant_pronunciations ?? { phonetic_spelling: null, audio_url: null }
    const merged = { ...current, ...fields }
    const { error } = await supabase
      .from('plant_pronunciations')
      .upsert({ plant_id: plantId, ...merged }, { onConflict: 'plant_id' })
    if (error) throw error
    setPlant(prev => prev ? { ...prev, plant_pronunciations: merged } : null)
  }

  // ── State distribution ───────────────────────────────────────────────────

  async function addStateCode(code: string) {
    if (!plantId) return
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length !== 2) return
    const { error } = await supabase.from('plant_state_distribution').insert({ plant_id: plantId, state_code: trimmed })
    if (error) throw error
    setPlant(prev => prev ? { ...prev, plant_state_distribution: [...prev.plant_state_distribution, { state_code: trimmed }] } : null)
  }

  async function removeStateCode(code: string) {
    if (!plantId) return
    const { error } = await supabase.from('plant_state_distribution').delete().eq('plant_id', plantId).eq('state_code', code)
    if (error) throw error
    setPlant(prev => prev ? { ...prev, plant_state_distribution: prev.plant_state_distribution.filter(s => s.state_code !== code) } : null)
  }

  // ── Woody / herbaceous details ───────────────────────────────────────────

  async function updateWoodyDetails(fields: Partial<PlantWoodyDetails>) {
    if (!plantId || !plant) return
    const current = plant.plant_woody_details ?? { woody_leaf_characteristics: null, bark_color: null, bark_surface: null, bark_description: null }
    const merged = { ...current, ...fields }
    const { error } = await supabase.from('plant_woody_details').upsert({ plant_id: plantId, ...merged }, { onConflict: 'plant_id' })
    if (error) throw error
    setPlant(prev => prev ? { ...prev, plant_woody_details: merged } : null)
  }

  async function updateHerbaceousDetails(fields: Partial<PlantHerbaceousDetails>) {
    if (!plantId || !plant) return
    const current = plant.plant_herbaceous_details ?? { propagation_strategy: null }
    const merged = { ...current, ...fields }
    const { error } = await supabase.from('plant_herbaceous_details').upsert({ plant_id: plantId, ...merged }, { onConflict: 'plant_id' })
    if (error) throw error
    setPlant(prev => prev ? { ...prev, plant_herbaceous_details: merged } : null)
  }

  // ── Pests & diseases ─────────────────────────────────────────────────────

  async function addPestDisease(entry_type: 'pest' | 'disease', name: string) {
    if (!plantId || !name.trim()) return
    const { data, error } = await supabase
      .from('plant_pest_disease')
      .insert({ plant_id: plantId, entry_type, name: name.trim() })
      .select('id, entry_type, name, link_url')
      .single()
    if (error) throw error
    setPlant(prev => prev ? { ...prev, plant_pest_disease: [...prev.plant_pest_disease, data as PlantPestDisease] } : null)
  }

  async function removePestDisease(id: string) {
    if (!plantId) return
    const { error } = await supabase.from('plant_pest_disease').delete().eq('id', id)
    if (error) throw error
    setPlant(prev => prev ? { ...prev, plant_pest_disease: prev.plant_pest_disease.filter(p => p.id !== id) } : null)
  }

  // ── Relationships ────────────────────────────────────────────────────────

  async function addRelationship(relationship_type: PlantRelationship['relationship_type'], text: string) {
    if (!plantId || !text.trim()) return
    const related_plant_id = await resolveRelatedPlantId(text)
    const { data, error } = await supabase
      .from('plant_relationships')
      .insert({ plant_id: plantId, relationship_type, related_name_text: text.trim(), related_plant_id })
      .select('id, relationship_type, related_name_text, related_plant_id')
      .single()
    if (error) throw error
    setPlant(prev => prev ? { ...prev, plant_relationships: [...prev.plant_relationships, data as PlantRelationship] } : null)
  }

  async function removeRelationship(id: string) {
    if (!plantId) return
    const { error } = await supabase.from('plant_relationships').delete().eq('id', id)
    if (error) throw error
    setPlant(prev => prev ? { ...prev, plant_relationships: prev.plant_relationships.filter(r => r.id !== id) } : null)
  }

  return {
    plant, loading, updatePlant,
    addCommonName, removeCommonName, setPrimaryCommonName,
    addPhoto, removePhoto, setPrimaryPhoto,
    addSynonym, removeSynonym,
    updatePronunciation,
    addStateCode, removeStateCode,
    updateWoodyDetails, updateHerbaceousDetails,
    addPestDisease, removePestDisease,
    addRelationship, removeRelationship,
  }
}
