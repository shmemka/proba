'use client'

import { useState, useEffect, useMemo, memo, useCallback } from 'react'
import Link from 'next/link'
import { MagnifyingGlassIcon, PlusIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { readJson } from '@/lib/storage'
import { getProjects, getCurrentUser, isSupabaseAvailable } from '@/lib/supabase'
import { ProjectCardSkeleton } from '@/components/SkeletonLoader'
import ProjectDrawer from '@/components/ProjectDrawer'

interface Project {
  id: string
  title: string
  description: string
  deadline: string
  status: 'open' | 'in_progress' | 'completed'
  applicationsCount: number
}

type Category = 'all' | 'my' | 'my-applications'

const SUPABASE_AVAILABLE = isSupabaseAvailable()

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category>('all')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

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
          let supabaseProjects: any[] = []
          
          if (selectedCategory === 'my' && currentUserId) {
            // Мои задачи
            supabaseProjects = await getProjects({ userId: currentUserId })
          } else if (selectedCategory === 'my-applications' && currentUserId) {
            // Мои отклики
            supabaseProjects = await getProjects({ specialistId: currentUserId })
          } else {
            // Все задачи
            supabaseProjects = await getProjects()
          }
          
          // Преобразуем данные из Supabase в формат приложения
          const formattedProjects: Project[] = supabaseProjects.map((p: any) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            deadline: p.deadline || '',
            status: p.status || 'open',
            applicationsCount: p.applicationsCount || 0,
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
      
      // Фильтруем по категории
      let filtered = allProjects
      if (selectedCategory === 'my' && currentUserId) {
        // В localStorage нет связи с пользователем, показываем все
        filtered = allProjects
      } else if (selectedCategory === 'my-applications' && currentUserId) {
        const applications = readJson<any[]>('applications', [])
        const userEmail = readJson<any>('user', null)?.email || 'guest'
        const appliedProjectIds = new Set(
          applications
            .filter((app: any) => app.applicantEmail === userEmail)
            .map((app: any) => app.projectId)
        )
        filtered = allProjects.filter(p => appliedProjectIds.has(p.id))
      } else {
        filtered = allProjects.filter(p => p.status === 'open')
      }
      
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
  }, [selectedCategory, currentUserId])

  const filteredProjects = useMemo(() => {
    const normalizedQuery = debouncedSearchQuery.trim().toLowerCase()

    const matches = projects.filter(project => {
      const matchesSearch =
        project.title.toLowerCase().includes(normalizedQuery) ||
        project.description.toLowerCase().includes(normalizedQuery)
      
      return matchesSearch
    })

    return matches.sort((a, b) => {
      const aTime = new Date(a.deadline).getTime()
      const bTime = new Date(b.deadline).getTime()
      if (isNaN(aTime) && isNaN(bTime)) return 0
      if (isNaN(aTime)) return 1
      if (isNaN(bTime)) return -1
      return aTime - bTime
    })
  }, [projects, debouncedSearchQuery])

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
        className="w-full text-left bg-white rounded-apple border border-primary-100 hover:border-primary-200 transition-colors p-4 sm:p-6 lg:p-8"
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
          <Link
            href="/projects/new"
            className="inline-flex items-center justify-center gap-2 bg-primary-900 text-white px-4 sm:px-5 py-2 sm:py-3 rounded-apple hover:bg-primary-800 transition-colors font-normal tracking-tight"
          >
            <PlusIcon className="w-4 h-4" />
            <span className="whitespace-nowrap">Создать задачу</span>
          </Link>
        )}
      </div>

      <div className="mb-6 sm:mb-10">
        {/* Search - Mobile First */}
        <div className="mb-4 sm:mb-0 sm:hidden">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Поиск"
              className="w-full pl-12 pr-4 py-2.5 border border-primary-200 rounded-apple focus:ring-1 focus:ring-primary-900 focus:border-primary-900 bg-white text-primary-900 placeholder-primary-400 font-light text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 pb-4 border-b border-primary-200">
          {/* Segmented Controls */}
          <div className="flex items-center gap-3 sm:gap-6 overflow-x-auto scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`text-sm font-normal transition-colors tracking-tight whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'text-[#FF4600]'
                  : 'text-primary-400 hover:text-primary-600'
              }`}
            >
              Все проекты
            </button>
            {currentUserId && (
              <>
                <button
                  onClick={() => setSelectedCategory('my')}
                  className={`text-sm font-normal transition-colors tracking-tight whitespace-nowrap ${
                    selectedCategory === 'my'
                      ? 'text-[#FF4600]'
                      : 'text-primary-400 hover:text-primary-600'
                  }`}
                >
                  Мои проекты
                </button>
                <button
                  onClick={() => setSelectedCategory('my-applications')}
                  className={`text-sm font-normal transition-colors tracking-tight whitespace-nowrap ${
                    selectedCategory === 'my-applications'
                      ? 'text-[#FF4600]'
                      : 'text-primary-400 hover:text-primary-600'
                  }`}
                >
                  Мои отклики
                </button>
              </>
            )}
          </div>
          
          {/* Search - Desktop */}
          <div className="relative flex-shrink-0 hidden sm:block">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Поиск"
              className="w-64 pl-12 pr-4 py-2.5 border border-primary-200 rounded-apple focus:ring-1 focus:ring-primary-900 focus:border-primary-900 bg-white text-primary-900 placeholder-primary-400 font-light text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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
    </div>
  )
}
