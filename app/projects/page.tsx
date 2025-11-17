'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import Link from 'next/link'
import { MagnifyingGlassIcon, PlusIcon, CalendarIcon, MapPinIcon, TagIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { readJson } from '@/lib/storage'
import { getProjects, isSupabaseAvailable } from '@/lib/supabase'
import { ProjectCardSkeleton } from '@/components/SkeletonLoader'

interface Project {
  id: string
  title: string
  description: string
  company: string
  skills: string[]
  location: string
  deadline: string
  status: 'open' | 'in_progress' | 'completed'
  applicationsCount: number
}


const SUPABASE_AVAILABLE = isSupabaseAvailable()

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [selectedSkill, setSelectedSkill] = useState<string>('')
  const [sortBy, setSortBy] = useState<'deadline' | 'applications'>('deadline')
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  // Debounce для поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Загружаем проекты из Supabase или localStorage
  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true)
      try {
        if (SUPABASE_AVAILABLE) {
          const supabaseProjects = await getProjects()
          // Преобразуем данные из Supabase в формат приложения
          const formattedProjects: Project[] = supabaseProjects.map((p: any) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            company: p.company || 'Компания',
            skills: p.skills || [],
            location: p.location || '',
            deadline: p.deadline || '',
            status: p.status || 'open',
            applicationsCount: p.applicationsCount || 0,
          }))
          
          setProjects(formattedProjects)
        } else {
          loadFromLocalStorage()
        }
      } catch (error) {
        console.error('Ошибка загрузки проектов:', error)
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
      
      const applications = readJson<any[]>('applications', [])
      allProjects.forEach(project => {
        const projectApplications = applications.filter((app: any) => app.projectId === project.id)
        project.applicationsCount = projectApplications.length
      })
      
      setProjects(allProjects)
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
  }, [])

  const allSkills = useMemo(() => {
    return Array.from(new Set(projects.flatMap(p => p.skills))).sort((a, b) => a.localeCompare(b, 'ru'))
  }, [projects])

  const filteredProjects = useMemo(() => {
    const normalizedQuery = debouncedSearchQuery.trim().toLowerCase()
    const now = new Date()

    const matches = projects.filter(project => {
      const matchesSearch =
        project.title.toLowerCase().includes(normalizedQuery) ||
        project.description.toLowerCase().includes(normalizedQuery) ||
        project.skills.some(skill => skill.toLowerCase().includes(normalizedQuery))
      const matchesSkill = !selectedSkill || project.skills.includes(selectedSkill)
      const isOpen = project.status === 'open'
      const deadlineDate = new Date(project.deadline)
      const isDeadlineValid = !isNaN(deadlineDate.getTime()) && deadlineDate >= now

      return matchesSearch && matchesSkill && isOpen && isDeadlineValid
    })

    return matches.sort((a, b) => {
      if (sortBy === 'applications') {
        return (b.applicationsCount || 0) - (a.applicationsCount || 0)
      }

      const aTime = new Date(a.deadline).getTime()
      const bTime = new Date(b.deadline).getTime()
      if (isNaN(aTime) && isNaN(bTime)) return 0
      if (isNaN(aTime)) return 1
      if (isNaN(bTime)) return -1
      return aTime - bTime
    })
  }, [projects, debouncedSearchQuery, selectedSkill, sortBy])

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

  const ProjectCard = memo(({ project }: { project: Project }) => {
    const formattedDeadline = useMemo(() => formatDate(project.deadline), [project.deadline])
    
    return (
      <Link
        href={`/projects/${project.id}`}
        prefetch={true}
        className="block bg-white rounded-apple border border-primary-100 hover:border-primary-200 transition-colors p-4 sm:p-6 lg:p-8"
      >
        <div className="flex justify-between items-start mb-3 sm:mb-4 gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl sm:text-2xl font-normal text-primary-900 mb-2 sm:mb-3 tracking-tight">{project.title}</h3>
            <p className="text-sm sm:text-base font-light text-primary-600 mb-4 sm:mb-6 line-clamp-2 leading-relaxed">{project.description}</p>
          </div>
          <span className="ml-2 sm:ml-6 px-2 sm:px-3 py-1 sm:py-1.5 bg-primary-50 text-primary-700 rounded-apple text-xs font-light whitespace-nowrap flex-shrink-0">
            Открыт
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6 text-xs sm:text-sm font-light text-primary-500 mb-4 sm:mb-6">
          <div className="flex items-center gap-1.5">
            <TagIcon className="w-4 h-4" />
            <span className="font-normal">{project.company}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPinIcon className="w-4 h-4" />
            <span>{project.location}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4" />
            <span>До {formattedDeadline}</span>
          </div>
          <div className="ml-auto">
            <span className="text-primary-700 font-normal">
              {project.applicationsCount} {project.applicationsCount === 1 ? 'отклик' : 'откликов'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {project.skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center px-3 py-1.5 bg-primary-50 text-primary-700 rounded-apple text-xs font-light"
            >
              {skill}
            </span>
          ))}
        </div>
      </Link>
    )
  })
  ProjectCard.displayName = 'ProjectCard'

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-primary-900 mb-2 sm:mb-3 tracking-tight">Активные проекты</h1>
            <p className="text-base sm:text-lg font-light text-primary-600">Найдите проект для получения опыта и портфолио</p>
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
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-primary-900 mb-2 sm:mb-3 tracking-tight">Активные проекты</h1>
          <p className="text-base sm:text-lg font-light text-primary-600">Найдите проект для получения опыта и портфолио</p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center justify-center gap-2 bg-primary-900 text-white px-4 sm:px-5 py-2 sm:py-3 rounded-apple hover:bg-primary-800 transition-colors font-normal tracking-tight"
        >
          <PlusIcon className="w-4 h-4" />
          <span className="whitespace-nowrap">Разместить проект</span>
        </Link>
      </div>

      <div className="mb-6 sm:mb-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Поиск по названию, описанию или навыкам..."
            className="w-full pl-12 pr-4 py-3 border border-primary-200 rounded-apple focus:ring-1 focus:ring-primary-900 focus:border-primary-900 bg-white text-primary-900 placeholder-primary-400 font-light text-sm sm:text-base"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="px-4 sm:px-5 py-3 border border-primary-200 rounded-apple hover:bg-primary-50 transition-colors flex items-center justify-center gap-2 text-primary-700 font-normal"
        >
          <FunnelIcon className="w-5 h-5" />
          Фильтры
        </button>
      </div>

      {/* Модальное окно фильтров */}
      {isFilterModalOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
            onClick={() => setIsFilterModalOpen(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-[101] pointer-events-none">
            <div 
              className="bg-white rounded-apple border border-primary-100 shadow-xl p-6 w-full max-w-md mx-4 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-normal text-primary-900 tracking-tight">Фильтры</h2>
                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="p-2 hover:bg-primary-50 rounded-apple transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-primary-600" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-normal text-primary-700 mb-2">
                    Навыки
                  </label>
                  <select
                    value={selectedSkill}
                    onChange={(e) => setSelectedSkill(e.target.value)}
                    className="w-full px-4 py-3 border border-primary-200 rounded-apple focus:ring-1 focus:ring-primary-900 focus:border-primary-900 bg-white text-primary-900 font-light"
                  >
                    <option value="">Все навыки</option>
                    {allSkills.map(skill => (
                      <option key={skill} value={skill}>{skill}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-normal text-primary-700 mb-2">
                    Сортировка
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'deadline' | 'applications')}
                    className="w-full px-4 py-3 border border-primary-200 rounded-apple focus:ring-1 focus:ring-primary-900 focus:border-primary-900 bg-white text-primary-900 font-light"
                  >
                    <option value="deadline">Сначала ближайшие дедлайны</option>
                    <option value="applications">Популярные проекты</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="space-y-4">
        {filteredProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12 sm:py-16 lg:py-20">
          <p className="text-primary-600 text-base sm:text-lg font-light mb-2">Проекты не найдены</p>
          <p className="text-primary-500 text-sm sm:text-base font-light">Попробуйте изменить параметры поиска</p>
        </div>
      )}
    </div>
  )
}
