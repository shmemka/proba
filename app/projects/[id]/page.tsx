'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CalendarIcon, PaperAirplaneIcon, UserIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline'
import { getProject, createApplication, getCurrentUser, isSupabaseAvailable, hasApplication, getApplications } from '@/lib/supabase'
import { getActiveUser } from '@/lib/storage'

interface Project {
  id: string
  title: string
  description: string
  deadline: string
  status: 'open' | 'in_progress' | 'completed'
  applicationsCount: number
  user_id?: string
}

interface Application {
  id: string
  message: string
  created_at: string
  specialists?: {
    id: string
    first_name: string
    last_name: string
    email: string
    telegram: string
    avatar_url?: string
    specialization: string
    bio?: string
  }
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [applicationText, setApplicationText] = useState('')
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [applications, setApplications] = useState<Application[]>([])
  const [showApplications, setShowApplications] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const loadProject = async () => {
      try {
        if (isSupabaseAvailable()) {
          const [supabaseProject, user] = await Promise.all([
            getProject(params.id),
            getCurrentUser(),
          ])

          if (user) {
            setCurrentUserId(user.id)
          }

          if (supabaseProject) {
            const formattedProject: Project = {
              id: supabaseProject.id,
              title: supabaseProject.title,
              description: supabaseProject.description || supabaseProject.full_description || '',
              deadline: supabaseProject.deadline || '',
              status: supabaseProject.status as any,
              applicationsCount: supabaseProject.applicationsCount || 0,
              user_id: supabaseProject.user_id,
            }
            setProject(formattedProject)

            // Проверяем, является ли пользователь владельцем задачи
            if (user && formattedProject.user_id === user.id) {
              setIsOwner(true)
              // Загружаем отклики для владельца
              const apps = await getApplications(params.id)
              setApplications(apps as any[])
            } else if (user) {
              const alreadyApplied = await hasApplication(params.id, user.id)
              if (alreadyApplied) {
                setSubmitted(true)
              }
            }
          } else {
            router.push('/projects')
          }
        } else {
          // Fallback на localStorage
          const savedProjects = JSON.parse(localStorage.getItem('projects') || '[]')
          const foundProject = savedProjects.find((p: Project) => p.id === params.id)
          
          if (foundProject) {
            const user = getActiveUser()
            if (user) {
              setCurrentUserId(user.id)
            }
            
            // Проверяем, является ли пользователь владельцем задачи
            const userEmail = user?.email || ''
            const isProjectOwner = foundProject.user_id === user?.id || 
                                   (foundProject as any).company_id === user?.id ||
                                   (foundProject as any).createdBy === userEmail
            
            if (isProjectOwner) {
              setIsOwner(true)
              // Загружаем отклики для владельца из localStorage
              const applications = JSON.parse(localStorage.getItem('applications') || '[]')
              const projectApplications = applications
                .filter((app: any) => app.projectId === params.id)
                .map((app: any) => ({
                  id: app.id,
                  message: app.text,
                  created_at: app.date,
                  specialists: {
                    id: app.applicantEmail,
                    first_name: app.applicantName?.split(' ')[0] || '',
                    last_name: app.applicantName?.split(' ').slice(1).join(' ') || '',
                    email: app.applicantEmail,
                    telegram: '',
                    specialization: '',
                  }
                }))
              setApplications(projectApplications)
            } else {
              // Проверяем, подал ли пользователь уже заявку
            const applications = JSON.parse(localStorage.getItem('applications') || '[]')
            const userApplication = applications.find(
              (app: any) => app.projectId === params.id && app.applicantEmail === userEmail
            )
            if (userApplication) {
              setSubmitted(true)
            }
            }
            
            setProject(foundProject)
          } else {
            router.push('/projects')
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки задачи:', error)
        router.push('/projects')
      } finally {
        setLoading(false)
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
        const user = await getCurrentUser()
        if (!user) {
          alert('Необходимо войти в систему')
          router.push('/login?redirect=' + encodeURIComponent(`/projects/${params.id}`))
          return
        }

        const alreadyApplied = await hasApplication(params.id, user.id)
        if (alreadyApplied) {
          alert('Вы уже подали заявку на эту задачу')
          return
        }

        await createApplication({
          project_id: params.id,
          specialist_id: user.id,
          message: applicationText.trim(),
        })

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
          alert('Вы уже подали заявку на эту задачу')
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
          setProject({ ...project, applicationsCount: (project.applicationsCount || 0) + 1 })
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
            </div>
            <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-primary-50 text-primary-700 rounded-apple text-xs font-light whitespace-nowrap self-start sm:self-auto">
              {project.status === 'open' ? 'Открыта' : project.status === 'in_progress' ? 'В работе' : 'Завершена'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6 text-xs sm:text-sm font-light text-primary-500 mb-6 sm:mb-8">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4" />
              <span>Срок выполнения: {formatDate(project.deadline)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>{project.applicationsCount} {project.applicationsCount === 1 ? 'отклик' : 'откликов'}</span>
            </div>
          </div>
        </div>

        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-light text-primary-900 mb-3 sm:mb-4 tracking-tight">Описание задачи</h2>
          <p className="text-sm sm:text-base font-light text-primary-700 leading-relaxed whitespace-pre-line">{project.description}</p>
        </div>

        {isOwner && (
          <div className="mb-6 sm:mb-8 border-t border-primary-100 pt-6 sm:pt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-light text-primary-900 tracking-tight">Отклики на задачу</h2>
              <button
                onClick={() => setShowApplications(!showApplications)}
                className="text-sm font-normal text-primary-700 hover:text-primary-900 transition-colors"
              >
                {showApplications ? 'Скрыть' : 'Показать'} ({applications.length})
              </button>
            </div>
            
            {showApplications && (
              <div className="space-y-4">
                {applications.length === 0 ? (
                  <p className="text-primary-500 text-sm font-light">Пока нет откликов</p>
                ) : (
                  applications.map((app) => {
                    const specialist = app.specialists
                    if (!specialist) return null
                    
                    return (
                      <div key={app.id} className="border border-primary-100 rounded-apple p-4 sm:p-6 space-y-4">
                        <div className="flex items-start gap-3 sm:gap-4">
                          {specialist.avatar_url ? (
                            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-apple overflow-hidden flex-shrink-0 border border-primary-100">
                              <Image
                                src={specialist.avatar_url}
                                alt={`${specialist.first_name} ${specialist.last_name}`}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 48px, 56px"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-apple bg-primary-50 flex items-center justify-center text-primary-700 text-sm sm:text-base font-normal flex-shrink-0">
                              {(specialist.first_name?.[0] || '')}{(specialist.last_name?.[0] || '')}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-normal text-primary-900 mb-1 tracking-tight">
                              {specialist.first_name || ''} {specialist.last_name || ''}
                            </h3>
                            <p className="text-xs sm:text-sm font-light text-primary-600 mb-2">{specialist.specialization || 'Специалист'}</p>
                            {specialist.bio && (
                              <p className="text-xs sm:text-sm font-light text-primary-500 line-clamp-2">{specialist.bio}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="bg-primary-50 rounded-apple p-3 sm:p-4">
                          <p className="text-sm font-light text-primary-700 leading-relaxed whitespace-pre-line">{app.message}</p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm font-light text-primary-500">
                          {specialist.email && (
                            <a
                              href={`mailto:${specialist.email}`}
                              className="flex items-center gap-1.5 text-primary-600 hover:text-primary-900 transition-colors"
                            >
                              <EnvelopeIcon className="w-4 h-4" />
                              <span>{specialist.email}</span>
                            </a>
                          )}
                          {specialist.telegram && (
                            <a
                              href={`https://t.me/${specialist.telegram.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-primary-600 hover:text-primary-900 transition-colors"
                            >
                              <PhoneIcon className="w-4 h-4" />
                              <span>{specialist.telegram}</span>
                            </a>
                          )}
                          <Link
                            href={`/specialists/${specialist.id}`}
                            className="flex items-center gap-1.5 text-primary-600 hover:text-primary-900 transition-colors"
                          >
                            <UserIcon className="w-4 h-4" />
                            <span>Профиль специалиста</span>
                          </Link>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )}

        {!isOwner && (
          <>
            {submitted ? (
              <div className="bg-primary-50 border border-primary-200 text-primary-700 px-5 py-4 rounded-apple text-sm font-light">
                Ваша заявка успешно отправлена! Компания свяжется с вами в ближайшее время.
              </div>
            ) : showApplicationForm ? (
              <form onSubmit={handleSubmit} className="border-t border-primary-100 pt-6 sm:pt-8">
                <h3 className="text-lg sm:text-xl font-light text-primary-900 mb-3 sm:mb-4 tracking-tight">Подать заявку</h3>
                <div className="mb-4 sm:mb-6">
                  <label htmlFor="application" className="block text-sm font-light text-primary-700 mb-2">
                    Расскажите о себе и почему вы подходите для этой задачи
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
                  Подать заявку на задачу
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
