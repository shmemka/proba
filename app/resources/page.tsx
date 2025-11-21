'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpenIcon, LightBulbIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { getSupabaseClient } from '@/lib/supabaseClient'
import ArticleCard from '@/components/ArticleCard'
import SkeletonLoader from '@/components/SkeletonLoader'

interface Article {
  id: string
  title: string
  excerpt: string
  image_url: string
}

export default function ResourcesPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadArticles = async () => {
      const supabase = getSupabaseClient()
      if (!supabase) {
        setIsLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('articles')
          .select('id, title, excerpt, image_url')
          .order('created_at', { ascending: false })

        if (!error && data) {
          setArticles(data)
        }
      } catch (err) {
        console.error('Ошибка загрузки статей:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadArticles()
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-primary-900 mb-2 sm:mb-3 tracking-tight">
            Ресурсы
          </h1>
          <p className="text-base sm:text-lg font-light text-primary-600">
            Полезные материалы и информация о платформе
          </p>
        </div>

        <div className="space-y-8 sm:space-y-12">
          {/* Статьи из базы данных */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-apple border border-primary-100 overflow-hidden">
                  <SkeletonLoader />
                </div>
              ))}
            </div>
          ) : articles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {articles.map((article) => (
                <ArticleCard
                  key={article.id}
                  id={article.id}
                  title={article.title}
                  excerpt={article.excerpt || article.title}
                  imageUrl={article.image_url || ''}
                />
              ))}
            </div>
          ) : null}

          {/* Статья "Что такое Проба?" - оставляем как статическую информацию */}
          <article className="bg-white rounded-apple border border-primary-100 p-6 sm:p-8 lg:p-10">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-apple bg-primary-50 flex items-center justify-center flex-shrink-0">
                <LightBulbIcon className="w-6 h-6 sm:w-7 sm:h-7 text-primary-700" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-light text-primary-900 mb-3 sm:mb-4 tracking-tight">
                  Что такое Проба?
                </h2>
              </div>
            </div>

            <div className="prose prose-lg max-w-none">
              <div className="space-y-4 sm:space-y-6 text-primary-700 font-light leading-relaxed">
                <p className="text-base sm:text-lg">
                  <strong className="font-normal text-primary-900">Проба</strong> — это платформа, где молодые специалисты получают реальный опыт работы, а малые компании и стартапы — качественные решения для своих проектов.
                </p>

                <p className="text-base sm:text-lg">
                  Наша миссия — создать экосистему взаимовыгодного сотрудничества, где каждый участник получает то, что ему нужно:
                </p>

                <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 my-6 sm:my-8">
                  <div className="bg-primary-50 rounded-apple p-5 sm:p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <UserGroupIcon className="w-6 h-6 text-primary-700" />
                      <h3 className="text-lg sm:text-xl font-normal text-primary-900 tracking-tight">
                        Для специалистов
                      </h3>
                    </div>
                    <ul className="space-y-2 text-sm sm:text-base text-primary-600 font-light">
                      <li className="flex items-start gap-2">
                        <span className="text-primary-400 mt-1">•</span>
                        <span>Реальный опыт работы над проектами</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary-400 mt-1">•</span>
                        <span>Кейсы для портфолио</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary-400 mt-1">•</span>
                        <span>Рекомендации от реальных клиентов</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary-400 mt-1">•</span>
                        <span>Возможность проявить себя</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-primary-50 rounded-apple p-5 sm:p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <BookOpenIcon className="w-6 h-6 text-primary-700" />
                      <h3 className="text-lg sm:text-xl font-normal text-primary-900 tracking-tight">
                        Для компаний
                      </h3>
                    </div>
                    <ul className="space-y-2 text-sm sm:text-base text-primary-600 font-light">
                      <li className="flex items-start gap-2">
                        <span className="text-primary-400 mt-1">•</span>
                        <span>Качественные решения для проектов</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary-400 mt-1">•</span>
                        <span>Доступ к талантливым специалистам</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary-400 mt-1">•</span>
                        <span>Возможность найти будущих сотрудников</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary-400 mt-1">•</span>
                        <span>Поддержка молодых талантов</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-primary-50 border border-primary-200 rounded-apple p-5 sm:p-6 my-6 sm:my-8">
                  <h3 className="text-lg sm:text-xl font-normal text-primary-900 mb-3 sm:mb-4 tracking-tight">
                    Как это работает?
                  </h3>
                  <ol className="space-y-3 text-sm sm:text-base text-primary-700 font-light">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-apple bg-primary-900 text-white flex items-center justify-center text-xs font-normal">
                        1
                      </span>
                      <span>Компания размещает проект с описанием задач и требований</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-apple bg-primary-900 text-white flex items-center justify-center text-xs font-normal">
                        2
                      </span>
                      <span>Специалисты изучают проекты и подают заявки с портфолио</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-apple bg-primary-900 text-white flex items-center justify-center text-xs font-normal">
                        3
                      </span>
                      <span>Компания выбирает подходящего специалиста и начинается работа</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-apple bg-primary-900 text-white flex items-center justify-center text-xs font-normal">
                        4
                      </span>
                      <span>После завершения проекта специалист получает опыт и рекомендацию, компания — готовое решение</span>
                    </li>
                  </ol>
                </div>

                <p className="text-base sm:text-lg">
                  <strong className="font-normal text-primary-900">Важно понимать:</strong> на платформе специалисты работают бесплатно ради опыта и портфолио. Взамен компания должна предоставить честную обратную связь, рекомендацию и возможность использовать проект в портфолио специалиста.
                </p>

                <p className="text-base sm:text-lg">
                  Это не просто фриланс-платформа — это сообщество, где каждый помогает другому расти и развиваться. Присоединяйтесь к нам и станьте частью экосистемы взаимного роста!
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  )
}
