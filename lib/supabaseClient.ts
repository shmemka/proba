import { createClient } from '@supabase/supabase-js'

// Получаем переменные окружения
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Проверяем, настроен ли Supabase
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

// Создаем клиент только если переменные настроены
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      },
    })
  : null

let hasLoggedSupabaseInit = false
let hasLoggedSupabaseWarning = false

// Вспомогательная функция для получения клиента
export function getSupabaseClient() {
  if (!supabase) {
    if (!hasLoggedSupabaseWarning) {
      hasLoggedSupabaseWarning = true
      console.warn('⚠️ Supabase не настроен. Используется localStorage.')
    }
    return null
  }

  if (!hasLoggedSupabaseInit) {
    hasLoggedSupabaseInit = true
    // Сообщение используется в чек-листе для быстрой проверки интеграции
    console.log('✅ Supabase клиент инициализирован')
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
          email: string | null
          first_name: string
          last_name: string
          specialization: string
          bio: string
          telegram: string
          avatar_url: string
          show_in_search: boolean
          portfolio: any
          portfolio_preview: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<
          Database['public']['Tables']['specialists']['Row'],
          'created_at' | 'updated_at' | 'portfolio_preview'
        > & {
          portfolio_preview?: string[] | null
        }
        Update: Partial<Database['public']['Tables']['specialists']['Insert']>
      }
      projects: {
        Row: {
          id: string
          user_id: string
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
