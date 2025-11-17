'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { MagnifyingGlassIcon, StarIcon } from '@heroicons/react/24/outline'
import { readJson } from '@/lib/storage'
import SpecialistDrawer from '@/components/SpecialistDrawer'
import { getSpecialists, getSpecialist, isSupabaseAvailable } from '@/lib/supabase'

type Specialization = 'Дизайн' | 'SMM' | 'Веб-разработка'

interface Specialist {
  id: string
  firstName: string
  lastName: string
  specialization: Specialization
  bio?: string
  telegram: string
  email?: string
  avatarUrl?: string
  rating: number
  hiredCount: number
  showInSearch?: boolean
  projects?: Array<{
    id: string
    title: string
    description: string
    images?: Array<{
      url: string
    }>
    link?: string
  }>
}

interface FullSpecialist {
  id: string
  firstName: string
  lastName: string
  specialization: Specialization
  bio?: string
  telegram: string
  email?: string
  avatarUrl?: string
  rating: number
  hiredCount: number
  showInSearch?: boolean
  projects?: Array<{
    id: string
    title: string
    description: string
    images?: Array<{
      url: string
    }>
    link?: string
  }>
}

// Моковые данные
const mockSpecialists: Specialist[] = [
  {
    id: '1',
    firstName: 'Анна',
    lastName: 'Петрова',
    specialization: 'Веб-разработка',
    bio: 'Молодой специалист с опытом разработки на React и TypeScript. Ищу интересные проекты для наработки опыта и расширения портфолио.',
    telegram: '@anna_petrova',
    email: 'anna@example.com',
    rating: 4.8,
    hiredCount: 3,
    projects: [
      {
        id: '1',
        title: 'Интернет-магазин на React',
        description: 'Полнофункциональный интернет-магазин с корзиной, фильтрами и поиском',
        images: [
          { url: 'https://picsum.photos/800/600?random=1' },
          { url: 'https://picsum.photos/800/600?random=2' },
          { url: 'https://picsum.photos/800/600?random=3' },
        ],
      },
    ],
  },
  {
    id: '2',
    firstName: 'Дмитрий',
    lastName: 'Смирнов',
    specialization: 'Дизайн',
    bio: 'Дизайнер с опытом создания интерфейсов для мобильных и веб-приложений.',
    telegram: '@dmitry_smirnov',
    email: 'dmitry@example.com',
    rating: 4.9,
    hiredCount: 5,
    projects: [
      {
        id: '1',
        title: 'Дизайн мобильного приложения',
        description: 'UI/UX дизайн для приложения доставки еды',
        images: [
          { url: 'https://picsum.photos/800/600?random=4' },
          { url: 'https://picsum.photos/800/600?random=5' },
        ],
      },
    ],
  },
  {
    id: '3',
    firstName: 'Мария',
    lastName: 'Козлова',
    specialization: 'SMM',
    bio: 'Опытный специалист в области маркетинга и бизнеса.',
    telegram: '@maria_kozlova',
    email: 'maria@example.com',
    rating: 4.7,
    hiredCount: 2,
    projects: [
      {
        id: '1',
        title: 'SMM кампания',
        description: 'Успешная маркетинговая кампания в социальных сетях',
        images: [
          { url: 'https://picsum.photos/800/600?random=6' },
          { url: 'https://picsum.photos/800/600?random=7' },
          { url: 'https://picsum.photos/800/600?random=8' },
        ],
      },
    ],
  },
  {
    id: '4',
    firstName: 'Иван',
    lastName: 'Новиков',
    specialization: 'Веб-разработка',
    telegram: '@ivan_novikov',
    rating: 4.6,
    hiredCount: 1,
    projects: [
      {
        id: '1',
        title: 'Веб-приложение',
        description: 'Современное веб-приложение с использованием современных технологий',
        images: [
          { url: 'https://picsum.photos/800/600?random=9' },
        ],
      },
    ],
  },
]

