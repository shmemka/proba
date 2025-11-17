'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { MagnifyingGlassIcon, PlusIcon, CalendarIcon, MapPinIcon, TagIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { readJson } from '@/lib/storage'

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

// Моковые данные
const mockProjects: Project[] = [
  {
    id: '1',
    title: 'Разработка лендинга для стартапа',
    description: 'Нужен современный лендинг на React/Next.js для IT-стартапа. Требуется адаптивный дизайн и интеграция с API.',
    company: 'TechStartup Inc.',
    skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS'],
    location: 'Москва',
    deadline: '2024-02-15',
    status: 'open',
    applicationsCount: 3,
  },
  {
    id: '2',
    title: 'Дизайн мобильного приложения',
    description: 'Требуется UI/UX дизайнер для создания дизайна мобильного приложения для доставки еды. Нужны все экраны и прототипы.',
    company: 'FoodDelivery Co.',
    skills: ['Figma', 'UI/UX', 'Mobile Design'],
    location: 'Санкт-Петербург',
    deadline: '2024-02-20',
    status: 'open',
    applicationsCount: 5,
  },
  {
    id: '3',
    title: 'Написание контента для блога',
    description: 'Ищем копирайтера для написания статей на тему маркетинга и бизнеса. Нужно 10 статей по 2000+ слов каждая.',
    company: 'Marketing Blog',
    skills: ['Копирайтинг', 'SEO', 'Контент-маркетинг'],
    location: 'Удаленно',
    deadline: '2024-03-01',
    status: 'open',
    applicationsCount: 2,
  },
  {
    id: '4',
    title: 'Backend API для веб-приложения',
    description: 'Разработка REST API на Node.js с использованием PostgreSQL. Нужна аутентификация, CRUD операции, интеграция с платежной системой.',
    company: 'WebApp Solutions',
    skills: ['Node.js', 'PostgreSQL', 'REST API', 'JWT'],
    location: 'Удаленно',
    deadline: '2024-02-25',
    status: 'open',
    applicationsCount: 4,
  },
]

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(mockProjects)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSkill, setSelectedSkill] = useState<string>('')
  const [sortBy, setSortBy] = useState<'deadline' | 'applications'>('deadline')
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  // Загружаем проекты из localStorage и объединяем с моковыми
  useEffect(() => {
    const loadProjects = () => {
      const savedProjects = readJson<Project[]>('projects', [])
      const allProjects = [...mockProjects]
      savedProjects.forEach((saved: Project) => {
        if (!allProjects.find(p => p.id === saved.id)) {
          allProjects.push(saved)
        }
      })
      
      const applications = readJson<any[]>('applications', [])
      allProjects.forEach(project => {
        const projectApplications = applications.filter((app: any) => app.projectId === project.id)
        const isMockProject = mockProjects.find(p => p.id === project.id)
        
        if (isMockProject) {
          const baseCount = isMockProject.applicationsCount || 0
          project.applicationsCount = baseCount + projectApplications.length
        } else {
          project.applicationsCount = projectApplications.length
        }
      })
      
      setProjects(allProjects)
    }
    
    loadProjects()
    
    const handleStorageChange = () => {
      loadProjects()
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('focus', loadProjects)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', loadProjects)
    }
  }, [])

  const allSkills = useMemo(() => {
    return Array.from(new Set(projects.flatMap(p => p.skills))).sort((a, b) => a.localeCompare(b, 'ru'))
  }, [projects])

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
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
  }, [projects, searchQuery, selectedSkill, sortBy])

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

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
      <div className="mb-12 flex justify-between items-start">
        <div>
          <h1 className="text-5xl font-light text-primary-900 mb-3 tracking-tight">Активные проекты</h1>
          <p className="text-lg font-light text-primary-600">Найдите проект для получения опыта и портфолио</p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 bg-primary-900 text-white px-5 py-3 rounded-apple hover:bg-primary-800 transition-colors font-normal tracking-tight"
        >
          <PlusIcon className="w-4 h-4" />
          Разместить проект
        </Link>
      </div>

      <div className="mb-10 flex gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Поиск по названию, описанию или навыкам..."
            className="w-full pl-12 pr-4 py-3 border border-primary-200 rounded-apple focus:ring-1 focus:ring-primary-900 focus:border-primary-900 bg-white text-primary-900 placeholder-primary-400 font-light"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="px-5 py-3 border border-primary-200 rounded-apple hover:bg-primary-50 transition-colors flex items-center gap-2 text-primary-700 font-normal"
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
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="block bg-white rounded-apple border border-primary-100 hover:border-primary-200 transition-colors p-8"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-2xl font-normal text-primary-900 mb-3 tracking-tight">{project.title}</h3>
                <p className="text-base font-light text-primary-600 mb-6 line-clamp-2 leading-relaxed">{project.description}</p>
              </div>
              <span className="ml-6 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-apple text-xs font-light">
                Открыт
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm font-light text-primary-500 mb-6">
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
                <span>До {formatDate(project.deadline)}</span>
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
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-20">
          <p className="text-primary-600 text-lg font-light mb-2">Проекты не найдены</p>
          <p className="text-primary-500 text-base font-light">Попробуйте изменить параметры поиска</p>
        </div>
      )}
    </div>
  )
}
