import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PlantDetail, PlantMedia } from '../types'

const PLANT_SELECT = `
  id, genus, species, cultivar, family, taxonomic_type, description, life_cycle,
  height_min_ft, height_max_ft, spread_min_ft, spread_max_ft, spacing_min_ft, spacing_max_ft,
  light, soil_texture, soil_drainage, soil_ph, watering_need, growth_rate, maintenance,
  usda_hardiness_zone_min, usda_hardiness_zone_max,
  flower_color, bloom_seasons, bloom_window_text, bloom_start_md, bloom_end_md,
  leaf_color, deciduous_fall_color, foliage_color, dieback_start_md, regrowth_start_md,
  attracts, wildlife_value, ecological_tags,
  plant_common_names(id, name, is_primary),
  plant_media(id, original_url, caption, photographer, license_name, license_url, is_primary)
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
        setPlant(data as PlantDetail)
        setLoading(false)
      })
  }, [plantId])

  async function updatePlant(fields: Partial<PlantDetail>) {
    if (!plantId || !plant) return
    const { error } = await supabase.from('plants').update(fields).eq('id', plantId)
    if (!error) setPlant(prev => prev ? { ...prev, ...fields } : null)
  }

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

  return {
    plant, loading, updatePlant,
    addCommonName, removeCommonName, setPrimaryCommonName,
    addPhoto, removePhoto, setPrimaryPhoto,
  }
}
