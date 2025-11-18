'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { UserPlusIcon } from '@heroicons/react/24/outline'
import { signUp, getCurrentUser, isSupabaseAvailable } from '@/lib/supabase'
import { findUserByEmail, getActiveUser, registerUser, saveSpecialistProfile, setActiveUser } from '@/lib/storage'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

    const trimmedName = formData.name.trim()
    const normalizedEmail = formData.email.trim().toLowerCase()

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    if (formData.password.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }

    if (!trimmedName) {
      setError('Укажите ваше имя и фамилию')
      return
    }

    setIsSubmitting(true)

    try {
      if (isSupabaseAvailable()) {
        // Используем Supabase Auth - регистрируем как специалиста по умолчанию
        await signUp(normalizedEmail, formData.password, 'specialist', trimmedName)
        
        // После регистрации перенаправляем на редактирование профиля
        router.push('/profile/edit')
      } else {
        // Fallback на localStorage
        if (findUserByEmail(normalizedEmail)) {
          setError('Пользователь с таким email уже зарегистрирован')
          return
        }

        const newUser = registerUser({
          email: normalizedEmail,
          name: trimmedName,
          type: 'specialist',
          password: formData.password,
        })
        setActiveUser(newUser)
        window.dispatchEvent(new Event('storage'))

        const nameParts = trimmedName.split(' ')
        const specialistProfile = {
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          specialization: 'Дизайн' as const,
          bio: '',
          telegram: '',
          email: normalizedEmail,
        }
        saveSpecialistProfile(newUser.id, specialistProfile)

        router.push('/profile/edit')
      }
    } catch (err: any) {
      console.error(err)
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

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-primary-50 border border-primary-200 text-primary-700 px-5 py-4 rounded-apple text-sm font-light">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-light text-primary-700 mb-2">
                Имя и фамилия
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white"
                placeholder="Иван Иванов"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
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
              disabled={isSubmitting}
              className="w-full flex justify-center py-4 px-5 border border-transparent text-base font-normal rounded-apple text-white bg-primary-900 hover:bg-primary-800 focus:outline-none focus:ring-1 focus:ring-primary-900 transition-colors tracking-tight disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Создание аккаунта...' : 'Зарегистрироваться'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
