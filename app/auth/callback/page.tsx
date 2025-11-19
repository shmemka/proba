'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { ensureSpecialistProfile, deriveDisplayName } from '@/lib/supabase'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

function OAuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const supabase = getSupabaseClient()
      if (!supabase) {
        setStatus('error')
        setError('Supabase не настроен')
        return
      }

      try {
        const errorParam = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (errorParam) {
          throw new Error(errorDescription || errorParam || 'Ошибка авторизации')
        }

        let session = null
        let user = null

        const code = searchParams.get('code')
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            throw exchangeError
          }

          session = data?.session
          user = data?.user
        } else {
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) {
            throw sessionError
          }

          session = sessionData?.session
          user = sessionData?.session?.user
        }

        if (session?.user || user) {
          const currentUser = user || session?.user
          
          if (currentUser) {
            try {
              const email = currentUser.email
              const displayName = 
                currentUser.user_metadata?.full_name ||
                currentUser.user_metadata?.name ||
                deriveDisplayName(email || '', 'specialist')
              
              const avatarUrl = 
                currentUser.user_metadata?.avatar_url ||
                currentUser.user_metadata?.picture ||
                null
              
              await ensureSpecialistProfile({
                id: currentUser.id,
                email: email || '',
                displayName,
                avatarUrl: avatarUrl || undefined,
              })
            } catch (profileError) {
              console.debug('Не удалось создать профиль специалиста при OAuth входе:', profileError)
            }

            setStatus('success')
            setTimeout(() => {
              router.push('/specialists')
            }, 1500)
          } else {
            throw new Error('Не удалось получить данные пользователя')
          }
        } else {
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession()
            
            if (retrySession?.user) {
              try {
                const email = retrySession.user.email
                const displayName = 
                  retrySession.user.user_metadata?.full_name ||
                  retrySession.user.user_metadata?.name ||
                  deriveDisplayName(email || '', 'specialist')
                
                const avatarUrl = 
                  retrySession.user.user_metadata?.avatar_url ||
                  retrySession.user.user_metadata?.picture ||
                  null
                
                await ensureSpecialistProfile({
                  id: retrySession.user.id,
                  email: email || '',
                  displayName,
                  avatarUrl: avatarUrl || undefined,
                })
              } catch (profileError) {
                console.debug('Не удалось создать профиль специалиста при OAuth входе:', profileError)
              }

              setStatus('success')
              setTimeout(() => {
                router.push('/specialists')
              }, 1500)
            } else {
              setStatus('error')
              setError('Не удалось получить сессию. Попробуйте войти снова.')
            }
          }, 1000)
        }
      } catch (err: any) {
        console.error('Ошибка OAuth callback:', err)
        setStatus('error')
        setError(err?.message || 'Не удалось выполнить вход через Google')
      }
    }

    handleOAuthCallback()
  }, [router, searchParams])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900 mx-auto"></div>
          <p className="text-primary-600 font-light">Завершение входа через Google...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-apple bg-red-50 flex items-center justify-center">
              <XCircleIcon className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-light text-primary-900 tracking-tight">
              Ошибка входа
            </h2>
            <p className="text-sm sm:text-base font-light text-primary-600">
              {error || 'Не удалось выполнить вход через Google. Попробуйте снова.'}
            </p>
          </div>
          <div className="pt-4 space-y-3">
            <button
              onClick={() => router.push('/auth')}
              className="w-full flex justify-center py-4 px-5 border border-transparent text-base font-normal rounded-apple text-white bg-primary-900 hover:bg-primary-800 focus:outline-none focus:ring-1 focus:ring-primary-900 transition-colors tracking-tight"
            >
              Перейти к входу
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-4">
        <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto" />
        <p className="text-primary-900 font-light text-lg">Вход выполнен успешно!</p>
        <p className="text-primary-600 font-light text-sm">Перенаправление...</p>
      </div>
    </div>
  )
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-primary-600">Загрузка...</div>
      </div>
    }>
      <OAuthCallback />
    </Suspense>
  )
}
