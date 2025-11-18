'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowPathIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline'
import { signUp, getCurrentUser, isSupabaseAvailable } from '@/lib/supabase'
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
    const checkAuth = async () => {
      const type = searchParams.get('type')
      if (type === 'company' || type === 'specialist') {
        setUserType(type)
      }

      if (isSupabaseAvailable()) {
        const user = await getCurrentUser()
        if (user) {
          const userType = user.user_metadata?.userType || 'specialist'
          if (userType === 'specialist') {
            router.push('/profile/edit')
          } else {
            router.push('/projects')
          }
        }
      } else {
        const user = getActiveUser()
        if (user?.email && user?.password) {
          if (user.type === 'specialist') {
            router.push('/profile/edit')
          } else {
            router.push('/projects')
          }
        }
      }
    }
    checkAuth()
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
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
      if (isSupabaseAvailable()) {
        // Используем Supabase Auth
        const displayName = userType === 'company' ? trimmedCompany : trimmedName
        await signUp(normalizedEmail, formData.password, userType, displayName)
        
        // После регистрации перенаправляем
        router.push(userType === 'company' ? '/projects/new' : '/profile/edit')
      } else {
        // Fallback на localStorage
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
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Не удалось создать аккаунт. Попробуйте снова.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 py-12 sm:py-16 lg:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-start">
          <div className="bg-white/80 backdrop-blur-sm border border-primary-100 shadow-xl rounded-3xl p-6 sm:p-8 lg:p-10 space-y-8">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 text-primary-800 px-3 py-1 text-xs font-normal">
                  <SparklesIcon className="w-4 h-4" />
                  Регистрация за минуты
                </div>
                <div>
                  <h2 className="text-3xl sm:text-4xl font-light text-primary-900 tracking-tight">Создать аккаунт</h2>
                  <p className="mt-2 text-sm sm:text-base font-light text-primary-600">
                    Настройте профиль и начните получать отклики или откликаться сами.
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-primary-900 text-white items-center justify-center shadow-lg shadow-primary-900/20">
                <UserPlusIcon className="w-7 h-7" />
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              {[{ title: '1. Тип', desc: 'Выберите роль и мы подстроим сценарии.' }, { title: '2. Данные', desc: 'Заполните пару полей без лишнего.' }, { title: '3. Старт', desc: 'Перейдите к проектам или анкете.' }].map((step) => (
                <div key={step.title} className="rounded-2xl border border-primary-100 bg-primary-50/70 p-3 sm:p-4">
                  <p className="text-xs font-semibold text-primary-900 mb-1">{step.title}</p>
                  <p className="text-xs text-primary-600 font-light">{step.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setUserType('specialist')}
                className={`flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-apple border transition-all font-light tracking-tight shadow-sm ${
                  userType === 'specialist'
                    ? 'border-primary-900 bg-primary-900 text-white shadow-primary-900/20'
                    : 'border-primary-200 bg-white text-primary-700 hover:border-primary-300'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                Специалист
              </button>
              <button
                type="button"
                onClick={() => setUserType('company')}
                className={`flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-apple border transition-all font-light tracking-tight shadow-sm ${
                  userType === 'company'
                    ? 'border-primary-900 bg-primary-900 text-white shadow-primary-900/20'
                    : 'border-primary-200 bg-white text-primary-700 hover:border-primary-300'
                }`}
              >
                <BriefcaseIcon className="w-4 h-4" />
                Компания
              </button>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-apple text-sm font-normal shadow-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {userType === 'company' ? (
                  <div className="flex flex-col gap-2">
                    <label htmlFor="companyName" className="text-sm font-normal text-primary-800">
                      Название компании
                    </label>
                    <input
                      id="companyName"
                      name="companyName"
                      type="text"
                      required
                      className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-900/80 focus:border-primary-900 font-light bg-white shadow-sm"
                      placeholder="ООО «Пример»"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    />
                    <p className="text-xs text-primary-500">Название увидят специалисты в откликах.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <label htmlFor="name" className="text-sm font-normal text-primary-800">
                      Имя и фамилия
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-900/80 focus:border-primary-900 font-light bg-white shadow-sm"
                      placeholder="Иван Иванов"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <p className="text-xs text-primary-500">Добавьте реальное имя — так проще доверять откликам.</p>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label htmlFor="email" className="text-sm font-normal text-primary-800">
                    Email адрес
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-900/80 focus:border-primary-900 font-light bg-white shadow-sm"
                    placeholder="example@mail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="password" className="text-sm font-normal text-primary-800">
                      Пароль
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-900/80 focus:border-primary-900 font-light bg-white shadow-sm"
                      placeholder="Минимум 6 символов"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <p className="text-xs text-primary-500">Используйте буквы и цифры для большей защиты.</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="confirmPassword" className="text-sm font-normal text-primary-800">
                      Подтвердите пароль
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-2 focus:ring-primary-900/80 focus:border-primary-900 font-light bg-white shadow-sm"
                      placeholder="Повторите пароль"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    />
                    <p className="text-xs text-primary-500">Убедитесь, что символы совпадают.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-4 px-5 border border-transparent text-base font-normal rounded-apple text-white bg-primary-900 hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-900/80 transition-all tracking-tight disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-primary-900/15"
                >
                  {isSubmitting ? 'Создание аккаунта...' : 'Зарегистрироваться'}
                </button>
                <p className="text-center text-sm font-light text-primary-600">
                  Уже есть аккаунт?{' '}
                  <Link href="/login" className="font-normal text-primary-700 hover:text-primary-900">
                    Войдите и продолжайте
                  </Link>
                </p>
              </div>
            </form>
          </div>

          <div className="hidden lg:flex flex-col gap-6">
            <div className="rounded-3xl bg-primary-900 text-white p-8 shadow-2xl shadow-primary-900/30">
              <p className="text-sm uppercase tracking-[0.2em] text-primary-100 mb-4">Преимущества</p>
              <h3 className="text-2xl font-semibold leading-snug mb-3">Удобная работа для всех ролей</h3>
              <p className="text-primary-100/80 font-light text-base mb-6">
                Публикуйте проекты, ищите исполнителей или собирайте портфолио — настраивайте путь под себя.
              </p>
              <div className="space-y-3">
                {[{ icon: <ShieldCheckIcon className="w-5 h-5" />, text: 'Двухфакторная защита при работе с заказами.' }, { icon: <ArrowPathIcon className="w-5 h-5" />, text: 'Автосохранение черновиков и профиля.' }].map((item, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm font-normal text-primary-50 bg-white/10 rounded-2xl px-4 py-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">{item.icon}</div>
                    <p className="text-primary-50/90">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[{ title: 'Подсказки по профилю', description: 'Добавьте навыки и ссылки — система подскажет, что улучшить.' }, { title: 'Быстрый старт', description: 'Готовые шаблоны вакансий и карточек проектов.' }].map(
                (card) => (
                  <div key={card.title} className="bg-white border border-primary-100 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-primary-800 mb-1">
                      <CheckCircleIcon className="w-4 h-4" />
                      <p className="text-sm font-normal">{card.title}</p>
                    </div>
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
