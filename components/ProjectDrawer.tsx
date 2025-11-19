'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { XMarkIcon, CalendarIcon, PaperAirplaneIcon, UserIcon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline'
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

interface ProjectDrawerProps {
  projectId: string | null
  isOpen: boolean
  onClose: () => void
}

export default function ProjectDrawer({
  projectId,
  isOpen,
  onClose,
}: ProjectDrawerProps) {
  const router = useRouter()
  const leftScrollRef = useRef<HTMLDivElement>(null)
  const rightSectionRef = useRef<HTMLDivElement>(null)
  
  const [project, setProject] = useState<Project | null>(null)
  const [applicationText, setApplicationText] = useState('')
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [applications, setApplications] = useState<Application[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) {
        setProject(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        if (isSupabaseAvailable()) {
          const [supabaseProject, user] = await Promise.all([
            getProject(projectId),
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
              const apps = await getApplications(projectId)
              setApplications(apps as any[])
            } else if (user) {
              const alreadyApplied = await hasApplication(projectId, user.id)
              if (alreadyApplied) {
                setSubmitted(true)
              }
            }
          }
        } else {
          // Fallback на localStorage
          const savedProjects = JSON.parse(localStorage.getItem('projects') || '[]')
          const foundProject = savedProjects.find((p: Project) => p.id === projectId)
          
          if (foundProject) {
            const user = getActiveUser()
            if (user) {
              setCurrentUserId(user.id)
            }
            
            // Проверяем, является ли пользователь владельцем задачи
            // В localStorage проверяем по user_id или по user (для старых данных)
            const isOwnerLocal = foundProject.user_id === user?.id || foundProject.user === user?.name || foundProject.user === user?.email
            
            if (isOwnerLocal) {
              setIsOwner(true)
              // Загружаем отклики для владельца
              const applications = JSON.parse(localStorage.getItem('applications') || '[]')
              const projectApplications = applications.filter((app: any) => app.projectId === projectId)
              setApplications(projectApplications.map((app: any) => ({
                id: app.id,
                message: app.text || app.message || '',
                created_at: app.date || app.created_at || new Date().toISOString(),
                specialists: app.specialist ? {
                  id: app.specialist.id || '',
                  first_name: app.specialist.firstName || app.specialist.first_name || '',
                  last_name: app.specialist.lastName || app.specialist.last_name || '',
                  email: app.specialist.email || '',
                  telegram: app.specialist.telegram || '',
                  specialization: app.specialist.specialization || '',
                  bio: app.specialist.bio || '',
                } : undefined,
              })))
            } else {
              // Проверяем, подал ли пользователь заявку
              const applications = JSON.parse(localStorage.getItem('applications') || '[]')
              const userEmail = user?.email || 'guest'
              const userApplication = applications.find(
                (app: any) => app.projectId === projectId && app.applicantEmail === userEmail
              )
              if (userApplication) {
                setSubmitted(true)
              }
            }
            setProject(foundProject)
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки задачи:', error)
      } finally {
        setLoading(false)
      }
    }

    if (isOpen && projectId) {
      loadProject()
      // Сброс состояния формы при открытии
      setApplicationText('')
      setShowApplicationForm(false)
      setSubmitted(false)
    }
  }, [projectId, isOpen])

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

    if (!projectId) return

    try {
      if (isSupabaseAvailable()) {
        const user = await getCurrentUser()
        if (!user) {
          alert('Необходимо войти в систему')
          router.push('/auth?redirect=' + encodeURIComponent(`/projects/${projectId}`))
          return
        }

        const alreadyApplied = await hasApplication(projectId, user.id)
        if (alreadyApplied) {
          alert('Вы уже подали заявку на эту задачу')
          return
        }

        await createApplication({
          project_id: projectId,
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
          (app: any) => app.projectId === projectId && app.applicantEmail === userEmail
        )
        
        if (existingApplication) {
          alert('Вы уже подали заявку на эту задачу')
          return
        }

        applications.push({
          id: Date.now().toString(),
          projectId: projectId,
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

  if (!project && !loading) {
    return null
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`
          fixed inset-0 bg-black/20 backdrop-blur-sm z-50
          transition-opacity duration-300 ease-out
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full max-w-4xl bg-white z-50
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          flex flex-col
          shadow-2xl
        `}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 sm:top-4 right-3 sm:right-4 z-40 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 backdrop-blur-sm border border-primary-200 flex items-center justify-center hover:bg-white active:scale-95 transition-all duration-200 shadow-sm"
          aria-label="Закрыть"
        >
          <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-700" />
        </button>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-primary-600 font-light">Загрузка...</div>
          </div>
        ) : project ? (
          <div className="flex-1 flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden">
            {/* Left side - Project Info (scrollable) */}
            <div 
              ref={leftScrollRef}
              className="lg:w-1/2 p-4 sm:p-6 lg:p-8 xl:p-12 lg:border-r border-primary-100 flex flex-col lg:overflow-y-auto scrollbar-hide"
            >
              {/* Title and Status */}
              <div className="mb-4 sm:mb-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <h1 className="text-2xl sm:text-3xl font-light text-primary-900 tracking-tight flex-1">
                    {project.title}
                  </h1>
                  <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-primary-50 text-primary-700 rounded-apple text-xs font-light whitespace-nowrap self-start sm:self-auto">
                    {project.status === 'open' ? 'Открыта' : project.status === 'in_progress' ? 'В работе' : 'Завершена'}
                  </span>
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6 text-xs sm:text-sm font-light text-primary-500 mb-6">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Срок: {formatDate(project.deadline)}</span>
                  </div>
                  <div>
                    <span className="text-primary-700 font-normal">
                      {project.applicationsCount} {project.applicationsCount === 1 ? 'отклик' : 'откликов'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl font-light text-primary-900 mb-3 sm:mb-4 tracking-tight">Описание задачи</h2>
                <p className="text-sm sm:text-base font-light text-primary-700 leading-relaxed whitespace-pre-line">
                  {project.description}
                </p>
              </div>

              {/* Application Form (for non-owners) */}
              {!isOwner && (
                <div className="lg:mt-auto pt-8 border-t border-primary-100">
                  {submitted ? (
                    <div className="bg-primary-50 border border-primary-200 text-primary-700 px-5 py-4 rounded-apple text-sm font-light">
                      Ваша заявка успешно отправлена! Компания свяжется с вами в ближайшее время.
                    </div>
                  ) : showApplicationForm ? (
                    <form onSubmit={handleSubmit}>
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
                    <button
                      onClick={() => setShowApplicationForm(true)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary-900 text-white px-6 py-3 sm:py-4 rounded-apple hover:bg-primary-800 transition-colors font-normal tracking-tight"
                    >
                      <PaperAirplaneIcon className="w-5 h-5" />
                      Подать заявку на задачу
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right side - Applications or Empty (fixed on desktop, scrollable on mobile) */}
            <div 
              ref={rightSectionRef}
              className="lg:w-1/2 lg:sticky lg:top-0 lg:h-screen relative bg-primary-50 flex flex-col min-h-[300px] sm:min-h-[400px] lg:min-h-0 lg:overflow-hidden"
            >
              {isOwner ? (
                <>
                  {/* Заголовок откликов (фиксированный) */}
                  <div className="relative z-20 pt-4 sm:pt-6 lg:pt-8 pl-4 sm:pl-6 lg:pl-8 pr-16 sm:pr-20 pb-3 sm:pb-4 bg-gradient-to-b from-primary-50 via-primary-50/95 to-transparent backdrop-blur-sm">
                    <h3 className="text-xl sm:text-2xl font-normal text-primary-900 tracking-tight">
                      Отклики на задачу
                    </h3>
                    <div className="mt-2 text-xs sm:text-sm font-light text-primary-500">
                      {applications.length} {applications.length === 1 ? 'отклик' : 'откликов'}
                    </div>
                  </div>
                  
                  {/* Размытие сверху для читаемости (только на desktop) */}
                  <div className="hidden lg:block absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-primary-50 via-primary-50/80 to-transparent backdrop-blur-sm pointer-events-none z-10"></div>

                  {/* Список откликов (скроллируемый на desktop, обычный на mobile) */}
                  <div className="flex-1 lg:overflow-y-auto scrollbar-hide relative">
                    {applications.length === 0 ? (
                      <div className="p-8 text-center flex items-center justify-center h-full">
                        <p className="text-primary-500 font-light">Пока нет откликов</p>
                      </div>
                    ) : (
                      <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4">
                        {applications.map((app) => {
                          const specialist = app.specialists
                          if (!specialist) return null
                          
                          return (
                            <div key={app.id} className="bg-white border border-primary-100 rounded-apple p-4 sm:p-6 space-y-4">
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
                                  <h4 className="text-base sm:text-lg font-normal text-primary-900 mb-1 tracking-tight">
                                    {specialist.first_name || ''} {specialist.last_name || ''}
                                  </h4>
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
                                  onClick={onClose}
                                >
                                  <UserIcon className="w-4 h-4" />
                                  <span>Профиль</span>
                                </Link>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    
                    {/* Размытие снизу (только на desktop) */}
                    <div className="hidden lg:block sticky bottom-0 h-20 bg-gradient-to-t from-primary-50 via-primary-50/95 to-transparent pointer-events-none"></div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center flex items-center justify-center h-full">
                  <p className="text-primary-500 font-light">Подайте заявку, чтобы начать работу</p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}

