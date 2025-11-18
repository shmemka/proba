'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowRightOnRectangleIcon,
  ClockIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 py-12 sm:py-16 lg:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-center">
          <div className="bg-white/80 backdrop-blur-sm border border-primary-100 shadow-xl rounded-3xl p-6 sm:p-8 lg:p-10 space-y-8">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 text-primary-800 px-3 py-1 text-xs font-normal">
                  <SparklesIcon className="w-4 h-4" />
                  Добро пожаловать
                </div>
                <div>
                  <h2 className="text-3xl sm:text-4xl font-light text-primary-900 tracking-tight">Вход в аккаунт</h2>
                  <p className="mt-2 text-sm sm:text-base font-light text-primary-600">
                    Продолжайте работу с проектами и откликами в пару кликов.
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-primary-900 text-white items-center justify-center shadow-lg shadow-primary-900/20">
                <ArrowRightOnRectangleIcon className="w-7 h-7" />
              </div>
            </div>

            <div className="bg-primary-50/60 border border-primary-100 rounded-2xl p-4 sm:p-5 text-sm text-primary-700 font-light flex gap-3">
              <ShieldCheckIcon className="w-5 h-5 text-primary-800 shrink-0" />
              <div>
                <p className="font-normal text-primary-900 mb-1">Защищённый вход</p>
                <p className="text-primary-600">Мы используем безопасное соединение и никогда не делимся вашими данными.</p>
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-apple text-sm font-normal shadow-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="text-sm font-normal text-primary-800">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-900/80 focus:border-primary-900 font-light bg-white shadow-sm"
                    placeholder="example@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm text-primary-800">
                    <label htmlFor="password" className="font-normal">
                      Пароль
                    </label>
                    <Link href="#" className="font-normal text-primary-700 hover:text-primary-900">
                      Забыли пароль?
                    </Link>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-900/80 focus:border-primary-900 font-light bg-white shadow-sm"
                    placeholder="Введите пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <p className="text-xs text-primary-500">Используйте минимум 6 символов, чтобы защитить аккаунт.</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-3 text-sm font-light text-primary-700 cursor-pointer select-none">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-primary-900 focus:ring-primary-900 border-primary-300 rounded-apple"
                  />
                  Запомнить меня на этом устройстве
                </label>
                <div className="hidden sm:flex items-center gap-2 text-xs font-normal text-primary-600 bg-primary-50 px-3 py-1 rounded-full border border-primary-100">
                  <ClockIcon className="w-4 h-4" />
                  Меньше 1 минуты
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-4 px-5 border border-transparent text-base font-normal rounded-apple text-white bg-primary-900 hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-900/80 transition-all tracking-tight disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-primary-900/15"
                >
                  {isSubmitting ? 'Вход...' : 'Войти'}
                </button>
                <p className="text-center text-sm font-light text-primary-600">
                  Нет аккаунта?{' '}
                  <Link href="/register" className="font-normal text-primary-700 hover:text-primary-900">
                    Зарегистрируйтесь за пару шагов
                  </Link>
                </p>
              </div>
            </form>
          </div>

          <div className="hidden lg:flex flex-col gap-6">
            <div className="rounded-3xl bg-primary-900 text-white p-8 shadow-2xl shadow-primary-900/30">
              <p className="text-sm uppercase tracking-[0.2em] text-primary-100 mb-4">Для новых пользователей</p>
              <h3 className="text-2xl font-semibold leading-snug mb-3">Начните с понятной панели</h3>
              <p className="text-primary-100/80 font-light text-base mb-6">
                Отслеживайте проекты, отправляйте отклики и общайтесь со специалистами в одном месте.
              </p>
              <div className="flex items-center gap-3 text-sm font-normal text-primary-50">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p>Гибкий доступ с любого устройства</p>
                  <p className="text-primary-100/70 font-light">Безопасный вход и быстрые обновления в режиме реального времени.</p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[{ title: 'Поддержка 24/7', description: 'Отвечаем на вопросы в чате и email.' }, { title: 'Умные рекомендации', description: 'Получайте подборки специалистов и проектов.' }].map(
                (card) => (
                  <div key={card.title} className="bg-white border border-primary-100 rounded-2xl p-5 shadow-sm">
                    <p className="text-sm font-normal text-primary-800 mb-1">{card.title}</p>
                    <p className="text-sm font-light text-primary-600">{card.description}</p>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
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
