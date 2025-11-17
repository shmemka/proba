import Link from 'next/link'
import { ArrowRightIcon, UsersIcon, BriefcaseIcon, TrophyIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline'

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-white py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-light tracking-tight mb-8 text-primary-900 leading-tight">
            Опыт и портфолио
            <br />
            <span className="font-normal">без границ</span>
          </h1>
          <p className="text-xl md:text-2xl font-light mb-16 text-primary-600 max-w-2xl mx-auto leading-relaxed">
            Платформа, где молодые специалисты получают реальный опыт, 
            а малые компании — качественные решения
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register?type=specialist"
              className="bg-primary-900 text-white px-8 py-4 rounded-apple font-normal hover:bg-primary-800 transition-colors inline-flex items-center justify-center gap-2 text-base tracking-tight"
            >
              Я специалист
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
            <Link
              href="/register?type=company"
              className="bg-white text-primary-900 px-8 py-4 rounded-apple font-normal hover:bg-primary-50 transition-colors inline-flex items-center justify-center gap-2 border border-primary-200 text-base tracking-tight"
            >
              Я компания
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-light text-center mb-20 text-primary-900 tracking-tight">
            Как это работает
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 rounded-apple bg-primary-50 flex items-center justify-center">
                  <UsersIcon className="w-7 h-7 text-primary-700" />
                </div>
              </div>
              <h3 className="text-xl font-normal mb-3 text-primary-900 tracking-tight">Специалисты</h3>
              <p className="text-base font-light text-primary-600 leading-relaxed">
                Создайте анкету, покажите свои навыки и начните работать над реальными проектами
              </p>
            </div>
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 rounded-apple bg-primary-50 flex items-center justify-center">
                  <BriefcaseIcon className="w-7 h-7 text-primary-700" />
                </div>
              </div>
              <h3 className="text-xl font-normal mb-3 text-primary-900 tracking-tight">Компании</h3>
              <p className="text-base font-light text-primary-600 leading-relaxed">
                Разместите проект и получите готовое решение от мотивированных специалистов
              </p>
            </div>
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 rounded-apple bg-primary-50 flex items-center justify-center">
                  <TrophyIcon className="w-7 h-7 text-primary-700" />
                </div>
              </div>
              <h3 className="text-xl font-normal mb-3 text-primary-900 tracking-tight">Опыт</h3>
              <p className="text-base font-light text-primary-600 leading-relaxed">
                Получайте практику, кейсы для портфолио и рекомендации от реальных клиентов
              </p>
            </div>
            <div className="text-center">
              <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 rounded-apple bg-primary-50 flex items-center justify-center">
                  <ArrowTrendingUpIcon className="w-7 h-7 text-primary-700" />
                </div>
              </div>
              <h3 className="text-xl font-normal mb-3 text-primary-900 tracking-tight">Рост</h3>
              <p className="text-base font-light text-primary-600 leading-relaxed">
                Развивайтесь вместе: специалисты получают опыт, компании — результаты
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-primary-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-light mb-6 text-primary-900 tracking-tight">
            Готовы начать?
          </h2>
          <p className="text-lg font-light text-primary-600 mb-12 leading-relaxed">
            Присоединяйтесь к сообществу профессионалов, которые растут вместе
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/specialists"
              className="bg-primary-900 text-white px-8 py-4 rounded-apple font-normal hover:bg-primary-800 transition-colors text-base tracking-tight"
            >
              Найти специалиста
            </Link>
            <Link
              href="/projects"
              className="bg-white text-primary-900 px-8 py-4 rounded-apple font-normal hover:bg-primary-100 transition-colors border border-primary-200 text-base tracking-tight"
            >
              Найти проект
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

