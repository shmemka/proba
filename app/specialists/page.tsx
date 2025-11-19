'use client'

import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { MagnifyingGlassIcon, StarIcon, XMarkIcon, UserIcon } from '@heroicons/react/24/outline'
import { readJson } from '@/lib/storage'
import SpecialistDrawer from '@/components/SpecialistDrawer'
import { getSpecialists, getSpecialist, isSupabaseAvailable, getCurrentUser } from '@/lib/supabase'
import { formatSpecialistFromStorage } from '@/lib/utils'
import { SpecialistCardSkeleton } from '@/components/SkeletonLoader'

type Specialization = 'Дизайн' | 'SMM' | 'Веб-разработка'

interface SpecialistProject {
  id: string
  title: string
  description: string
  images?: Array<{
    url: string
  }>
  link?: string
}

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
  projects?: SpecialistProject[]
  hasPortfolioDetails?: boolean
  portfolioPreview?: string[]
}

type FullSpecialist = Specialist

const MAX_PREVIEW_IMAGES = 5

const normalizePreviewArray = (values?: unknown[]): string[] => {
  if (!Array.isArray(values)) {
    return []
  }

  return values
    .filter((value): value is string => {
      if (typeof value !== 'string' || value.trim().length === 0) {
        return false
      }
      // Фильтруем data URLs (они могут быть очень длинными и не подходят для превью)
      // Оставляем только HTTP(S) URLs
      const trimmed = value.trim()
      return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')
    })
    .slice(0, MAX_PREVIEW_IMAGES)
}

const derivePortfolioPreview = (projects?: SpecialistProject[]) => {
  if (!projects) {
    return []
  }

  return projects
    .flatMap((project) => (project.images || []).map((image) => image.url))
    .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
    .slice(0, MAX_PREVIEW_IMAGES)
}


const SUPABASE_AVAILABLE = isSupabaseAvailable()

const specializations: Specialization[] = ['Дизайн', 'SMM', 'Веб-разработка']

