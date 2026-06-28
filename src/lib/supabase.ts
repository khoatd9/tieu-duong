import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type MealType = 'khi_doi' | 'sau_sang' | 'sau_trua' | 'sau_toi'

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  khi_doi: 'Khi đói',
  sau_sang: 'Sau ăn sáng 2h',
  sau_trua: 'Sau ăn trưa 2h',
  sau_toi: 'Sau ăn tối 2h',
}

export type Reading = {
  id: string
  name: string
  value: number
  time: string
  type: MealType
}
