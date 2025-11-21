import { useCallback, useEffect, useState, useRef } from 'react'
import { getActiveUser, type StoredUser } from '@/lib/storage'
import { getCurrentUser, getSpecialist, isSupabaseAvailable } from '@/lib/supabase'
import { invalidateCache } from '@/lib/cache'
import { supabase } from '@/lib/supabaseClient'

export type AuthUser = {
  id: string
  email: string
  name?: string
  type?: 'specialist' | 'company'
  avatarUrl?: string
}

type RefreshOptions = {
  forceProfile?: boolean
}

const SUPABASE_AVAILABLE = isSupabaseAvailable()

const mapStoredUserToAuthUser = (storedUser: StoredUser): AuthUser => ({
  id: storedUser.id,
  email: storedUser.email,
  name: storedUser.name,
  type: storedUser.type,
})

// Throttle для предотвращения частых вызовов
let lastRefreshTime = 0
const REFRESH_THROTTLE_MS = 1000 // Минимум 1 секунда между вызовами

export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const refreshRef = useRef<((options?: RefreshOptions) => Promise<void>) | null>(null)
  const isRefreshingRef = useRef(false)

  const refresh = useCallback(
    async (options?: RefreshOptions) => {
      // Предотвращаем параллельные вызовы
      if (isRefreshingRef.current) {
        return
      }

      // Throttle для предотвращения частых вызовов
      const now = Date.now()
      if (!options?.forceProfile && now - lastRefreshTime < REFRESH_THROTTLE_MS) {
        return
      }
      lastRefreshTime = now

      isRefreshingRef.current = true
      setIsLoading(true)

      try {
        if (SUPABASE_AVAILABLE) {
          // Используем force только при явном запросе или при изменении auth state
          const supabaseUser = await getCurrentUser({ force: options?.forceProfile })

          if (!supabaseUser) {
            setUser(null)
            return
          }

          let avatarUrl = ''
          let displayName = ''

          // Пытаемся загрузить профиль специалиста (если есть) - один раз для всего
          try {
            const specialist = await getSpecialist(supabaseUser.id, { force: options?.forceProfile })
            avatarUrl = (specialist as any)?.avatar_url || ''
            
            // Получаем имя из профиля специалиста
            if (specialist && specialist.first_name) {
              const fullName = [specialist.first_name, specialist.last_name].filter(Boolean).join(' ')
              if (fullName) {
                displayName = fullName
              }
            }
          } catch (error) {
            // Профиль специалиста может не существовать - это нормально
            console.debug('Профиль специалиста не найден:', error)
          }
          
          // Если нет имени из профиля, используем displayName из метаданных, но не email
          if (!displayName) {
            displayName = supabaseUser.user_metadata?.displayName || supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || ''
          }
          
          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            name: displayName || 'Пользователь', // Никогда не используем email как имя
            type: 'specialist', // Все пользователи регистрируются как специалисты
            avatarUrl,
          })
          return
        }

        const storedUser = getActiveUser()
        setUser(storedUser ? mapStoredUserToAuthUser(storedUser) : null)
      } finally {
        setIsLoading(false)
        isRefreshingRef.current = false
      }
    },
    [],
  )

  // Сохраняем ссылку на refresh для использования в эффектах
  refreshRef.current = refresh

  useEffect(() => {
    let cleanup: (() => void) | undefined
    let visibilityTimeout: NodeJS.Timeout | null = null

    // Первоначальная загрузка
    refresh({ forceProfile: true })

    if (SUPABASE_AVAILABLE && supabase) {
      const { data } = supabase.auth.onAuthStateChange((event) => {
        // Инвалидируем кеш при изменении состояния авторизации
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          invalidateCache('auth:')
        }
        // Используем force только для критических событий
        if (refreshRef.current) {
          refreshRef.current({ forceProfile: true })
        }
      })

      cleanup = () => {
        data.subscription.unsubscribe()
      }
    } else {
      const handleStorage = () => {
        if (refreshRef.current) {
          refreshRef.current()
        }
      }
      
      // Throttle для visibilitychange - обновляем только если страница была скрыта более 5 секунд
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          // Очищаем предыдущий таймаут
          if (visibilityTimeout) {
            clearTimeout(visibilityTimeout)
          }
          // Задержка перед обновлением, чтобы избежать лишних запросов
          visibilityTimeout = setTimeout(() => {
            if (refreshRef.current) {
              refreshRef.current()
            }
          }, 2000) // Обновляем только через 2 секунды после возврата на страницу
        } else {
          // Очищаем таймаут если страница скрыта
          if (visibilityTimeout) {
            clearTimeout(visibilityTimeout)
            visibilityTimeout = null
          }
        }
      }

      window.addEventListener('storage', handleStorage)
      document.addEventListener('visibilitychange', handleVisibility)

      cleanup = () => {
        window.removeEventListener('storage', handleStorage)
        document.removeEventListener('visibilitychange', handleVisibility)
        if (visibilityTimeout) {
          clearTimeout(visibilityTimeout)
        }
      }
    }

    return () => {
      cleanup?.()
    }
  }, []) // Убираем refresh из зависимостей, используем ref вместо этого

  return {
    user,
    isLoading,
    refresh,
  }
}

