'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { CheckCircleIcon } from '@heroicons/react/24/outline'

function ConfirmEmail() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const supabase = getSupabaseClient()
      if (!supabase) {
        setStatus('error')
        setError('Supabase не настроен')
        return
      }

      // Сначала проверяем, есть ли уже активная сессия (Supabase может автоматически обработать hash из URL)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user?.email_confirmed_at) {
        // Email уже подтвержден, перенаправляем
        setStatus('success')
        setTimeout(() => {
          router.push('/auth/verified')
        }, 1500)
        return
      }

      // Получаем токены из URL query параметров
      const token_hash = searchParams.get('token_hash')
      const type = searchParams.get('type')

      if (token_hash && type === 'email') {
        try {
          // Подтверждаем email через Supabase
          const { data, error: confirmError } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'email',
          })

          if (confirmError) {
            throw confirmError
          }

          if (data?.user) {
            // Успешное подтверждение
            setStatus('success')
            // Перенаправляем на страницу успешного подтверждения
            setTimeout(() => {
              router.push('/auth/verified')
            }, 1500)
          } else {
            throw new Error('Не удалось подтвердить email')
          }
        } catch (err: any) {
          console.error('Ошибка подтверждения email:', err)
          setStatus('error')
          setError(err?.message || 'Не удалось подтвердить email')
        }
      } else {
        // Если нет токенов в query параметрах, ждем немного и проверяем сессию снова
        // (Supabase может обработать hash автоматически)
        setTimeout(async () => {
          const { data: { session: newSession } } = await supabase.auth.getSession()
          if (newSession?.user?.email_confirmed_at) {
            setStatus('success')
            setTimeout(() => {
              router.push('/auth/verified')
            }, 1500)
          } else {
            setStatus('error')
            setError('Неверная ссылка подтверждения. Проверьте, что вы перешли по ссылке из письма.')
          }
        }, 1000)
      }
    }

    handleEmailConfirmation()
  }, [router, searchParams])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900 mx-auto"></div>
          <p className="text-primary-600 font-light">Подтверждение email...</p>
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
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-light text-primary-900 tracking-tight">
              Ошибка подтверждения
            </h2>
            <p className="text-sm sm:text-base font-light text-primary-600">
              {error || 'Не удалось подтвердить email. Возможно, ссылка устарела или неверна.'}
            </p>
          </div>
          <div className="pt-4">
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
        <p className="text-primary-900 font-light text-lg">Email успешно подтвержден!</p>
        <p className="text-primary-600 font-light text-sm">Перенаправление...</p>
      </div>
    </div>
  )
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-primary-600">Загрузка...</div>
      </div>
    }>
      <ConfirmEmail />
    </Suspense>
  )
}

