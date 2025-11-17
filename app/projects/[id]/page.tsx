'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarIcon, MapPinIcon, TagIcon, UsersIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { getProject, createApplication, getCurrentUser, isSupabaseAvailable, hasApplication } from '@/lib/supabase'
import { getActiveUser } from '@/lib/storage'

interface Project {
  id: string
  title: string
  description: string
  fullDescription: string
  company: string
  skills: string[]
  location: string
  deadline: string
  status: 'open' | 'in_progress' | 'completed'
  applicationsCount: number
  requirements: string[]
  deliverables: string[]
}

const mockProjects: Record<string, Project> = {
  '1': {
    id: '1',
    title: 'Разработка лендинга для стартапа',
    description: 'Нужен современный лендинг на React/Next.js для IT-стартапа.',
    fullDescription: 'Мы ищем frontend-разработчика для создания современного лендинга для нашего IT-стартапа. Проект включает в себя разработку адаптивного дизайна, интеграцию с API для формы обратной связи, оптимизацию для SEO и быстрой загрузки. Мы предоставим дизайн-макеты в Figma. Взамен вы получите реальный кейс для портфолио, рекомендацию от нашей компании и возможность использовать проект в своих работах.',
    company: 'TechStartup Inc.',
    skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS'],
    location: 'Москва',
    deadline: '2024-02-15',
    status: 'open',
    applicationsCount: 3,
    requirements: [
      'Опыт работы с React и Next.js',
      'Знание TypeScript',
      'Умение работать с дизайн-макетами',
      'Готовность к обратной связи и правкам',
    ],
    deliverables: [
      'Адаптивный лендинг на Next.js',
      'Интеграция формы обратной связи',
      'SEO-оптимизация',
      'Документация по развертыванию',
    ],
  },
  '2': {
    id: '2',
    title: 'Дизайн мобильного приложения',
    description: 'Требуется UI/UX дизайнер для создания дизайна мобильного приложения для доставки еды.',
    fullDescription: 'Нужны все экраны и прототипы для мобильного приложения доставки еды.',
    company: 'FoodDelivery Co.',
    skills: ['Figma', 'UI/UX', 'Mobile Design'],
    location: 'Санкт-Петербург',
    deadline: '2024-02-20',
    status: 'open',
    applicationsCount: 5,
    requirements: ['Опыт работы с Figma', 'Понимание принципов UI/UX'],
    deliverables: ['Все экраны приложения', 'Прототипы'],
  },
  '3': {
    id: '3',
    title: 'Написание контента для блога',
    description: 'Ищем копирайтера для написания статей на тему маркетинга и бизнеса.',
    fullDescription: 'Нужно 10 статей по 2000+ слов каждая на тему маркетинга и бизнеса.',
    company: 'Marketing Blog',
    skills: ['Копирайтинг', 'SEO', 'Контент-маркетинг'],
    location: 'Удаленно',
    deadline: '2024-03-01',
    status: 'open',
    applicationsCount: 2,
    requirements: ['Опыт написания статей', 'Знание SEO'],
    deliverables: ['10 статей по 2000+ слов'],
  },
  '4': {
    id: '4',
    title: 'Backend API для веб-приложения',
    description: 'Разработка REST API на Node.js с использованием PostgreSQL.',
    fullDescription: 'Нужна аутентификация, CRUD операции, интеграция с платежной системой.',
    company: 'WebApp Solutions',
    skills: ['Node.js', 'PostgreSQL', 'REST API', 'JWT'],
    location: 'Удаленно',
    deadline: '2024-02-25',
    status: 'open',
    applicationsCount: 4,
    requirements: ['Опыт работы с Node.js', 'Знание PostgreSQL'],
    deliverables: ['REST API', 'Документация'],
  },
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [applicationText, setApplicationText] = useState('')
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProject = async () => {
      try {
        if (isSupabaseAvailable()) {
          const [supabaseProject, user] = await Promise.all([
            getProject(params.id),
            getCurrentUser(),
          ])

          if (supabaseProject) {
            const formattedProject: Project = {
              id: supabaseProject.id,
              title: supabaseProject.title,
              description: supabaseProject.description,
              fullDescription: supabaseProject.full_description || supabaseProject.description,
              company: supabaseProject.company || 'Компания',
              skills: supabaseProject.skills || [],
              location: supabaseProject.location || '',
              deadline: supabaseProject.deadline || '',
              status: supabaseProject.status as any,
              applicationsCount: supabaseProject.applicationsCount || 0,
              requirements: supabaseProject.requirements || [],
              deliverables: supabaseProject.deliverables || [],
            }
            setProject(formattedProject)

            if (user) {
              const alreadyApplied = await hasApplication(params.id, user.id)
              if (alreadyApplied) {
                setSubmitted(true)
              }
            }
          } else {
            // Fallback на моковые данные
            loadFromMock()
          }
        } else {
          // Fallback на localStorage
          loadFromLocalStorage()
        }
      } catch (error) {
        console.error('Ошибка загрузки проекта:', error)
        loadFromLocalStorage()
      } finally {
        setLoading(false)
      }
    }

    const loadFromMock = () => {
      const mockProject = mockProjects[params.id]
      if (mockProject) {
        const applications = JSON.parse(localStorage.getItem('applications') || '[]')
        const projectApplications = applications.filter((app: any) => app.projectId === params.id)
        setProject({ ...mockProject, applicationsCount: mockProject.applicationsCount + projectApplications.length })
        
        const user = getActiveUser()
        const userEmail = user?.email || 'guest'
        const userApplication = applications.find(
          (app: any) => app.projectId === params.id && app.applicantEmail === userEmail
        )
        if (userApplication) {
          setSubmitted(true)
        }
      } else {
        router.push('/projects')
      }
    }

    const loadFromLocalStorage = () => {
      const savedProjects = JSON.parse(localStorage.getItem('projects') || '[]')
      const foundProject = savedProjects.find((p: Project) => p.id === params.id)
      
      if (foundProject) {
        const user = getActiveUser()
        const applications = JSON.parse(localStorage.getItem('applications') || '[]')
        const userEmail = user?.email || 'guest'
        const userApplication = applications.find(
          (app: any) => app.projectId === params.id && app.applicantEmail === userEmail
        )
        if (userApplication) {
          setSubmitted(true)
        }
        setProject(foundProject)
      } else {
        loadFromMock()
      }
    }

    loadProject()
  }, [params.id, router])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return 'Дата не указана'
      }
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch {
      return 'Дата не указана'
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!applicationText.trim()) {
      alert('Заполните текст заявки')
      return
    }

    try {
      if (isSupabaseAvailable()) {
        // Используем Supabase
        const user = await getCurrentUser()
        if (!user) {
          alert('Необходимо войти в систему')
          router.push('/login?redirect=' + encodeURIComponent(`/projects/${params.id}`))
          return
        }

        const alreadyApplied = await hasApplication(params.id, user.id)
        if (alreadyApplied) {
          alert('Вы уже подали заявку на этот проект')
          return
        }

        // Создаем заявку
        await createApplication({
          project_id: params.id,
          specialist_id: user.id,
          message: applicationText.trim(),
        })

        // Обновляем счетчик заявок
        if (project) {
          setProject({ ...project, applicationsCount: (project.applicationsCount || 0) + 1 })
        }

        setSubmitted(true)
        setShowApplicationForm(false)
        setApplicationText('')
      } else {
        // Fallback на localStorage
        const user = getActiveUser()
        const applications = JSON.parse(localStorage.getItem('applications') || '[]')
        const userEmail = user?.email || 'guest'
        
        const existingApplication = applications.find(
          (app: any) => app.projectId === params.id && app.applicantEmail === userEmail
        )
        
        if (existingApplication) {
          alert('Вы уже подали заявку на этот проект')
          return
        }

        applications.push({
          id: Date.now().toString(),
          projectId: params.id,
          projectTitle: project?.title,
          applicantEmail: userEmail,
          applicantName: user?.name || 'Гость',
          text: applicationText,
          date: new Date().toISOString(),
        })
        
        localStorage.setItem('applications', JSON.stringify(applications))
        
        if (project) {
          const projects = JSON.parse(localStorage.getItem('projects') || '[]')
          const projectIndex = projects.findIndex((p: Project) => p.id === params.id)
          if (projectIndex >= 0) {
            const allApplications = JSON.parse(localStorage.getItem('applications') || '[]')
            const projectApplications = allApplications.filter((app: any) => app.projectId === params.id)
            projects[projectIndex].applicationsCount = projectApplications.length
            localStorage.setItem('projects', JSON.stringify(projects))
          }
          
          const allApplications = JSON.parse(localStorage.getItem('applications') || '[]')
          const projectApplications = allApplications.filter((app: any) => app.projectId === params.id)
          const isMockProject = mockProjects[params.id]
          if (isMockProject) {
            setProject({ ...project, applicationsCount: isMockProject.applicationsCount + projectApplications.length })
          } else {
            setProject({ ...project, applicationsCount: projectApplications.length })
          }
        }
        
        setSubmitted(true)
        setShowApplicationForm(false)
        setApplicationText('')
      }
    } catch (error: any) {
      console.error('Ошибка подачи заявки:', error)
      alert(error?.message || 'Не удалось отправить заявку. Попробуйте снова.')
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center text-primary-600 font-light">Загрузка...</div>
      </div>
    )
  }

  if (!project) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 pt-16 sm:pt-20 lg:pt-16">
      <div className="bg-white rounded-apple border border-primary-100 p-4 sm:p-6 lg:p-10 mb-4 sm:mb-6">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-primary-900 mb-3 sm:mb-4 tracking-tight">{project.title}</h1>
              <div className="flex items-center gap-2 text-primary-600 mb-3 sm:mb-4">
                <TagIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-normal text-sm sm:text-base">{project.company}</span>
              </div>
            </div>
            <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-primary-50 text-primary-700 rounded-apple text-xs font-light whitespace-nowrap self-start sm:self-auto">
              Открыт
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6 text-xs sm:text-sm font-light text-primary-500 mb-6 sm:mb-8">
            <div className="flex items-center gap-1.5">
              <MapPinIcon className="w-4 h-4" />
              <span>{project.location}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4" />
              <span>До {formatDate(project.deadline)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <UsersIcon className="w-4 h-4" />
              <span>{project.applicationsCount} {project.applicationsCount === 1 ? 'отклик' : 'откликов'}</span>
            </div>
          </div>
        </div>

        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-light text-primary-900 mb-3 sm:mb-4 tracking-tight">Описание проекта</h2>
          <p className="text-sm sm:text-base font-light text-primary-700 leading-relaxed whitespace-pre-line">{project.fullDescription}</p>
        </div>

        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-light text-primary-900 mb-3 sm:mb-4 tracking-tight">Требуемые навыки</h2>
          <div className="flex flex-wrap gap-2">
            {project.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-primary-50 text-primary-700 rounded-apple text-xs sm:text-sm font-light"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {project.requirements && project.requirements.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-light text-primary-900 mb-3 sm:mb-4 tracking-tight">Требования</h2>
            <ul className="space-y-2 text-primary-700 font-light">
              {project.requirements.map((req, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary-400 mt-1">•</span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {project.deliverables && project.deliverables.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-light text-primary-900 mb-3 sm:mb-4 tracking-tight">Результат работы</h2>
            <ul className="space-y-2 text-primary-700 font-light">
              {project.deliverables.map((deliverable, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary-400 mt-1">•</span>
                  <span>{deliverable}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {submitted ? (
          <div className="bg-primary-50 border border-primary-200 text-primary-700 px-5 py-4 rounded-apple text-sm font-light">
            Ваша заявка успешно отправлена! Компания свяжется с вами в ближайшее время.
          </div>
        ) : showApplicationForm ? (
          <form onSubmit={handleSubmit} className="border-t border-primary-100 pt-6 sm:pt-8">
            <h3 className="text-lg sm:text-xl font-light text-primary-900 mb-3 sm:mb-4 tracking-tight">Подать заявку</h3>
            <div className="mb-4 sm:mb-6">
              <label htmlFor="application" className="block text-sm font-light text-primary-700 mb-2">
                Расскажите о себе и почему вы подходите для этого проекта
              </label>
              <textarea
                id="application"
                rows={6}
                className="w-full px-4 sm:px-5 py-3 sm:py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white text-sm sm:text-base"
                placeholder="Опишите ваш опыт, навыки и мотивацию..."
                value={applicationText}
                onChange={(e) => setApplicationText(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 bg-primary-900 text-white px-6 py-3 sm:py-4 rounded-apple hover:bg-primary-800 transition-colors font-normal tracking-tight"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
                Отправить заявку
              </button>
              <button
                type="button"
                onClick={() => setShowApplicationForm(false)}
                className="border border-primary-200 text-primary-700 px-6 py-3 sm:py-4 rounded-apple hover:bg-primary-50 transition-colors font-normal tracking-tight"
              >
                Отмена
              </button>
            </div>
          </form>
        ) : (
          <div className="border-t border-primary-100 pt-6 sm:pt-8">
            <button
              onClick={() => setShowApplicationForm(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary-900 text-white px-6 py-3 sm:py-4 rounded-apple hover:bg-primary-800 transition-colors font-normal tracking-tight"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
              Подать заявку на проект
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

