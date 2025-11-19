'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRightIcon, UsersIcon, BriefcaseIcon, TrophyIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline'
import { getCurrentUser, isSupabaseAvailable } from '@/lib/supabase'
import { getActiveUser } from '@/lib/storage'

export default function Home() {
  const router = useRouter()

  // Проверяем авторизацию и редиректим авторизованных пользователей
  useEffect(() => {
    const checkAuth = async () => {
      // Проверяем флаг выхода - не редиректим сразу после выхода
      const justLoggedOut = typeof window !== 'undefined' && sessionStorage.getItem('just_logged_out')
      if (justLoggedOut) {
        // Если только что вышли, пропускаем проверку авторизации
        return
      }
      
      // Небольшая задержка для предотвращения гонки условий
      await new Promise(resolve => setTimeout(resolve, 100))
      
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
            <Link
              href="/register"
              prefetch={true}
              className="bg-primary-900 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-apple font-normal hover:bg-primary-800 transition-colors inline-flex items-center justify-center gap-2 text-sm sm:text-base tracking-tight"
            >
              Зарегистрироваться
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              prefetch={true}
              className="bg-white text-primary-900 px-6 sm:px-8 py-3 sm:py-4 rounded-apple font-normal hover:bg-primary-50 transition-colors inline-flex items-center justify-center gap-2 border border-primary-200 text-sm sm:text-base tracking-tight"
            >
              Войти
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

