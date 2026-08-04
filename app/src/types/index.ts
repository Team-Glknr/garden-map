export interface Yard {
  id: string
  user_id: string
  name: string
  width_cells: number
  height_cells: number
  cell_size_inches: number
}

export interface GridCell {
  id: string
  yard_id: string
  row: number
  col: number
  elevation: number | null
  water_flow_direction: string | null
  shade_level: string | null
}

export type ShadeValue =
  | 'full_sun'
  | 'shade_1' | 'shade_1_am' | 'shade_1_pm'
  | 'shade_2' | 'shade_2_am' | 'shade_2_pm'
  | 'shade_3' | 'shade_3_am' | 'shade_3_pm'
  | 'shade_4'

export type ShadeMap = Map<string, ShadeValue>

export interface PlantDetail {
  id: string
  genus: string
  species: string | null
  cultivar: string | null
  family: string | null
  taxonomic_type: string
  description: string | null
  life_cycle: string | null
  height_min_ft: number | null
  height_max_ft: number | null
  spread_min_ft: number | null
  spread_max_ft: number | null
  spacing_min_ft: number | null
  spacing_max_ft: number | null
  light: string[] | null
  soil_texture: string[] | null
  soil_drainage: string[] | null
  soil_ph: string[] | null
  watering_need: string | null
  growth_rate: string | null
  maintenance: string | null
  usda_hardiness_zone_min: number | null
  usda_hardiness_zone_max: number | null
  flower_color: string[] | null
  bloom_seasons: string[] | null
  bloom_window_text: string | null
  bloom_start_md: string | null
  bloom_end_md: string | null
  leaf_color: string[] | null
  deciduous_fall_color: string[] | null
  foliage_color: string | null
  dieback_start_md: string | null
  regrowth_start_md: string | null
  attracts: string[] | null
  wildlife_value: string | null
  ecological_tags: string[] | null

  // Identity / origin
  habit_form: string[] | null
  country_of_origin: string[] | null
  texture: string | null
  insect_disease_problems: string | null
  particularly_resistant_to: string[] | null

  // Flower detail
  flower_inflorescence: string | null
  flower_shape: string | null
  flower_size_min_in: number | null
  flower_size_max_in: number | null
  flower_petals_min: number | null
  flower_petals_max: number | null
  flower_value: string[] | null
  flower_description: string | null

  // Fruit
  fruit_color: string[] | null
  fruit_type: string | null
  fruit_length_min_in: number | null
  fruit_length_max_in: number | null
  fruit_width_min_in: number | null
  fruit_width_max_in: number | null
  fruit_value: string[] | null
  fruit_harvest_time: string | null
  fruit_description: string | null

  // Leaf detail
  leaf_feel: string[] | null
  leaf_type: string | null
  leaf_arrangement: string | null
  leaf_shape: string | null
  leaf_margin: string[] | null
  leaf_length_min_in: number | null
  leaf_length_max_in: number | null
  leaf_width_min_in: number | null
  leaf_width_max_in: number | null
  hairs_present: boolean | null
  leaf_value: string[] | null
  leaf_description: string | null

  // Safety / edibility
  poisonous_to_humans: boolean | null
  poisonous_to_pets: boolean | null
  medicinal: boolean | null
  edible_fruit: boolean | null
  edible_leaf: boolean | null

  // Landscape use
  landscape_location: string[] | null
  landscape_theme: string[] | null
  design_feature: string[] | null
  resistance_to_challenges: string[] | null
  play_value: string[] | null
  fire_risk: string | null

  // Stem
  stem_color: string[] | null
  stem_form: string | null
  stem_surface: string | null
  stem_is_aromatic: boolean | null
  stem_description: string | null

  plant_common_names: PlantCommonName[]
  plant_media: PlantMedia[]
  plant_synonyms: PlantSynonym[]
  // 1-to-1 with plants (plant_id is the primary key), so PostgREST embeds
  // these as a single object or null — not an array.
  plant_pronunciations: PlantPronunciation | null
  plant_state_distribution: PlantStateDistribution[]
  plant_woody_details: PlantWoodyDetails | null
  plant_herbaceous_details: PlantHerbaceousDetails | null
  plant_pest_disease: PlantPestDisease[]
  plant_relationships: PlantRelationship[]
}

export interface PlantCommonName {
  id: string
  name: string
  is_primary: boolean
}

export interface PlantMedia {
  id: string
  original_url: string
  caption: string | null
  photographer: string | null
  license_name: string | null
  license_url: string | null
  is_primary: boolean
}

export interface PlantSynonym {
  id: string
  synonym: string
}

export interface PlantPronunciation {
  phonetic_spelling: string | null
  audio_url: string | null
}

export interface PlantStateDistribution {
  state_code: string
}

export interface PlantWoodyDetails {
  woody_leaf_characteristics: string | null
  bark_color: string[] | null
  bark_surface: string | null
  bark_description: string | null
}

export interface PlantHerbaceousDetails {
  propagation_strategy: string[] | null
}

export interface PlantPestDisease {
  id: string
  entry_type: 'pest' | 'disease'
  name: string
  link_url: string | null
}

export interface PlantRelationship {
  id: string
  relationship_type: 'confused_with' | 'similar_to' | 'fills_niche' | 'native_alternative_for'
  related_name_text: string | null
  related_plant_id: string | null
}

export interface Plant {
  id: string
  genus: string
  species: string | null
  cultivar: string | null
  taxonomic_type: string
  display_name: string   // primary common name, or genus species if none
}

export interface Planting {
  id: string
  plant_id: string
  yard_id: string
  anchor_row: number
  anchor_col: number
  custom_label: string | null
  planted_date: string | null
  removed_date: string | null
  notes: string | null
  display_name: string
  taxonomic_type: string
  spread_max_ft: number | null
  growth_rate: string | null
  // Seasonal fields (from plants join)
  flower_color: string[] | null
  bloom_seasons: string[] | null
  bloom_start_md: string | null
  bloom_end_md: string | null
  leaf_color: string[] | null
  deciduous_fall_color: string[] | null
  life_cycle: string | null
}

// Structures: geometry and metadata for drawn objects
export type StructureKind = 'patio' | 'shed' | 'pergola' | 'path' | 'fountain' | 'deck' | 'other'
export type ShapeType = 'rectangle' | 'polygon' | 'polyline' | 'point'
export type CompassSide = 'N' | 'E' | 'S' | 'W'

export interface GridPoint {
  row: number
  col: number
}

export interface RectangleGeometry {
  shape: 'rectangle'
  anchor: GridPoint
  width: number
  height: number
  rotation?: number
}

export interface PolygonGeometry {
  shape: 'polygon'
  points: GridPoint[]
}

export interface PolylineGeometry {
  shape: 'polyline'
  points: GridPoint[]
  strokeWidth?: number
}

export interface PointGeometry {
  shape: 'point'
  point: GridPoint
}

export type StructureGeometry = RectangleGeometry | PolygonGeometry | PolylineGeometry | PointGeometry

export type PlantOverlap = 'none' | 'partial' | 'full'

export interface Structure {
  id: string
  yard_id: string
  type: StructureKind
  name?: string
  geometry: StructureGeometry
  zIndex: number
  color?: string
  pattern?: string
  allowPlantOverlap?: PlantOverlap
  growUpSides?: CompassSide[]
  notes?: string
  created_at?: string
  updated_at?: string
  created_by?: string
  meta?: Record<string, any>
}
