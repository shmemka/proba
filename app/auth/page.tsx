'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { signIn, signUp, signInWithGoogle, getCurrentUser, isSupabaseAvailable } from '@/lib/supabase'
import { getActiveUser, setActiveUser } from '@/lib/storage'

type AuthMode = 'login' | 'register'

function AuthForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
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

    if (mode === 'register' && !displayName.trim()) {
      setError('Введите имя')
      return
    }

    const normalizedEmail = email.trim().toLowerCase()
    const passwordValue = password.trim()
    const nameValue = displayName.trim()

    setIsSubmitting(true)
    try {
      if (isSupabaseAvailable()) {
        if (mode === 'register') {
          const { user } = await signUp(normalizedEmail, passwordValue, 'specialist', nameValue)
          if (user) {
            // После регистрации показываем сообщение о подтверждении email
            setError('')
            alert('Регистрация успешна! Проверьте email для подтверждения аккаунта.')
            // Можно перенаправить на страницу подтверждения
            // router.push('/auth/confirm')
          }
        } else {
          const { user } = await signIn(normalizedEmail, passwordValue)
          if (user) {
            const redirect = searchParams.get('redirect')
            router.push(redirect || '/specialists')
          }
        }
      } else {
        // Fallback для режима без Supabase
        const { findUserByEmail, registerUser } = await import('@/lib/storage')
        
        if (mode === 'register') {
          const existingUser = findUserByEmail(normalizedEmail)
          if (existingUser) {
            setError('Пользователь с таким email уже зарегистрирован')
            setIsSubmitting(false)
            return
          }
          
          const newUser = registerUser({
            email: normalizedEmail,
            name: nameValue || 'Пользователь',
            password: passwordValue,
            type: 'specialist',
          })
          
          setActiveUser(newUser)
          window.dispatchEvent(new Event('storage'))
          const redirect = searchParams.get('redirect')
          router.push(redirect || '/specialists')
        } else {
          let userToLogin = findUserByEmail(normalizedEmail)
          
          if (!userToLogin) {
            const legacyUser = getActiveUser()
            if (legacyUser && legacyUser.email.trim().toLowerCase() === normalizedEmail) {
              userToLogin = legacyUser
            } else {
              setError('Пользователь с таким email не найден')
              setIsSubmitting(false)
              return
            }
          }

          setActiveUser(userToLogin)
          window.dispatchEvent(new Event('storage'))
          const redirect = searchParams.get('redirect')
          router.push(redirect || '/specialists')
        }
      }
    } catch (err: any) {
      console.error(`Ошибка ${mode === 'register' ? 'регистрации' : 'входа'}:`, err)
      setError(err?.message || (mode === 'register' ? 'Не удалось создать аккаунт' : 'Неверный email или пароль'))
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
            Продолжите с Google или используйте email
          </p>
        </div>

        {/* Google Sign In Button - сверху */}
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

        {/* Segmented Controls - снизу */}
        <div className="bg-primary-50 rounded-apple p-1 flex gap-1">
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setError('')
            }}
            className={`flex-1 py-2.5 px-4 rounded-apple text-sm font-normal transition-all duration-200 ${
              mode === 'login'
                ? 'bg-white text-primary-900 shadow-sm'
                : 'text-primary-600 hover:text-primary-900'
            }`}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register')
              setError('')
            }}
            className={`flex-1 py-2.5 px-4 rounded-apple text-sm font-normal transition-all duration-200 ${
              mode === 'register'
                ? 'bg-white text-primary-900 shadow-sm'
                : 'text-primary-600 hover:text-primary-900'
            }`}
          >
            Регистрация
          </button>
        </div>

        {/* Email/Password Form */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-primary-50 border border-primary-200 text-primary-700 px-5 py-4 rounded-apple text-sm font-light">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="displayName" className="sr-only">
                  Имя
                </label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  required={mode === 'register'}
                  className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white"
                  placeholder="Ваше имя"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            )}
            
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
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                required
                className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {mode === 'login' && (
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
          )}

          <button
            type="submit"
            disabled={isSubmitting || isGoogleLoading}
            className="w-full flex justify-center py-4 px-5 border border-transparent text-base font-normal rounded-apple text-white bg-primary-900 hover:bg-primary-800 focus:outline-none focus:ring-1 focus:ring-primary-900 transition-colors tracking-tight disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting 
              ? (mode === 'register' ? 'Регистрация...' : 'Вход...') 
              : (mode === 'register' ? 'Зарегистрироваться' : 'Войти')
            }
          </button>
        </form>
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