// Моковые полные данные специалистов
const mockFullSpecialists: Record<string, FullSpecialist> = {
  '1': {
    id: '1',
    firstName: 'Анна',
    lastName: 'Петрова',
    specialization: 'Веб-разработка',
    bio: 'Молодой специалист с опытом разработки на React и TypeScript. Ищу интересные проекты для наработки опыта и расширения портфолио.',
    telegram: '@anna_petrova',
    email: 'anna@example.com',
    rating: 4.8,
    hiredCount: 3,
    projects: [
      {
        id: '1',
        title: 'Интернет-магазин на React',
        description: 'Полнофункциональный интернет-магазин с корзиной, фильтрами и поиском',
        images: [
          { url: 'https://picsum.photos/800/600?random=1' },
          { url: 'https://picsum.photos/800/600?random=2' },
          { url: 'https://picsum.photos/800/600?random=3' },
        ],
        link: 'https://github.com/anna/shop',
      },
      {
        id: '2',
        title: 'Портфолио-сайт',
        description: 'Персональный сайт-портфолио с анимациями и адаптивным дизайном',
        images: [
          { url: 'https://picsum.photos/800/600?random=10' },
          { url: 'https://picsum.photos/800/600?random=11' },
        ],
        link: 'https://anna-portfolio.vercel.app',
      },
    ],
  },
  '2': {
    id: '2',
    firstName: 'Дмитрий',
    lastName: 'Смирнов',
    specialization: 'Дизайн',
    bio: 'Дизайнер с опытом создания интерфейсов для мобильных и веб-приложений.',
    telegram: '@dmitry_smirnov',
    email: 'dmitry@example.com',
    rating: 4.9,
    hiredCount: 5,
    projects: [
      {
        id: '1',
        title: 'Дизайн мобильного приложения',
        description: 'UI/UX дизайн для приложения доставки еды',
        images: [
          { url: 'https://picsum.photos/800/600?random=4' },
          { url: 'https://picsum.photos/800/600?random=5' },
        ],
        link: 'https://dribbble.com/dmitry/food-app',
      },
    ],
  },
  '3': {
    id: '3',
    firstName: 'Мария',
    lastName: 'Козлова',
    specialization: 'SMM',
    bio: 'Опытный специалист в области маркетинга и бизнеса.',
    telegram: '@maria_kozlova',
    email: 'maria@example.com',
    rating: 4.7,
    hiredCount: 2,
    projects: [],
  },
  '4': {
    id: '4',
    firstName: 'Иван',
    lastName: 'Новиков',
    specialization: 'Веб-разработка',
    telegram: '@ivan_novikov',
    rating: 4.6,
    hiredCount: 1,
    projects: [],
  },
}

