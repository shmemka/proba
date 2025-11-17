'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { signIn, getCurrentUser, isSupabaseAvailable } from '@/lib/supabase'
import { getActiveUser, setActiveUser } from '@/lib/storage'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Если пользователь уже авторизован, перенаправляем на рабочие страницы
  useEffect(() => {
    const checkAuth = async () => {
      if (isSupabaseAvailable()) {
        const user = await getCurrentUser()
        if (user) {
          const redirect = searchParams.get('redirect')
          if (redirect) {
            router.push(redirect)
          } else {
            // Определяем тип пользователя из metadata
            const userType = user.user_metadata?.userType || 'specialist'
            router.push(userType === 'company' ? '/projects' : '/specialists')
          }
        }
      } else {
        // Fallback на localStorage
        const user = getActiveUser()
        if (user?.email && user?.password) {
          const redirect = searchParams.get('redirect')
          if (redirect) {
            router.push(redirect)
          } else {
            router.push(user.type === 'company' ? '/projects' : '/specialists')
          }
        }
      }
    }
    checkAuth()
  }, [router, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (isSubmitting) {
      return
    }
    
    if (!email || !password) {
      setError('Заполните все поля')
      return
    }

    const normalizedEmail = email.trim().toLowerCase()
    const passwordValue = password.trim()

    setIsSubmitting(true)
    try {
      if (isSupabaseAvailable()) {
        // Используем Supabase Auth
        const { user } = await signIn(normalizedEmail, passwordValue)
        if (user) {
          const redirect = searchParams.get('redirect')
          const userType = user.user_metadata?.userType || 'specialist'
          const defaultRedirect = userType === 'company' ? '/projects' : '/specialists'
          router.push(redirect || defaultRedirect)
        }
      } else {
        // Fallback на localStorage
        const { findUserByEmail, registerUser } = await import('@/lib/storage')
        let userToLogin = findUserByEmail(normalizedEmail)
        
        if (!userToLogin) {
          const legacyUser = getActiveUser()
          if (legacyUser && legacyUser.email.trim().toLowerCase() === normalizedEmail) {
            userToLogin = legacyUser
          } else {
            userToLogin = registerUser({
              email: normalizedEmail,
              name: 'Матвей',
              password: passwordValue,
              type: 'specialist',
            })
          }
        }

        setActiveUser(userToLogin)
        window.dispatchEvent(new Event('storage'))
        const redirect = searchParams.get('redirect')
        const defaultRedirect = userToLogin.type === 'company' ? '/projects' : '/specialists'
        router.push(redirect || defaultRedirect)
      }
    } catch (err: any) {
      console.error('Ошибка входа:', err)
      setError(err?.message || 'Неверный email или пароль')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-20 px-6">
      <div className="max-w-md w-full space-y-10">
        <div>
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-apple bg-primary-50 flex items-center justify-center">
              <ArrowRightOnRectangleIcon className="w-8 h-8 text-primary-700" />
            </div>
          </div>
          <h2 className="text-center text-4xl font-light text-primary-900 mb-3 tracking-tight">
            Вход в аккаунт
          </h2>
          <p className="text-center text-base font-light text-primary-600">
            Или{' '}
            <Link href="/register" className="font-normal text-primary-700 hover:text-primary-900">
              зарегистрируйтесь
            </Link>
          </p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-primary-50 border border-primary-200 text-primary-700 px-5 py-4 rounded-apple text-sm font-light">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white"
                placeholder="Email адрес"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary-900 focus:ring-primary-900 border-primary-300 rounded-apple"
              />
              <label htmlFor="remember-me" className="ml-3 block text-sm font-light text-primary-700">
                Запомнить меня
              </label>
            </div>

            <div className="text-sm">
              <Link href="#" className="font-light text-primary-600 hover:text-primary-900">
                Забыли пароль?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-4 px-5 border border-transparent text-base font-normal rounded-apple text-white bg-primary-900 hover:bg-primary-800 focus:outline-none focus:ring-1 focus:ring-primary-900 transition-colors tracking-tight disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Вход...' : 'Войти'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-primary-600">Загрузка...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
