'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPinIcon, EnvelopeIcon, CodeBracketIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'

interface Specialist {
  id: string
  name: string
  title: string
  bio: string
  skills: string[]
  location: string
  experience: string
  portfolio: string
  email: string
  github?: string
  projects: Array<{
    title: string
    description: string
    link?: string
  }>
}

const mockSpecialists: Record<string, Specialist> = {
  '1': {
    id: '1',
    name: 'Анна Петрова',
    title: 'Frontend разработчик',
    bio: 'Молодой специалист с опытом разработки на React и TypeScript. Ищу интересные проекты для наработки опыта и расширения портфолио. Готова работать бесплатно ради практики и рекомендаций.',
    skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'JavaScript', 'HTML/CSS'],
    location: 'Москва',
    experience: '1 год',
    portfolio: 'https://github.com/anna',
    email: 'anna@example.com',
    github: 'github.com/anna',
    projects: [
      {
        title: 'Интернет-магазин на React',
        description: 'Полнофункциональный интернет-магазин с корзиной, фильтрами и поиском',
        link: 'https://github.com/anna/shop',
      },
      {
        title: 'Портфолио-сайт',
        description: 'Персональный сайт-портфолио с анимациями и адаптивным дизайном',
        link: 'https://anna-portfolio.vercel.app',
      },
    ],
  },
  '2': {
    id: '2',
    name: 'Дмитрий Смирнов',
    title: 'UI/UX дизайнер',
    bio: 'Дизайнер с опытом создания интерфейсов для мобильных и веб-приложений.',
    skills: ['Figma', 'Adobe XD', 'Photoshop', 'Illustrator'],
    location: 'Санкт-Петербург',
    experience: '6 месяцев',
    portfolio: 'https://dribbble.com/dmitry',
    email: 'dmitry@example.com',
    github: 'github.com/dmitry',
    projects: [],
  },
  '3': {
    id: '3',
    name: 'Мария Козлова',
    title: 'Копирайтер',
    bio: 'Опытный копирайтер в области маркетинга и бизнеса.',
    skills: ['SMM', 'Контент-маркетинг', 'SEO', 'Брендинг'],
    location: 'Екатеринбург',
    experience: '2 года',
    portfolio: 'https://behance.net/maria',
    email: 'maria@example.com',
    projects: [],
  },
  '4': {
    id: '4',
    name: 'Иван Новиков',
    title: 'Backend разработчик',
    bio: 'Backend разработчик с опытом работы с Node.js и Python.',
    skills: ['Node.js', 'Python', 'PostgreSQL', 'Docker'],
    location: 'Новосибирск',
    experience: '1.5 года',
    portfolio: 'https://github.com/ivan',
    email: 'ivan@example.com',
    github: 'github.com/ivan',
    projects: [],
  },
}

export default function SpecialistProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [specialist, setSpecialist] = useState<Specialist | null>(null)
  const [showContact, setShowContact] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Загружаем специалиста из моковых данных или localStorage
    const mockSpecialist = mockSpecialists[params.id]
    if (mockSpecialist) {
      setSpecialist(mockSpecialist)
      setLoading(false)
      return
    }

    // Ищем в сохраненных специалистах
    const savedSpecialists = JSON.parse(localStorage.getItem('specialists') || '[]')
    const foundSpecialist = savedSpecialists.find((s: Specialist) => s.id === params.id)
    
    if (foundSpecialist) {
      setSpecialist(foundSpecialist)
    } else {
      // Если не найден, перенаправляем на список
      router.push('/specialists')
    }
    setLoading(false)
  }, [params.id, router])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center text-primary-600 font-light">Загрузка...</div>
      </div>
    )
  }

  if (!specialist) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 pt-16 sm:pt-20 lg:pt-16">
      <div className="bg-white rounded-apple border border-primary-100 p-4 sm:p-6 lg:p-10 mb-4 sm:mb-6">
        <div className="flex flex-col md:flex-row gap-6 sm:gap-8 mb-6 sm:mb-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-apple bg-primary-50 flex items-center justify-center text-primary-700 text-xl sm:text-2xl font-normal flex-shrink-0">
            {specialist.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-primary-900 mb-2 sm:mb-3 tracking-tight">{specialist.name}</h1>
            <p className="text-lg sm:text-xl font-light text-primary-600 mb-3 sm:mb-4">{specialist.title}</p>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm font-light text-primary-500">
              <div className="flex items-center gap-1.5">
                <MapPinIcon className="w-4 h-4" />
                <span>{specialist.location}</span>
              </div>
              <div>
                <span>Опыт: {specialist.experience}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-light text-primary-900 mb-3 sm:mb-4 tracking-tight">О себе</h2>
          <p className="text-sm sm:text-base font-light text-primary-700 leading-relaxed">{specialist.bio || 'Информация отсутствует'}</p>
        </div>

        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-light text-primary-900 mb-3 sm:mb-4 tracking-tight">Навыки</h2>
          <div className="flex flex-wrap gap-2">
            {specialist.skills.length > 0 ? (
              specialist.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-primary-50 text-primary-700 rounded-apple text-xs sm:text-sm font-light"
                >
                  <CodeBracketIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-primary-500 font-light text-sm sm:text-base">Навыки не указаны</span>
            )}
          </div>
        </div>

        {specialist.projects && specialist.projects.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-light text-primary-900 mb-3 sm:mb-4 tracking-tight">Портфолио</h2>
            <div className="space-y-3 sm:space-y-4">
              {specialist.projects.map((project, index) => (
                <div key={index} className="border border-primary-100 rounded-apple p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0 mb-2">
                    <h3 className="font-normal text-primary-900 text-base sm:text-lg">{project.title}</h3>
                    {project.link && (
                      <a
                        href={project.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-900 active:text-primary-900 flex items-center gap-1.5 text-xs sm:text-sm font-light"
                      >
                        <ArrowTopRightOnSquareIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                        Посмотреть
                      </a>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-light text-primary-600 leading-relaxed">{project.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-primary-100">
          {!showContact ? (
            <button
              onClick={() => setShowContact(true)}
              className="w-full sm:w-auto bg-primary-900 text-white px-6 py-3 sm:py-4 rounded-apple hover:bg-primary-800 active:bg-primary-800 transition-colors font-normal tracking-tight"
            >
              Связаться со специалистом
            </button>
          ) : (
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <a
                href={`mailto:${specialist.email}`}
                className="inline-flex items-center justify-center gap-2 bg-primary-900 text-white px-6 py-3 sm:py-4 rounded-apple hover:bg-primary-800 active:bg-primary-800 transition-colors font-normal tracking-tight"
              >
                <EnvelopeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                Написать на email
              </a>
              {specialist.github && (
                <a
                  href={`https://${specialist.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 border border-primary-200 text-primary-700 px-6 py-3 sm:py-4 rounded-apple hover:bg-primary-50 active:bg-primary-50 transition-colors font-normal tracking-tight"
                >
                  <CodeBracketIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  GitHub профиль
                </a>
              )}
            </div>
          )}
          <Link
            href="/projects"
            className="w-full sm:w-auto border border-primary-200 text-primary-700 px-6 py-3 sm:py-4 rounded-apple hover:bg-primary-50 active:bg-primary-50 transition-colors font-normal tracking-tight text-center"
          >
            Предложить задачу
          </Link>
        </div>
      </div>
    </div>
  )
}