export default function SpecialistsPage() {
  const [specialists, setSpecialists] = useState<Specialist[]>(mockSpecialists)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSpecialization, setSelectedSpecialization] = useState<Specialization | ''>('')
  const [sortBy, setSortBy] = useState<'rating' | 'hired' | 'name'>('rating')
  const [selectedSpecialist, setSelectedSpecialist] = useState<FullSpecialist | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0)

  // Загружаем специалистов из Supabase или localStorage
  useEffect(() => {
    const loadSpecialists = async () => {
      try {
        if (isSupabaseAvailable()) {
          // Загружаем из Supabase
          const supabaseSpecialists = await getSpecialists()
          const formattedSpecialists: Specialist[] = supabaseSpecialists
            .filter(s => s.show_in_search !== false) // Фильтруем по настройке показа
            .map((s: any) => ({
              id: s.id,
              firstName: s.first_name || '',
              lastName: s.last_name || '',
              specialization: s.specialization as Specialization,
              bio: s.bio || '',
              telegram: s.telegram || '',
              email: s.email || '',
              avatarUrl: s.avatar_url || '',
              rating: 0, // Пока нет рейтинга в БД
              hiredCount: 0, // Пока нет счетчика в БД
              showInSearch: s.show_in_search !== false,
              projects: (s.portfolio && Array.isArray(s.portfolio)) ? s.portfolio : [],
            }))
          
          // Объединяем с моковыми данными
          const allSpecialists = [...mockSpecialists]
          formattedSpecialists.forEach((saved: Specialist) => {
            if (!allSpecialists.find(s => s.id === saved.id)) {
              allSpecialists.push(saved)
            }
          })
          
          setSpecialists(allSpecialists)
        } else {
          // Fallback на localStorage
          loadFromLocalStorage()
        }
      } catch (error) {
        console.error('Ошибка загрузки специалистов:', error)
        loadFromLocalStorage()
      }
    }

    const loadFromLocalStorage = () => {
      const savedSpecialists = readJson<any[]>('specialists', [])
      const allSpecialists = [...mockSpecialists]
      
      savedSpecialists.forEach((saved: any) => {
        let migratedSpecialist: Specialist
        if ('name' in saved && typeof saved.name === 'string') {
          const nameParts = saved.name.split(' ')
          migratedSpecialist = {
            id: saved.id,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            specialization: saved.specialization || 'Дизайн',
            bio: saved.bio || '',
            telegram: saved.telegram || '',
            email: saved.email || '',
            avatarUrl: saved.avatarUrl || '',
            rating: saved.rating || 0,
            hiredCount: saved.hiredCount || 0,
            showInSearch: saved.showInSearch !== undefined ? saved.showInSearch : true,
            projects: saved.projects || [],
          }
        } else {
          migratedSpecialist = {
            id: saved.id,
            firstName: saved.firstName || '',
            lastName: saved.lastName || '',
            specialization: saved.specialization || 'Дизайн',
            bio: saved.bio,
            telegram: saved.telegram || '',
            email: saved.email,
            avatarUrl: saved.avatarUrl || '',
            rating: saved.rating || 0,
            hiredCount: saved.hiredCount || 0,
            showInSearch: saved.showInSearch !== undefined ? saved.showInSearch : true,
            projects: saved.projects || [],
          }
        }
        
        if (!allSpecialists.find(s => s.id === migratedSpecialist.id)) {
          allSpecialists.push(migratedSpecialist)
        }
      })
      setSpecialists(allSpecialists)
    }
    
    loadSpecialists()
    
    const handleStorageChange = () => {
      loadSpecialists()
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('focus', () => loadSpecialists())
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const specializations: Specialization[] = ['Дизайн', 'SMM', 'Веб-разработка']

  const filteredSpecialists = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return specialists
      .filter(specialist => {
        // Фильтруем по настройке "Показывать в поиске"
        if (specialist.showInSearch === false) {
          return false
        }
        
        const firstName = specialist.firstName || ''
        const lastName = specialist.lastName || ''
        const fullName = `${firstName} ${lastName}`.toLowerCase()
        const specialization = specialist.specialization || ''
        const matchesSearch =
          fullName.includes(normalizedQuery) ||
          specialization.toLowerCase().includes(normalizedQuery) ||
          (specialist.bio && specialist.bio.toLowerCase().includes(normalizedQuery))
        const matchesSpecialization = !selectedSpecialization || specialization === selectedSpecialization
        return matchesSearch && matchesSpecialization
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          const nameA = `${a.firstName || ''} ${a.lastName || ''}`
          const nameB = `${b.firstName || ''} ${b.lastName || ''}`
          return nameA.localeCompare(nameB, 'ru')
        }
        if (sortBy === 'rating') {
          return (b.rating || 0) - (a.rating || 0)
        }
        return (b.hiredCount || 0) - (a.hiredCount || 0)
      })
  }, [specialists, searchQuery, selectedSpecialization, sortBy])

  const handleSpecialistClick = async (specialistId: string) => {
    try {
      if (isSupabaseAvailable()) {
        // Загружаем из Supabase
        const specialist = await getSpecialist(specialistId)
        if (specialist) {
          const fullSpecialist: FullSpecialist = {
            id: specialist.id,
            firstName: specialist.first_name || '',
            lastName: specialist.last_name || '',
            specialization: specialist.specialization as Specialization,
            bio: specialist.bio || '',
            telegram: specialist.telegram || '',
            email: specialist.email || '',
            avatarUrl: specialist.avatar_url || '',
            rating: 0,
            hiredCount: 0,
            showInSearch: specialist.show_in_search !== false,
            projects: (specialist.portfolio && Array.isArray(specialist.portfolio)) 
              ? specialist.portfolio.map((p: any, idx: number) => ({
                  id: p.id || `project-${idx}`,
                  title: p.title || '',
                  description: p.description || '',
                  images: p.images || [],
                  link: p.link,
                }))
              : [],
          }
          setSelectedSpecialist(fullSpecialist)
          setCurrentProjectIndex(0)
          setIsDrawerOpen(true)
          return
        }
      }

      // Fallback на моковые данные или localStorage
      const fullSpecialist = mockFullSpecialists[specialistId]
      if (fullSpecialist) {
        setSelectedSpecialist(fullSpecialist)
        setCurrentProjectIndex(0)
        setIsDrawerOpen(true)
      } else {
        const savedSpecialists = readJson<any[]>('specialists', [])
        const found = savedSpecialists.find((s: any) => s.id === specialistId)
        if (found) {
          let migratedSpecialist: FullSpecialist
          if ('name' in found && typeof found.name === 'string') {
            const nameParts = found.name.split(' ')
            migratedSpecialist = {
              id: found.id,
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || '',
              specialization: found.specialization || 'Дизайн',
              bio: found.bio || '',
              telegram: found.telegram || '',
              email: found.email || '',
              avatarUrl: found.avatarUrl || '',
              rating: found.rating || 0,
              hiredCount: found.hiredCount || 0,
              showInSearch: found.showInSearch !== undefined ? found.showInSearch : true,
              projects: (found.projects || []).map((p: any, idx: number) => ({
                id: p.id || `project-${idx}`,
                title: p.title || '',
                description: p.description || '',
                images: p.images || [],
                link: p.link,
              })),
            }
          } else {
            migratedSpecialist = {
              id: found.id,
              firstName: found.firstName || '',
              lastName: found.lastName || '',
              specialization: found.specialization || 'Дизайн',
              bio: found.bio,
              telegram: found.telegram || '',
              email: found.email,
              avatarUrl: found.avatarUrl || '',
              rating: found.rating || 0,
              hiredCount: found.hiredCount || 0,
              showInSearch: found.showInSearch !== undefined ? found.showInSearch : true,
              projects: (found.projects || []).map((p: any, idx: number) => ({
                id: p.id || `project-${idx}`,
                title: p.title || '',
                description: p.description || '',
                images: p.images || [],
                link: p.link,
              })),
            }
          }
          setSelectedSpecialist(migratedSpecialist)
          setCurrentProjectIndex(0)
          setIsDrawerOpen(true)
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки специалиста:', error)
    }
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedSpecialist(null)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
      <div className="mb-8 sm:mb-12">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-primary-900 mb-2 sm:mb-3 tracking-tight">Каталог специалистов</h1>
        <p className="text-base sm:text-lg font-light text-primary-600">Найдите специалиста для вашего проекта</p>
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
              onClick={() => setSelectedSpecialization('')}
              className={`text-sm font-normal transition-colors tracking-tight whitespace-nowrap ${
                selectedSpecialization === ''
                  ? 'text-[#FF4600]'
                  : 'text-primary-400 hover:text-primary-600'
              }`}
            >
              Все
            </button>
            {specializations.map((spec) => (
              <button
                key={spec}
                onClick={() => setSelectedSpecialization(spec)}
                className={`text-sm font-normal transition-colors tracking-tight whitespace-nowrap ${
                  selectedSpecialization === spec
                    ? 'text-[#FF4600]'
                    : 'text-primary-400 hover:text-primary-600'
                }`}
              >
                {spec}
              </button>
            ))}
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

      <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {filteredSpecialists.map((specialist) => (
          <button
            key={specialist.id}
            onClick={() => handleSpecialistClick(specialist.id)}
            className="bg-white rounded-apple border border-primary-100 hover:border-primary-200 transition-colors p-4 sm:p-6 lg:p-8 text-left w-full flex flex-col"
          >
            <div className="flex items-start gap-3 sm:gap-5 mb-3 sm:mb-4 flex-shrink-0">
              {specialist.avatarUrl ? (
                <img
                  src={specialist.avatarUrl}
                  alt={`${specialist.firstName} ${specialist.lastName}`}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-apple object-cover flex-shrink-0 border border-primary-100"
                />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-apple bg-primary-50 flex items-center justify-center text-primary-700 text-sm sm:text-base font-normal flex-shrink-0">
                  {(specialist.firstName?.[0] || '')}{(specialist.lastName?.[0] || '')}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-normal text-primary-900 mb-1 tracking-tight">
                  {specialist.firstName || ''} {specialist.lastName || ''}
                </h3>
                <p className="text-xs sm:text-sm font-light text-primary-600">{specialist.specialization || 'Специалист'}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm font-light text-primary-500 mb-4 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-primary-900 font-normal">★ {specialist.rating}</span>
                <span className="text-primary-400">Рейтинг</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-primary-900 font-normal">{specialist.hiredCount}</span>
                <span className="text-primary-400">Нанят</span>
              </div>
            </div>

            {/* Галерея изображений из проектов */}
            {specialist.projects && specialist.projects.length > 0 && (
              <div className="flex gap-2 sm:gap-3 overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 scrollbar-hide">
                {specialist.projects
                  .flatMap(project => project.images || [])
                  .map((image, index) => (
                    <div key={index} className="flex-shrink-0 w-48 sm:w-56 lg:w-64 h-36 sm:h-42 lg:h-48 rounded-apple overflow-hidden border border-primary-100 bg-primary-50">
                      <img
                        src={image.url}
                        alt={`Портфолио ${index + 1}`}
                        className="w-full h-full object-cover"
                        style={{ aspectRatio: '4/3' }}
                      />
                    </div>
                  ))}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Specialist Drawer */}
      <SpecialistDrawer
        specialist={selectedSpecialist}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        currentProjectIndex={currentProjectIndex}
        onProjectChange={setCurrentProjectIndex}
      />

      {filteredSpecialists.length === 0 && (
        <div className="text-center py-20">
          <p className="text-primary-600 text-lg font-light mb-2">Специалисты не найдены</p>
          <p className="text-primary-500 text-base font-light">Попробуйте изменить параметры поиска</p>
        </div>
      )}
    </div>
  )
}
