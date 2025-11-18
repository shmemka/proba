import { useCallback, useEffect, useState } from 'react'
import { getActiveUser, type StoredUser } from '@/lib/storage'
import { getCurrentUser, getSpecialist, isSupabaseAvailable } from '@/lib/supabase'
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

export function useAuthUser() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(
    async (options?: RefreshOptions) => {
      setIsLoading(true)

      try {
        if (SUPABASE_AVAILABLE) {
          const supabaseUser = await getCurrentUser({ force: options?.forceProfile })

          if (!supabaseUser) {
            setUser(null)
            return
          }

          let avatarUrl = ''

          // Пытаемся загрузить профиль специалиста (если есть)
          try {
            const specialist = await getSpecialist(supabaseUser.id, { force: options?.forceProfile })
            avatarUrl = (specialist as any)?.avatar_url || ''
          } catch (error) {
            // Профиль специалиста может не существовать - это нормально
            console.debug('Профиль специалиста не найден:', error)
          }

          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            name: supabaseUser.user_metadata?.displayName || supabaseUser.email || '',
            type: 'specialist', // Все пользователи регистрируются как специалисты
            avatarUrl,
          })
          return
        }

        const storedUser = getActiveUser()
        setUser(storedUser ? mapStoredUserToAuthUser(storedUser) : null)
      } finally {
        setIsLoading(false)
      }
    },
    [SUPABASE_AVAILABLE],
  )

  useEffect(() => {
    let cleanup: (() => void) | undefined

    refresh({ forceProfile: true })

    if (SUPABASE_AVAILABLE && supabase) {
      const { data } = supabase.auth.onAuthStateChange(() => {
        refresh({ forceProfile: true })
      })

      cleanup = () => {
        data.subscription.unsubscribe()
      }
    } else {
      const handleStorage = () => refresh()
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          refresh()
        }
      }

      window.addEventListener('storage', handleStorage)
      document.addEventListener('visibilitychange', handleVisibility)

      cleanup = () => {
        window.removeEventListener('storage', handleStorage)
        document.removeEventListener('visibilitychange', handleVisibility)
      }
    }

    return () => {
      cleanup?.()
    }
  }, [refresh, SUPABASE_AVAILABLE])

  return {
    user,
    isLoading,
    refresh,
  }
}

