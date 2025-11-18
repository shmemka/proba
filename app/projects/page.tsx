'use client'

import { useState, useEffect, useMemo, memo, useCallback } from 'react'
import Link from 'next/link'
import { MagnifyingGlassIcon, PlusIcon, CalendarIcon, BriefcaseIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { readJson } from '@/lib/storage'
import { getProjects, getCurrentUser, isSupabaseAvailable } from '@/lib/supabase'
import { ProjectCardSkeleton } from '@/components/SkeletonLoader'
import ProjectDrawer from '@/components/ProjectDrawer'

type Specialization = 'Дизайн' | 'SMM' | 'Веб-разработка' | 'Другое'

interface Project {
  id: string
  title: string
  description: string
  deadline: string
  status: 'open' | 'in_progress' | 'completed'
  applicationsCount: number
  specialization?: Specialization
  created_at?: string
  user_id?: string
}

const SUPABASE_AVAILABLE = isSupabaseAvailable()

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [selectedSpecialization, setSelectedSpecialization] = useState<Specialization | ''>('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'all' | 'my' | 'my-applications'>('all')
  const [isMyProjectsModalOpen, setIsMyProjectsModalOpen] = useState(false)
  const [isMyApplicationsModalOpen, setIsMyApplicationsModalOpen] = useState(false)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [myProjects, setMyProjects] = useState<Project[]>([])
  const [myApplications, setMyApplications] = useState<Project[]>([])

  // Debounce для поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Загружаем текущего пользователя
  useEffect(() => {
    const loadUser = async () => {
      if (SUPABASE_AVAILABLE) {
        try {
          const user = await getCurrentUser()
          if (user) {
            setCurrentUserId(user.id)
          }
        } catch (error) {
          console.error('Ошибка загрузки пользователя:', error)
        }
      } else {
        const user = readJson<any>('user', null)
        if (user) {
          setCurrentUserId(user.id)
        }
      }
    }
    loadUser()
  }, [])

  // Загружаем задачи из Supabase или localStorage
  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true)
      try {
        if (SUPABASE_AVAILABLE) {
          // Всегда загружаем все задачи для основного списка
          const supabaseProjects = await getProjects()
          
          // Преобразуем данные из Supabase в формат приложения
          const formattedProjects: Project[] = supabaseProjects.map((p: any) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            deadline: p.deadline || '',
            status: p.status || 'open',
            applicationsCount: p.applicationsCount || 0,
            specialization: p.specialization as Specialization,
            created_at: p.created_at,
            user_id: p.user_id,
          }))
          
          setProjects(formattedProjects)
        } else {
          loadFromLocalStorage()
        }
      } catch (error) {
        console.error('Ошибка загрузки задач:', error)
        // Fallback на localStorage
        loadFromLocalStorage()
      } finally {
        setIsLoading(false)
      }
    }
    
    const loadFromLocalStorage = () => {
      const savedProjects = readJson<Project[]>('projects', [])
      const allProjects: Project[] = []
      savedProjects.forEach((saved: Project) => {
        if (!allProjects.find(p => p.id === saved.id)) {
          allProjects.push(saved)
        }
      })
      
      // Всегда показываем открытые задачи в основном списке
      const filtered = allProjects.filter(p => p.status === 'open')
      
      const applications = readJson<any[]>('applications', [])
      filtered.forEach(project => {
        const projectApplications = applications.filter((app: any) => app.projectId === project.id)
        project.applicationsCount = projectApplications.length
      })
      
      setProjects(filtered)
    }
    
    loadProjects()
    
    if (!SUPABASE_AVAILABLE) {
      const handleStorageChange = () => {
        loadProjects()
      }
    
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          loadProjects()
        }
      }

      window.addEventListener('storage', handleStorageChange)
      document.addEventListener('visibilitychange', handleVisibilityChange)
    
      return () => {
        window.removeEventListener('storage', handleStorageChange)
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId])

  // Загружаем "Мои задачи" и "Мои отклики" для модальных окон
  useEffect(() => {
    const loadMyData = async () => {
      if (!currentUserId) return

      try {
        if (SUPABASE_AVAILABLE) {
          const [myProjectsData, myApplicationsData] = await Promise.all([
            getProjects({ userId: currentUserId }),
            getProjects({ specialistId: currentUserId }),
          ])

          const formattedMyProjects: Project[] = myProjectsData.map((p: any) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            deadline: p.deadline || '',
            status: p.status || 'open',
            applicationsCount: p.applicationsCount || 0,
            specialization: p.specialization as Specialization,
            created_at: p.created_at,
            user_id: p.user_id,
          }))

          const formattedMyApplications: Project[] = myApplicationsData.map((p: any) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            deadline: p.deadline || '',
            status: p.status || 'open',
            applicationsCount: p.applicationsCount || 0,
            specialization: p.specialization as Specialization,
            created_at: p.created_at,
            user_id: p.user_id,
          }))

          setMyProjects(formattedMyProjects)
          setMyApplications(formattedMyApplications)
        }
      } catch (error) {
        console.error('Ошибка загрузки моих данных:', error)
      }
    }

    loadMyData()
  }, [currentUserId])

  // Блокируем скролл при открытии модальных окон
  useEffect(() => {
    if (isMyProjectsModalOpen || isMyApplicationsModalOpen || isSearchModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMyProjectsModalOpen, isMyApplicationsModalOpen, isSearchModalOpen])

  const filteredProjects = useMemo(() => {
    const normalizedQuery = debouncedSearchQuery.trim().toLowerCase()

    const matches = projects.filter(project => {
      const matchesSearch =
        project.title.toLowerCase().includes(normalizedQuery) ||
        project.description.toLowerCase().includes(normalizedQuery)
      
      const matchesSpecialization = !selectedSpecialization || project.specialization === selectedSpecialization
      
      return matchesSearch && matchesSpecialization
    })

    // Сортировка от новых к старым по времени создания
    return matches.sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
      if (isNaN(aTime) && isNaN(bTime)) return 0
      if (isNaN(aTime)) return 1
      if (isNaN(bTime)) return -1
      return bTime - aTime // От новых к старым
    })
  }, [projects, debouncedSearchQuery, selectedSpecialization])

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

  const handleProjectClick = useCallback((projectId: string) => {
    setSelectedProjectId(projectId)
    setIsDrawerOpen(true)
    setIsMyProjectsModalOpen(false)
    setIsMyApplicationsModalOpen(false)
  }, [])

  const handleCloseDrawer = useCallback(() => {
    setIsDrawerOpen(false)
    setSelectedProjectId(null)
  }, [])

  const ProjectCard = memo(({ project, onClick }: { project: Project; onClick: (id: string) => void }) => {
    const formattedDeadline = useMemo(() => formatDate(project.deadline), [project.deadline])
    
    return (
      <button
        onClick={() => onClick(project.id)}
        className="w-full text-left bg-white rounded-apple border border-primary-100 hover:border-primary-200 hover:scale-[1.01] transition-all duration-200 ease-out active:scale-[0.99] p-4 sm:p-6 lg:p-8"
      >
        <div className="flex justify-between items-start mb-3 sm:mb-4 gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl sm:text-2xl font-normal text-primary-900 mb-2 sm:mb-3 tracking-tight">{project.title}</h3>
            <p className="text-sm sm:text-base font-light text-primary-600 mb-4 sm:mb-6 line-clamp-2 leading-relaxed">{project.description}</p>
          </div>
          <span className="ml-2 sm:ml-6 px-2 sm:px-3 py-1 sm:py-1.5 bg-primary-50 text-primary-700 rounded-apple text-xs font-light whitespace-nowrap flex-shrink-0">
            {project.status === 'open' ? 'Открыта' : project.status === 'in_progress' ? 'В работе' : 'Завершена'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6 text-xs sm:text-sm font-light text-primary-500 mb-4 sm:mb-6">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4" />
            <span>Срок: {formattedDeadline}</span>
          </div>
          <div className="ml-auto">
            <span className="text-primary-700 font-normal">
              {project.applicationsCount} {project.applicationsCount === 1 ? 'отклик' : 'откликов'}
            </span>
          </div>
        </div>
      </button>
    )
  })
  ProjectCard.displayName = 'ProjectCard'

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-primary-900 mb-2 sm:mb-3 tracking-tight">Задачи</h1>
            <p className="text-base sm:text-lg font-light text-primary-600">Найдите задачу для получения опыта и портфолио</p>
          </div>
          {currentUserId && (
            <div className="flex flex-col sm:flex-row items-center gap-0">
              <Link
                href="/projects/new"
                className="inline-flex flex-col items-center justify-center gap-1.5 px-4 sm:px-5 py-3 sm:py-4 transition-all duration-200 font-normal tracking-tight text-[#FF4600] hover:bg-primary-50 active:scale-95"
              >
                <PlusIcon className="w-5 h-5" />
                <span className="text-xs sm:text-sm whitespace-nowrap">Новая задача</span>
              </Link>
              <div className="w-px h-12 bg-primary-200 mx-1"></div>
              <button
                onClick={() => setIsMyProjectsModalOpen(true)}
                className="inline-flex flex-col items-center justify-center gap-1.5 px-4 sm:px-5 py-3 sm:py-4 transition-all duration-200 font-normal tracking-tight text-primary-700 hover:bg-primary-50 active:scale-95"
              >
                <BriefcaseIcon className="w-5 h-5" />
                <span className="text-xs sm:text-sm whitespace-nowrap">Мои задачи</span>
              </button>
              <div className="w-px h-12 bg-primary-200 mx-1"></div>
              <button
                onClick={() => setIsMyApplicationsModalOpen(true)}
                className="inline-flex flex-col items-center justify-center gap-1.5 px-4 sm:px-5 py-3 sm:py-4 transition-all duration-200 font-normal tracking-tight text-primary-700 hover:bg-primary-50 active:scale-95"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
                <span className="text-xs sm:text-sm whitespace-nowrap">Мои отклики</span>
              </button>
              <div className="w-px h-12 bg-primary-200 mx-1"></div>
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="inline-flex flex-col items-center justify-center gap-1.5 px-4 sm:px-5 py-3 sm:py-4 transition-all duration-200 font-normal tracking-tight text-primary-700 hover:bg-primary-50 active:scale-95"
              >
                <MagnifyingGlassIcon className="w-5 h-5" />
                <span className="text-xs sm:text-sm whitespace-nowrap">Поиск</span>
              </button>
            </div>
          )}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-primary-900 mb-2 sm:mb-3 tracking-tight">Задачи</h1>
          <p className="text-base sm:text-lg font-light text-primary-600">Найдите задачу для получения опыта и портфолио</p>
        </div>
          {currentUserId && (
            <div className="flex flex-col sm:flex-row items-center gap-0">
              <Link
                href="/projects/new"
                className="inline-flex flex-col items-center justify-center gap-1.5 px-4 sm:px-5 py-3 sm:py-4 transition-all duration-200 font-normal tracking-tight text-[#FF4600] hover:bg-primary-50 active:scale-95"
              >
                <PlusIcon className="w-5 h-5" />
                <span className="text-xs sm:text-sm whitespace-nowrap">Новая задача</span>
              </Link>
              <div className="w-px h-12 bg-primary-200 mx-1"></div>
              <button
                onClick={() => setIsMyProjectsModalOpen(true)}
                className="inline-flex flex-col items-center justify-center gap-1.5 px-4 sm:px-5 py-3 sm:py-4 transition-all duration-200 font-normal tracking-tight text-primary-700 hover:bg-primary-50 active:scale-95"
              >
                <BriefcaseIcon className="w-5 h-5" />
                <span className="text-xs sm:text-sm whitespace-nowrap">Мои задачи</span>
              </button>
              <div className="w-px h-12 bg-primary-200 mx-1"></div>
              <button
                onClick={() => setIsMyApplicationsModalOpen(true)}
                className="inline-flex flex-col items-center justify-center gap-1.5 px-4 sm:px-5 py-3 sm:py-4 transition-all duration-200 font-normal tracking-tight text-primary-700 hover:bg-primary-50 active:scale-95"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
                <span className="text-xs sm:text-sm whitespace-nowrap">Мои отклики</span>
              </button>
              <div className="w-px h-12 bg-primary-200 mx-1"></div>
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="inline-flex flex-col items-center justify-center gap-1.5 px-4 sm:px-5 py-3 sm:py-4 transition-all duration-200 font-normal tracking-tight text-primary-700 hover:bg-primary-50 active:scale-95"
              >
                <MagnifyingGlassIcon className="w-5 h-5" />
                <span className="text-xs sm:text-sm whitespace-nowrap">Поиск</span>
              </button>
            </div>
          )}
      </div>

      <div className="mb-6 sm:mb-10">
        <div className="border-b border-primary-200">
          <div className="flex gap-6 overflow-x-auto scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0">
            <button
              onClick={() => setSelectedSpecialization('')}
              className={`relative text-sm font-normal transition-all duration-200 tracking-tight pb-4 whitespace-nowrap ${
                selectedSpecialization === ''
                  ? 'text-[#FF4600]'
                  : 'text-primary-400 hover:text-primary-600'
              }`}
            >
              Все
              {selectedSpecialization === '' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF4600]"></span>
              )}
            </button>
            <button
              onClick={() => setSelectedSpecialization('Дизайн')}
              className={`relative text-sm font-normal transition-all duration-200 tracking-tight pb-4 whitespace-nowrap ${
                selectedSpecialization === 'Дизайн'
                  ? 'text-[#FF4600]'
                  : 'text-primary-400 hover:text-primary-600'
              }`}
            >
              Дизайн
              {selectedSpecialization === 'Дизайн' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF4600]"></span>
              )}
            </button>
            <button
              onClick={() => setSelectedSpecialization('SMM')}
              className={`relative text-sm font-normal transition-all duration-200 tracking-tight pb-4 whitespace-nowrap ${
                selectedSpecialization === 'SMM'
                  ? 'text-[#FF4600]'
                  : 'text-primary-400 hover:text-primary-600'
              }`}
            >
              SMM
              {selectedSpecialization === 'SMM' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF4600]"></span>
              )}
            </button>
            <button
              onClick={() => setSelectedSpecialization('Веб-разработка')}
              className={`relative text-sm font-normal transition-all duration-200 tracking-tight pb-4 whitespace-nowrap ${
                selectedSpecialization === 'Веб-разработка'
                  ? 'text-[#FF4600]'
                  : 'text-primary-400 hover:text-primary-600'
              }`}
            >
              Веб-разработка
              {selectedSpecialization === 'Веб-разработка' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF4600]"></span>
              )}
            </button>
            <button
              onClick={() => setSelectedSpecialization('Другое')}
              className={`relative text-sm font-normal transition-all duration-200 tracking-tight pb-4 whitespace-nowrap ${
                selectedSpecialization === 'Другое'
                  ? 'text-[#FF4600]'
                  : 'text-primary-400 hover:text-primary-600'
              }`}
            >
              Другое
              {selectedSpecialization === 'Другое' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF4600]"></span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredProjects.map((project) => (
          <ProjectCard key={project.id} project={project} onClick={handleProjectClick} />
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12 sm:py-16 lg:py-20">
          <p className="text-primary-600 text-base sm:text-lg font-light mb-2">Задачи не найдены</p>
          <p className="text-primary-500 text-sm sm:text-base font-light">Попробуйте изменить параметры поиска</p>
        </div>
      )}

      <ProjectDrawer
        projectId={selectedProjectId}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />

      {/* Модальное окно "Мои задачи" */}
      {isMyProjectsModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 transition-opacity duration-300 ease-out"
            onClick={() => setIsMyProjectsModalOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="bg-white rounded-apple border border-primary-100 shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-primary-100">
                <h2 className="text-2xl font-light text-primary-900 tracking-tight">Мои задачи</h2>
                <button
                  onClick={() => setIsMyProjectsModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-white border border-primary-200 flex items-center justify-center hover:bg-primary-50 active:scale-95 transition-all duration-200"
                >
                  <XMarkIcon className="w-5 h-5 text-primary-700" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {myProjects.length === 0 ? (
                  <p className="text-primary-500 text-center py-8">У вас пока нет задач</p>
                ) : (
                  <div className="space-y-4">
                    {myProjects.map((project) => (
                      <ProjectCard key={project.id} project={project} onClick={handleProjectClick} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Модальное окно "Мои отклики" */}
      {isMyApplicationsModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 transition-opacity duration-300 ease-out"
            onClick={() => setIsMyApplicationsModalOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="bg-white rounded-apple border border-primary-100 shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-primary-100">
                <h2 className="text-2xl font-light text-primary-900 tracking-tight">Мои отклики</h2>
                <button
                  onClick={() => setIsMyApplicationsModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-white border border-primary-200 flex items-center justify-center hover:bg-primary-50 active:scale-95 transition-all duration-200"
                >
                  <XMarkIcon className="w-5 h-5 text-primary-700" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {myApplications.length === 0 ? (
                  <p className="text-primary-500 text-center py-8">У вас пока нет откликов</p>
                ) : (
                  <div className="space-y-4">
                    {myApplications.map((project) => (
                      <ProjectCard key={project.id} project={project} onClick={handleProjectClick} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Модальное окно "Поиск" */}
      {isSearchModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 transition-opacity duration-300 ease-out"
            onClick={() => setIsSearchModalOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="bg-white rounded-apple border border-primary-100 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-primary-100">
                <h2 className="text-2xl font-light text-primary-900 tracking-tight">Поиск</h2>
                <button
                  onClick={() => setIsSearchModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-white border border-primary-200 flex items-center justify-center hover:bg-primary-50 active:scale-95 transition-all duration-200"
                >
                  <XMarkIcon className="w-5 h-5 text-primary-700" />
                </button>
              </div>
              <div className="p-6">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Поиск задач..."
                    className="w-full pl-12 pr-4 py-3 border border-primary-200 rounded-apple focus:ring-1 focus:ring-primary-900 focus:border-primary-900 bg-white text-primary-900 placeholder-primary-400 font-light text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
