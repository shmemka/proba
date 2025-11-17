import { createClient } from '@supabase/supabase-js'

// Получаем переменные окружения
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Проверяем, настроен ли Supabase
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

// Создаем клиент только если переменные настроены
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null

// Вспомогательная функция для получения клиента
export function getSupabaseClient() {
  if (!supabase) {
    console.warn('⚠️ Supabase не настроен. Используется localStorage.')
    return null
  }
  return supabase
}

// Типы для базы данных
export interface Database {
  public: {
    Tables: {
      specialists: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          specialization: string
          bio: string
          telegram: string
          avatar_url: string
          show_in_search: boolean
          portfolio: any
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['specialists']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['specialists']['Insert']>
      }
      companies: {
        Row: {
          id: string
          email: string
          company_name: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['companies']['Insert']>
      }
      projects: {
        Row: {
          id: string
          company_id: string
          title: string
          description: string
          full_description: string
          specialization: string
          skills: string[]
          location: string
          deadline: string | null
          budget: string
          timeline: string
          requirements: string[]
          deliverables: string[]
          status: 'open' | 'closed' | 'in_progress' | 'completed'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
      }
      applications: {
        Row: {
          id: string
          project_id: string
          specialist_id: string
          message: string
          status: 'pending' | 'accepted' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['applications']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['applications']['Insert']>
      }
    }
  }
}