export default function SpecialistsPage() {
  const [specialists, setSpecialists] = useState<Specialist[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [selectedSpecialization, setSelectedSpecialization] = useState<Specialization | ''>('')
  const [sortBy, setSortBy] = useState<'rating' | 'hired' | 'name'>('rating')
  const [selectedSpecialist, setSelectedSpecialist] = useState<FullSpecialist | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [currentProjectIndex, setCurrentProjectIndex] = useState(0)
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const specialistDetailsCache = useRef<Map<string, FullSpecialist>>(new Map())


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

  // Debounce для поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Загружаем специалистов из Supabase или localStorage
  useEffect(() => {
    const loadSpecialists = async () => {
      setIsLoading(true)
      try {
        if (SUPABASE_AVAILABLE) {
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
              projects: [],
              hasPortfolioDetails: false,
              portfolioPreview: normalizePreviewArray(s.portfolio_preview),
            }))
          
          setSpecialists(formattedSpecialists)
        } else {
          // Fallback на localStorage
          loadFromLocalStorage()
        }
      } catch (error) {
        console.error('Ошибка загрузки специалистов:', error)
        loadFromLocalStorage()
      } finally {
        setIsLoading(false)
      }
    }

    const loadFromLocalStorage = () => {
      const savedSpecialists = readJson<any[]>('specialists', [])
      const allSpecialists: Specialist[] = []
      const seenIds = new Set<string>()
      
      savedSpecialists.forEach((saved: any) => {
        if (seenIds.has(saved.id)) return
        seenIds.add(saved.id)
        
        const migratedSpecialist = formatSpecialistFromStorage(saved) as Specialist
        allSpecialists.push({
          ...migratedSpecialist,
          hasPortfolioDetails: true,
          portfolioPreview: derivePortfolioPreview(migratedSpecialist.projects),
        })
      })
      setSpecialists(allSpecialists)
    }
    
    loadSpecialists()
    
    if (!SUPABASE_AVAILABLE) {
      const handleStorageChange = () => {
        loadSpecialists()
      }
      
      const handleFocus = () => {
        if (document.visibilityState === 'visible') {
          loadSpecialists()
        }
      }

      window.addEventListener('storage', handleStorageChange)
      document.addEventListener('visibilitychange', handleFocus)

      return () => {
        window.removeEventListener('storage', handleStorageChange)
        document.removeEventListener('visibilitychange', handleFocus)
      }
    }
  }, [])

  const filteredSpecialists = useMemo(() => {
    const normalizedQuery = debouncedSearchQuery.trim().toLowerCase()

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
  }, [specialists, debouncedSearchQuery, selectedSpecialization, sortBy])

  const handleSpecialistClick = useCallback(async (specialistSummary: Specialist) => {
    try {
      const openDrawer = (spec: FullSpecialist) => {
        setSelectedSpecialist(spec)
        setCurrentProjectIndex(0)
        setIsDrawerOpen(true)
        specialistDetailsCache.current.set(spec.id, spec)
      }

      const projects =
        specialistSummary.projects && Array.isArray(specialistSummary.projects)
          ? specialistSummary.projects
          : []

      const cached = specialistDetailsCache.current.get(specialistSummary.id)
      if (cached) {
        openDrawer(cached)
        return
      }

      if (!SUPABASE_AVAILABLE) {
        openDrawer({
          ...specialistSummary,
          projects,
          hasPortfolioDetails: true,
        })
        return
      }

      if (specialistSummary.hasPortfolioDetails && projects.length > 0) {
        openDrawer({
          ...specialistSummary,
          projects,
          hasPortfolioDetails: true,
        })
        return
      }

      if (SUPABASE_AVAILABLE) {
        const specialist = await getSpecialist(specialistSummary.id)
        if (specialist) {
          const normalizedProjects: SpecialistProject[] = Array.isArray(specialist.portfolio)
            ? specialist.portfolio.map((p: any, idx: number) => ({
                id: p.id || `project-${idx}`,
                title: p.title || '',
                description: p.description || '',
                images: p.images || [],
                link: p.link,
              }))
            : []

          const previewFromDb = normalizePreviewArray(specialist.portfolio_preview)
          const preview = previewFromDb.length > 0 ? previewFromDb : derivePortfolioPreview(normalizedProjects)

          const normalizedSpecialist: FullSpecialist = {
            id: specialist.id,
            firstName: specialist.first_name || '',
            lastName: specialist.last_name || '',
            specialization: specialist.specialization as Specialization,
            bio: specialist.bio || '',
            telegram: specialist.telegram || '',
            email: specialist.email || '',
            avatarUrl: specialist.avatar_url || '',
            rating: specialistSummary.rating,
            hiredCount: specialistSummary.hiredCount,
            showInSearch: specialist.show_in_search !== false,
            projects: normalizedProjects,
            hasPortfolioDetails: true,
            portfolioPreview: preview,
          }
          openDrawer(normalizedSpecialist)
          return
        }
      }

      // Fallback на localStorage
      const savedSpecialists = readJson<any[]>('specialists', [])
      const found = savedSpecialists.find((s: any) => s.id === specialistSummary.id)
      if (found) {
        const migratedSpecialist = formatSpecialistFromStorage(found) as FullSpecialist
        // Форматируем проекты
        migratedSpecialist.projects = (found.projects || []).map((p: any, idx: number) => ({
          id: p.id || `project-${idx}`,
          title: p.title || '',
          description: p.description || '',
          images: p.images || [],
          link: p.link,
        }))
        migratedSpecialist.hasPortfolioDetails = true
        migratedSpecialist.portfolioPreview = derivePortfolioPreview(migratedSpecialist.projects)
        openDrawer(migratedSpecialist)
      }
    } catch (error) {
      console.error('Ошибка загрузки специалиста:', error)
    }
  }, [specialistDetailsCache])

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedSpecialist(null)
  }

  const SpecialistCard = memo(({ specialist, onClick }: { specialist: Specialist; onClick: () => void }) => {
    const portfolioImages = useMemo(() => {
      // Сначала пробуем portfolioPreview (быстрее, уже готовые URL)
      if (specialist.portfolioPreview && specialist.portfolioPreview.length > 0) {
        const validUrls = specialist.portfolioPreview
          .filter((url): url is string => {
            if (!url || typeof url !== 'string') return false
            const trimmed = url.trim()
            // Проверяем что это валидный URL (не data URL)
            return (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) && trimmed.length > 0
          })
          .slice(0, MAX_PREVIEW_IMAGES)
          .map((url) => ({ url }))
        
        if (validUrls.length > 0) {
          return validUrls
        }
      }

      // Fallback на projects (если portfolioPreview пустой)
      if (!specialist.projects || specialist.projects.length === 0) return []
      
      const projectImages = specialist.projects
        .flatMap(project => {
          if (!project.images || !Array.isArray(project.images)) return []
          return project.images
            .filter((img: any) => {
              const url = typeof img === 'string' ? img : img?.url
              if (!url || typeof url !== 'string') return false
              const trimmed = url.trim()
              // Проверяем что это валидный URL (не data URL)
              return (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) && trimmed.length > 0
            })
            .map((img: any) => {
              const url = typeof img === 'string' ? img : img?.url
              return { url }
            })
        })
        .slice(0, MAX_PREVIEW_IMAGES)
      
      return projectImages
    }, [specialist.portfolioPreview, specialist.projects])

    return (
      <button
        onClick={onClick}
        className="bg-white rounded-apple border border-primary-100 hover:border-primary-200 hover:scale-[1.01] transition-all duration-200 ease-out active:scale-[0.99] p-4 sm:p-6 lg:p-8 text-left w-full max-w-full flex flex-col overflow-hidden"
      >
        <div className="flex items-start gap-3 sm:gap-5 mb-3 sm:mb-4 flex-shrink-0">
          {specialist.avatarUrl ? (
            <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-apple overflow-hidden flex-shrink-0 border border-primary-100">
              <Image
                src={specialist.avatarUrl}
                alt={`${specialist.firstName} ${specialist.lastName}`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 48px, 56px"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-apple bg-primary-50 flex items-center justify-center text-primary-700 text-sm sm:text-base font-normal flex-shrink-0">
              {(specialist.firstName?.[0] || '')}{(specialist.lastName?.[0] || '')}
            </div>
          )}
          <div className="flex-1 min-w-0 overflow-hidden">
            <h3 className="text-base sm:text-lg font-normal text-primary-900 mb-1 tracking-tight truncate">
              {specialist.firstName || ''} {specialist.lastName || ''}
            </h3>
            <p className="text-xs sm:text-sm font-light text-primary-600 truncate">{specialist.specialization || 'Специалист'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-light text-primary-500 mb-3 sm:mb-4 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-primary-900 font-normal">★ {specialist.rating}</span>
            <span className="text-primary-400">Рейтинг</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-primary-900 font-normal">{specialist.hiredCount}</span>
            <span className="text-primary-400">Нанят</span>
          </div>
        </div>

        {portfolioImages.length > 0 && (
          <div className="flex gap-2 sm:gap-3 overflow-x-auto -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 scrollbar-hide min-w-0">
            {portfolioImages.map((image, index) => (
              <div key={index} className="relative flex-shrink-0 w-48 sm:w-56 lg:w-64 h-36 sm:h-44 lg:h-48 rounded-apple overflow-hidden border border-primary-100 bg-primary-50">
                <Image
                  src={image.url}
                  alt={`Портфолио ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 192px, (max-width: 1024px) 224px, 256px"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </button>
    )
  })
  SpecialistCard.displayName = 'SpecialistCard'

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="mb-8 sm:mb-12">
          <div className="mb-4 sm:mb-6">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-primary-900 mb-2 sm:mb-3 tracking-tight">Таланты</h1>
            <p className="text-base sm:text-lg font-light text-primary-600">Найдите специалиста для вашего проекта</p>
          </div>
          {currentUserId && (
            <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pb-2">
              <div className={`relative flex items-center transition-all duration-300 h-[48px] sm:h-[56px] ${isSearchExpanded ? 'flex-1 min-w-[200px]' : 'flex-shrink-0'}`}>
                {!isSearchExpanded ? (
                  <button
                    onClick={() => setIsSearchExpanded(true)}
                    className="flex flex-row items-center justify-center gap-2 px-4 sm:px-5 py-3 sm:py-4 rounded-apple bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors font-normal tracking-tight whitespace-nowrap focus:outline-none"
                  >
                    <MagnifyingGlassIcon className="w-5 h-5" />
                    <span className="text-xs sm:text-sm whitespace-nowrap">Поиск</span>
                  </button>
                ) : (
                  <div className="relative w-full h-full flex items-center">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-400 w-5 h-5 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Поиск"
                      className="w-full h-full pl-12 pr-10 py-3 sm:py-4 border border-primary-200 rounded-apple bg-primary-50 text-primary-700 focus:outline-none focus:border-primary-900 focus:bg-white placeholder-primary-400 font-normal text-xs sm:text-sm transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onBlur={() => {
                        if (!searchQuery) {
                          setIsSearchExpanded(false)
                        }
                      }}
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('')
                          setIsSearchExpanded(false)
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary-400 hover:text-primary-700 focus:outline-none"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
              <Link
                href="/profile/edit?tab=freelancers"
                className="flex flex-row items-center justify-center gap-2 px-4 sm:px-5 py-3 sm:py-4 rounded-apple bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors font-normal tracking-tight whitespace-nowrap flex-shrink-0"
              >
                <UserIcon className="w-5 h-5" />
                <span className="text-xs sm:text-sm whitespace-nowrap">Моя карточка</span>
              </Link>
            </div>
          )}
        </div>
        <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SpecialistCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
      <div className="mb-8 sm:mb-12">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-primary-900 mb-2 sm:mb-3 tracking-tight">Таланты</h1>
          <p className="text-base sm:text-lg font-light text-primary-600">Найдите специалиста для вашего проекта</p>
        </div>
        {currentUserId && (
          <div className="flex gap-2 sm:gap-3 overflow-x-auto scrollbar-hide -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pb-2">
            <div className={`relative flex items-center transition-all duration-300 h-[48px] sm:h-[56px] ${isSearchExpanded ? 'flex-1 min-w-[200px]' : 'flex-shrink-0'}`}>
              {!isSearchExpanded ? (
                <button
                  onClick={() => setIsSearchExpanded(true)}
                  className="flex flex-row items-center justify-center gap-2 px-4 sm:px-5 py-3 sm:py-4 rounded-apple bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors font-normal tracking-tight whitespace-nowrap focus:outline-none"
                >
                  <MagnifyingGlassIcon className="w-5 h-5" />
                  <span className="text-xs sm:text-sm whitespace-nowrap">Поиск</span>
                </button>
              ) : (
                <div className="relative w-full h-full flex items-center">
                  <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-primary-400 w-5 h-5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Поиск"
                    className="w-full h-full pl-12 pr-10 py-3 sm:py-4 border border-primary-200 rounded-apple bg-primary-50 text-primary-700 focus:outline-none focus:border-primary-900 focus:bg-white placeholder-primary-400 font-normal text-xs sm:text-sm transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => {
                      if (!searchQuery) {
                        setIsSearchExpanded(false)
                      }
                    }}
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setIsSearchExpanded(false)
                      }}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-primary-400 hover:text-primary-700 focus:outline-none"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <Link
              href="/profile/edit?tab=freelancers"
              className="flex flex-row items-center justify-center gap-2 px-4 sm:px-5 py-3 sm:py-4 rounded-apple bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors font-normal tracking-tight whitespace-nowrap flex-shrink-0"
            >
              <UserIcon className="w-5 h-5" />
              <span className="text-xs sm:text-sm whitespace-nowrap">Моя карточка</span>
            </Link>
          </div>
        )}
      </div>

      <div className="mb-6 sm:mb-10">
        <div className="border-b border-primary-200">
          <div className="flex gap-6 overflow-x-auto scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0">
            <button
              onClick={() => setSelectedSpecialization('')}
              className={`relative text-sm font-normal transition-colors tracking-tight pb-4 whitespace-nowrap ${
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
            {specializations.map((spec) => (
              <button
                key={spec}
                onClick={() => setSelectedSpecialization(spec)}
                className={`relative text-sm font-normal transition-all duration-200 tracking-tight pb-4 whitespace-nowrap ${
                  selectedSpecialization === spec
                    ? 'text-[#FF4600]'
                    : 'text-primary-400 hover:text-primary-600'
                }`}
              >
                {spec}
                {selectedSpecialization === spec && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF4600]"></span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 min-w-0">
        {filteredSpecialists.map((specialist) => (
          <SpecialistCard
            key={specialist.id}
            specialist={specialist}
            onClick={() => handleSpecialistClick(specialist)}
          />
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
        <div className="text-center py-12 sm:py-16 lg:py-20">
          <p className="text-primary-600 text-base sm:text-lg font-light mb-2">Специалисты не найдены</p>
          <p className="text-primary-500 text-sm sm:text-base font-light">Попробуйте изменить параметры поиска</p>
        </div>
      )}

    </div>
  )
}
