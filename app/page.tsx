'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRightIcon, UsersIcon, BriefcaseIcon, TrophyIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline'
import { getCurrentUser, isSupabaseAvailable, signInWithGoogle } from '@/lib/supabase'
import { getActiveUser } from '@/lib/storage'
import { useState } from 'react'

export default function Home() {
  const router = useRouter()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  // Проверяем авторизацию и редиректим авторизованных пользователей
  useEffect(() => {
    const checkAuth = async () => {
      if (isSupabaseAvailable()) {
        const user = await getCurrentUser({ force: true })
        if (user) {
          router.push('/specialists')
        }
      } else {
        // Fallback на localStorage
        const user = getActiveUser()
        if (user?.email && user?.password) {
          router.push('/specialists')
        }
      }
    }
    checkAuth()
  }, [router])

  const handleGoogleSignIn = async () => {
    if (!isSupabaseAvailable()) {
      return
    }

    if (isGoogleLoading) {
      return
    }

    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
      // Редирект произойдет автоматически через OAuth callback
    } catch (err: any) {
      console.error('Ошибка входа через Google:', err)
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-white py-16 sm:py-24 lg:py-32 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight mb-6 sm:mb-8 text-primary-900 leading-tight">
            Опыт и портфолио
            <br />
            <span className="font-normal">без границ</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl font-light mb-10 sm:mb-12 lg:mb-16 text-primary-600 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
            Платформа, где молодые специалисты получают реальный опыт, 
            а малые компании — качественные решения
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            {isSupabaseAvailable() && (
              <button
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="bg-primary-900 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-apple font-normal hover:bg-primary-800 transition-colors inline-flex items-center justify-center gap-2 text-sm sm:text-base tracking-tight disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
            >
                {isGoogleLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Вход через Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#FFFFFF"
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
            <Link
              href="/auth"
              prefetch={true}
              className="bg-white text-primary-900 px-6 sm:px-8 py-3 sm:py-4 rounded-apple font-normal hover:bg-primary-50 transition-colors inline-flex items-center justify-center gap-2 border border-primary-200 text-sm sm:text-base tracking-tight"
            >
              Продолжить с почтой
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 lg:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light text-center mb-10 sm:mb-16 lg:mb-20 text-primary-900 tracking-tight">
            Как это работает
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12">
            <div className="text-center">
              <div className="mb-4 sm:mb-6 flex justify-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-apple bg-primary-50 flex items-center justify-center">
                  <UsersIcon className="w-6 h-6 sm:w-7 sm:h-7 text-primary-700" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-normal mb-2 sm:mb-3 text-primary-900 tracking-tight">Специалисты</h3>
              <p className="text-sm sm:text-base font-light text-primary-600 leading-relaxed">
                Создайте анкету, покажите свои навыки и начните работать над реальными задачами
              </p>
            </div>
            <div className="text-center">
              <div className="mb-4 sm:mb-6 flex justify-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-apple bg-primary-50 flex items-center justify-center">
                  <BriefcaseIcon className="w-6 h-6 sm:w-7 sm:h-7 text-primary-700" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-normal mb-2 sm:mb-3 text-primary-900 tracking-tight">Компании</h3>
              <p className="text-sm sm:text-base font-light text-primary-600 leading-relaxed">
                Разместите задачу и получите готовое решение от мотивированных специалистов
              </p>
            </div>
            <div className="text-center">
              <div className="mb-4 sm:mb-6 flex justify-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-apple bg-primary-50 flex items-center justify-center">
                  <TrophyIcon className="w-6 h-6 sm:w-7 sm:h-7 text-primary-700" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-normal mb-2 sm:mb-3 text-primary-900 tracking-tight">Опыт</h3>
              <p className="text-sm sm:text-base font-light text-primary-600 leading-relaxed">
                Получайте практику, кейсы для портфолио и рекомендации от реальных клиентов
              </p>
            </div>
            <div className="text-center">
              <div className="mb-4 sm:mb-6 flex justify-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-apple bg-primary-50 flex items-center justify-center">
                  <ArrowTrendingUpIcon className="w-6 h-6 sm:w-7 sm:h-7 text-primary-700" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-normal mb-2 sm:mb-3 text-primary-900 tracking-tight">Рост</h3>
              <p className="text-sm sm:text-base font-light text-primary-600 leading-relaxed">
                Развивайтесь вместе: специалисты получают опыт, компании — результаты
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-24 px-4 sm:px-6 bg-primary-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-light mb-4 sm:mb-6 text-primary-900 tracking-tight">
            Готовы начать?
          </h2>
          <p className="text-base sm:text-lg font-light text-primary-600 mb-8 sm:mb-10 lg:mb-12 leading-relaxed">
            Присоединяйтесь к сообществу профессионалов, которые растут вместе
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link
              href="/specialists"
              prefetch={true}
              className="bg-primary-900 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-apple font-normal hover:bg-primary-800 transition-colors text-sm sm:text-base tracking-tight"
            >
              Найти специалиста
            </Link>
            <Link
              href="/projects"
              prefetch={true}
              className="bg-white text-primary-900 px-6 sm:px-8 py-3 sm:py-4 rounded-apple font-normal hover:bg-primary-100 transition-colors border border-primary-200 text-sm sm:text-base tracking-tight"
            >
              Найти задачу
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

