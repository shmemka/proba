'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { UserPlusIcon, EnvelopeIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { signUp, signInWithGoogle, getCurrentUser, isSupabaseAvailable } from '@/lib/supabase'
import { findUserByEmail, getActiveUser, registerUser, saveSpecialistProfile, setActiveUser } from '@/lib/storage'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  useEffect(() => {
    const checkAuth = async () => {
      if (isSupabaseAvailable()) {
        const user = await getCurrentUser()
        if (user) {
          router.push('/specialists')
        }
      } else {
        const user = getActiveUser()
        if (user?.email && user?.password) {
          router.push('/specialists')
        }
      }
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (isSubmitting) {
      return
    }

    const trimmedFirstName = formData.firstName.trim()
    const trimmedLastName = formData.lastName.trim()
    const normalizedEmail = formData.email.trim().toLowerCase()

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    if (formData.password.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }

    if (!trimmedFirstName || !trimmedLastName) {
      setError('Укажите ваше имя и фамилию')
      return
    }

    setIsSubmitting(true)

    try {
      const fullName = `${trimmedFirstName} ${trimmedLastName}`.trim()
      
      if (isSupabaseAvailable()) {
        // Используем Supabase Auth - регистрируем как специалиста по умолчанию
        const result = await signUp(normalizedEmail, formData.password, 'specialist', fullName)
        
        // Проверяем, подтвержден ли email
        if (result.user && !result.user.email_confirmed_at) {
          // Показываем модальное окно с просьбой подтвердить email
          setRegisteredEmail(normalizedEmail)
          setShowEmailModal(true)
        } else {
          // Если email уже подтвержден (маловероятно, но возможно), перенаправляем
          router.push('/specialists')
        }
      } else {
        // Fallback на localStorage
        if (findUserByEmail(normalizedEmail)) {
          setError('Пользователь с таким email уже зарегистрирован')
          return
        }

        const newUser = registerUser({
          email: normalizedEmail,
          name: fullName,
          type: 'specialist',
          password: formData.password,
        })
        setActiveUser(newUser)
        window.dispatchEvent(new Event('storage'))

        const specialistProfile = {
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          specialization: 'Дизайн' as const,
          bio: '',
          telegram: '',
          email: normalizedEmail,
        }
        saveSpecialistProfile(newUser.id, specialistProfile)

        router.push('/specialists')
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Не удалось создать аккаунт. Попробуйте снова.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!isSupabaseAvailable()) {
      setError('Регистрация через Google доступна только при использовании Supabase')
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
      console.error('Ошибка регистрации через Google:', err)
      setError(err?.message || 'Не удалось выполнить регистрацию через Google')
      setIsGoogleLoading(false)
    }
  }

  return (
    <>
      {/* Модальное окно подтверждения email */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-apple max-w-md w-full p-6 sm:p-8 space-y-6 relative">
            <button
              onClick={() => setShowEmailModal(false)}
              className="absolute top-4 right-4 text-primary-400 hover:text-primary-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-apple bg-primary-50 flex items-center justify-center">
                <EnvelopeIcon className="w-8 h-8 text-primary-700" />
              </div>
            </div>
            
            <div className="text-center space-y-4">
              <h2 className="text-2xl sm:text-3xl font-light text-primary-900 tracking-tight">
                Проверьте почту
              </h2>
              <p className="text-sm sm:text-base font-light text-primary-600">
                Мы отправили письмо с подтверждением на адрес
              </p>
              <p className="text-base sm:text-lg font-normal text-primary-900 break-all">
                {registeredEmail}
              </p>
              <p className="text-sm font-light text-primary-600 pt-2">
                Перейдите по ссылке в письме, чтобы подтвердить ваш email и завершить регистрацию.
              </p>
            </div>
            
            <div className="pt-4">
              <button
                onClick={() => {
                  setShowEmailModal(false)
                  router.push('/login')
                }}
                className="w-full flex justify-center py-4 px-5 border border-transparent text-base font-normal rounded-apple text-white bg-primary-900 hover:bg-primary-800 focus:outline-none focus:ring-1 focus:ring-primary-900 transition-colors tracking-tight"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen flex items-center justify-center bg-white py-12 sm:py-16 lg:py-20 px-4 sm:px-6">
        <div className="max-w-md w-full space-y-8 sm:space-y-10">
        <div>
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-apple bg-primary-50 flex items-center justify-center">
              <UserPlusIcon className="w-8 h-8 text-primary-700" />
            </div>
          </div>
          <h2 className="text-center text-3xl sm:text-4xl font-light text-primary-900 mb-2 sm:mb-3 tracking-tight">
            Создать аккаунт
          </h2>
          <p className="text-center text-sm sm:text-base font-light text-primary-600">
            Или{' '}
            <Link href="/login" className="font-normal text-primary-700 hover:text-primary-900">
              войдите в существующий
            </Link>
          </p>
        </div>

        {/* Google Sign In Button */}
        {isSupabaseAvailable() && (
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isSubmitting}
            className="w-full flex items-center justify-center gap-3 py-4 px-5 border border-primary-200 rounded-apple text-base font-normal text-primary-900 bg-white hover:bg-primary-50 focus:outline-none focus:ring-1 focus:ring-primary-900 transition-colors tracking-tight disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isGoogleLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-900"></div>
                <span>Регистрация через Google...</span>
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
                <span>Регистрироваться через Google</span>
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

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-primary-50 border border-primary-200 text-primary-700 px-5 py-4 rounded-apple text-sm font-light">
              {error}
            </div>
          )}

          <div className="space-y-4">
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
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
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
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-light text-primary-700 mb-2">
                Email адрес
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white"
                placeholder="example@mail.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                autoComplete="new-password"
                required
                className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white"
                placeholder="Минимум 6 символов"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting || isGoogleLoading}
              className="w-full flex justify-center py-4 px-5 border border-transparent text-base font-normal rounded-apple text-white bg-primary-900 hover:bg-primary-800 focus:outline-none focus:ring-1 focus:ring-primary-900 transition-colors tracking-tight disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Создание аккаунта...' : 'Зарегистрироваться'}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-primary-600">Загрузка...</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
