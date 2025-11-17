'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { UserPlusIcon, UserIcon, BriefcaseIcon } from '@heroicons/react/24/outline'
import { findUserByEmail, getActiveUser, registerUser, saveSpecialistProfile, setActiveUser } from '@/lib/storage'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userType, setUserType] = useState<'specialist' | 'company'>('specialist')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const type = searchParams.get('type')
    if (type === 'company' || type === 'specialist') {
      setUserType(type)
    }

    const user = getActiveUser()
    if (user?.email && user?.password) {
      if (user.type === 'specialist') {
        router.push('/profile/edit')
      } else {
        router.push('/projects')
      }
    }
  }, [searchParams, router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (isSubmitting) {
      return
    }

    const trimmedName = formData.name.trim()
    const trimmedCompany = formData.companyName.trim()
    const normalizedEmail = formData.email.trim().toLowerCase()

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают')
      return
    }

    if (formData.password.length < 6) {
      setError('Пароль должен быть не менее 6 символов')
      return
    }

    if (userType === 'specialist' && !trimmedName) {
      setError('Укажите ваше имя и фамилию')
      return
    }

    if (userType === 'company' && !trimmedCompany) {
      setError('Укажите название компании')
      return
    }

    setIsSubmitting(true)

    try {
      // Локальная регистрация
      if (findUserByEmail(normalizedEmail)) {
        setError('Пользователь с таким email уже зарегистрирован')
        return
      }

      const newUser = registerUser({
        email: normalizedEmail,
        name: userType === 'company' ? trimmedCompany : trimmedName,
        type: userType,
        password: formData.password,
        companyName: userType === 'company' ? trimmedCompany : undefined,
      })
      setActiveUser(newUser)
      window.dispatchEvent(new Event('storage'))

      if (userType === 'specialist') {
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
      }

      router.push(userType === 'company' ? '/projects/new' : '/profile/edit')
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Не удалось создать аккаунт. Попробуйте снова.')
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
              <UserPlusIcon className="w-8 h-8 text-primary-700" />
            </div>
          </div>
          <h2 className="text-center text-4xl font-light text-primary-900 mb-3 tracking-tight">
            Создать аккаунт
          </h2>
          <p className="text-center text-base font-light text-primary-600">
            Или{' '}
            <Link href="/login" className="font-normal text-primary-700 hover:text-primary-900">
              войдите в существующий
            </Link>
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setUserType('specialist')}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-apple border transition-colors font-light tracking-tight ${
              userType === 'specialist'
                ? 'border-primary-900 bg-primary-900 text-white'
                : 'border-primary-200 bg-white text-primary-700 hover:border-primary-300'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            Специалист
          </button>
          <button
            type="button"
            onClick={() => setUserType('company')}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-apple border transition-colors font-light tracking-tight ${
              userType === 'company'
                ? 'border-primary-900 bg-primary-900 text-white'
                : 'border-primary-200 bg-white text-primary-700 hover:border-primary-300'
            }`}
          >
            <BriefcaseIcon className="w-4 h-4" />
            Компания
          </button>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-primary-50 border border-primary-200 text-primary-700 px-5 py-4 rounded-apple text-sm font-light">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {userType === 'company' ? (
              <div>
                <label htmlFor="companyName" className="block text-sm font-light text-primary-700 mb-2">
                  Название компании
                </label>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  required
                  className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white"
                  placeholder="ООО «Пример»"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />
              </div>
            ) : (
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
            )}

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
