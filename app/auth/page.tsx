'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { signIn, signUp, signInWithGoogle, getCurrentUser, isSupabaseAvailable } from '@/lib/supabase'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { getActiveUser, setActiveUser, findUserByEmail, registerUser } from '@/lib/storage'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Состояние для режима (вход или регистрация)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  // Если пользователь уже авторизован, перенаправляем
  useEffect(() => {
    const checkAuth = async () => {
      if (isSupabaseAvailable()) {
        const user = await getCurrentUser()
        if (user) {
          const redirect = searchParams.get('redirect')
          router.push(redirect || '/specialists')
        }
      } else {
        const user = getActiveUser()
        if (user?.email && user?.password) {
          const redirect = searchParams.get('redirect')
          router.push(redirect || '/specialists')
        }
      }
    }
    checkAuth()
  }, [router, searchParams])


  // Вход через Google
  const handleGoogleSignIn = async () => {
    if (!isSupabaseAvailable()) {
      setError('Вход через Google доступен только при использовании Supabase')
      return
    }

    if (isGoogleLoading || isSubmitting) {
      return
    }

    setIsGoogleLoading(true)
    setError('')

    try {
      await signInWithGoogle()
      // Редирект произойдет автоматически через OAuth callback
    } catch (err: any) {
      console.error('Ошибка входа через Google:', err)
      setError(err?.message || 'Не удалось выполнить вход через Google')
      setIsGoogleLoading(false)
    }
  }

  // Переключение режима
  const handleModeChange = (newMode: 'login' | 'register') => {
    setMode(newMode)
    setError('')
    setPassword('')
    setConfirmPassword('')
    setFirstName('')
    setLastName('')
  }

  // Вход через email и пароль
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError('Введите email')
      return
    }

    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      setError('Введите корректный email')
      return
    }
    
    if (!password) {
      setError('Введите пароль')
      return
    }

    const passwordValue = password.trim()

    setIsSubmitting(true)
    try {
      if (isSupabaseAvailable()) {
        const { user } = await signIn(normalizedEmail, passwordValue)
        if (user) {
          const redirect = searchParams.get('redirect')
          router.push(redirect || '/specialists')
        }
      } else {
        const userToLogin = findUserByEmail(normalizedEmail)
        if (!userToLogin || userToLogin.password !== passwordValue) {
          setError('Неверный пароль')
          return
        }

        setActiveUser(userToLogin)
        window.dispatchEvent(new Event('storage'))
        const redirect = searchParams.get('redirect')
        router.push(redirect || '/specialists')
      }
    } catch (err: any) {
      console.error('Ошибка входа:', err)
      setError(err?.message || 'Неверный email или пароль')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Регистрация
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError('Введите email')
      return
    }

    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      setError('Введите корректный email')
      return
    }

    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()

    if (!trimmedFirstName || !trimmedLastName) {
      setError('Укажите ваше имя и фамилию')
      return
    }

    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    const fullName = `${trimmedFirstName} ${trimmedLastName}`.trim()

    setIsSubmitting(true)
    try {
      if (isSupabaseAvailable()) {
        const result = await signUp(normalizedEmail, password, 'specialist', fullName)
        
        // Проверяем, подтвержден ли email
        if (result.user && !result.user.email_confirmed_at) {
          // Показываем сообщение о необходимости подтвердить email
          setError('Проверьте почту и подтвердите email для завершения регистрации')
        } else {
          const redirect = searchParams.get('redirect')
          router.push(redirect || '/specialists')
        }
      } else {
        if (findUserByEmail(normalizedEmail)) {
          setError('Пользователь с таким email уже зарегистрирован')
          return
        }

        const newUser = registerUser({
          email: normalizedEmail,
          name: fullName,
          type: 'specialist',
          password: password,
        })
        setActiveUser(newUser)
        window.dispatchEvent(new Event('storage'))

        const redirect = searchParams.get('redirect')
        router.push(redirect || '/specialists')
      }
    } catch (err: any) {
      console.error('Ошибка регистрации:', err)
      setError(err?.message || 'Не удалось создать аккаунт. Попробуйте снова.')
    } finally {
      setIsSubmitting(false)
    }
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 sm:py-16 lg:py-20 px-4 sm:px-6">
      <div className="max-w-md w-full space-y-8 sm:space-y-10">
        <div>
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-apple bg-primary-50 flex items-center justify-center">
              <ArrowRightOnRectangleIcon className="w-8 h-8 text-primary-700" />
            </div>
          </div>
          <h2 className="text-center text-3xl sm:text-4xl font-light text-primary-900 mb-2 sm:mb-3 tracking-tight">
            Добро пожаловать
          </h2>
          <p className="text-center text-sm sm:text-base font-light text-primary-600">
            {mode === 'login' ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
          </p>
        </div>

        {/* Segmented Controls */}
        <div className="flex rounded-apple border border-primary-200 bg-white p-1">
          <button
            type="button"
            onClick={() => handleModeChange('login')}
            className={`flex-1 py-2.5 px-4 text-sm font-normal rounded-apple transition-all ${
              mode === 'login'
                ? 'bg-primary-900 text-white shadow-sm'
                : 'text-primary-600 hover:text-primary-900'
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('register')}
            className={`flex-1 py-2.5 px-4 text-sm font-normal rounded-apple transition-all ${
              mode === 'register'
                ? 'bg-primary-900 text-white shadow-sm'
                : 'text-primary-600 hover:text-primary-900'
            }`}
          >
            Регистрация
          </button>
        </div>

        {/* Google Sign In Button */}
        {isSupabaseAvailable() && (
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isSubmitting}
            className="w-full flex items-center justify-center gap-3 py-4 px-5 border border-primary-200 rounded-apple text-base font-normal text-primary-900 bg-white hover:bg-primary-50 focus:outline-none focus:ring-1 focus:ring-primary-900 transition-colors tracking-tight disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
          >
            {isGoogleLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-900"></div>
                <span>Вход через Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Продолжить с Google</span>
              </>
            )}
          </button>
        )}

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-primary-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-primary-500 font-light">или</span>
          </div>
        </div>

        {/* Форма входа */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-primary-50 border border-primary-200 text-primary-700 px-5 py-4 rounded-apple text-sm font-light">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-light text-primary-700 mb-2">
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
              <label htmlFor="password" className="block text-sm font-light text-primary-700 mb-2">
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-4 px-5 border border-transparent text-base font-normal rounded-apple text-white bg-primary-900 hover:bg-primary-800 focus:outline-none focus:ring-1 focus:ring-primary-900 transition-colors tracking-tight disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Вход...' : 'Войти'}
              </button>
            </div>
          </form>
        )}

        {/* Форма регистрации */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-6">
            {error && (
              <div className="bg-primary-50 border border-primary-200 text-primary-700 px-5 py-4 rounded-apple text-sm font-light">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email-register" className="block text-sm font-light text-primary-700 mb-2">
                Email
              </label>
              <input
                id="email-register"
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-light text-primary-700 mb-2">
                  Имя
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white"
                  placeholder="Иван"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-light text-primary-700 mb-2">
                  Фамилия
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white"
                  placeholder="Иванов"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-light text-primary-700 mb-2">
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white"
                placeholder="Минимум 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-light text-primary-700 mb-2">
                Подтвердите пароль
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white"
                placeholder="Повторите пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-4 px-5 border border-transparent text-base font-normal rounded-apple text-white bg-primary-900 hover:bg-primary-800 focus:outline-none focus:ring-1 focus:ring-primary-900 transition-colors tracking-tight disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Создание аккаунта...' : 'Зарегистрироваться'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-primary-600">Загрузка...</div>
      </div>
    }>
      <AuthForm />
    </Suspense>
  )
}
