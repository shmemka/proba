'use client'

import { useEffect, useRef, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { XMarkIcon, EnvelopeIcon, PaperAirplaneIcon, ChevronLeftIcon, ChevronRightIcon, ArrowTopRightOnSquareIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { StarIcon } from '@heroicons/react/24/solid'

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

interface SpecialistDrawerProps {
  specialist: Specialist | null
  isOpen: boolean
  onClose: () => void
  currentProjectIndex?: number
  onProjectChange?: (index: number) => void
}

export default function SpecialistDrawer({
  specialist,
  isOpen,
  onClose,
  currentProjectIndex = 0,
  onProjectChange,
}: SpecialistDrawerProps) {
  const leftScrollRef = useRef<HTMLDivElement>(null)
  const rightSectionRef = useRef<HTMLDivElement>(null)



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



  const projects = useMemo(() => specialist?.projects ?? [], [specialist?.projects])
  const projectsCount = projects.length
  const hasProjects = projectsCount > 0
  const currentProject = useMemo(() => hasProjects ? projects[currentProjectIndex] : null, [hasProjects, projects, currentProjectIndex])

  const handlePrevious = useCallback(() => {
    if (hasProjects && onProjectChange) {
      const newIndex = currentProjectIndex > 0 ? currentProjectIndex - 1 : projectsCount - 1
      onProjectChange(newIndex)
    }
  }, [hasProjects, projectsCount, currentProjectIndex, onProjectChange])

  const handleNext = useCallback(() => {
    if (hasProjects && onProjectChange) {
      const newIndex = currentProjectIndex < projectsCount - 1 ? currentProjectIndex + 1 : 0
      onProjectChange(newIndex)
    }
  }, [hasProjects, projectsCount, currentProjectIndex, onProjectChange])

  if (!specialist) {
    return null
  }

  const firstName = specialist.firstName || ''
  const lastName = specialist.lastName || ''
  const fullName = `${firstName} ${lastName}`.trim() || 'Специалист'
  const telegram = (specialist.telegram || '').trim()
  const telegramUrl = telegram 
    ? (telegram.startsWith('@') 
        ? `https://t.me/${telegram.slice(1)}` 
        : telegram.startsWith('http') 
          ? telegram 
          : telegram.startsWith('t.me/')
            ? `https://${telegram}`
            : `https://t.me/${telegram}`)
    : '#'

  return (
    <>
      {/* Overlay */}
      <div
        className={`
          fixed inset-0 bg-black/20 backdrop-blur-sm z-[110]
          transition-opacity duration-300 ease-out
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full max-w-4xl bg-white z-[110]
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
        <div className="flex-1 flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden">
          {/* Left side - Profile (scrollable) */}
          <div 
            ref={leftScrollRef}
            className="lg:w-1/2 p-4 sm:p-6 lg:p-8 xl:p-12 lg:border-r border-primary-100 flex flex-col lg:overflow-y-auto scrollbar-hide"
          >
              {/* Avatar */}
              <div className="mb-4 sm:mb-6">
                {specialist.avatarUrl ? (
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mb-3 sm:mb-4 border border-primary-200">
                    <Image
                      src={specialist.avatarUrl}
                      alt={fullName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 80px, 96px"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary-50 flex items-center justify-center text-primary-700 text-2xl sm:text-3xl font-normal mb-3 sm:mb-4">
                    {(firstName?.[0] || '')}{(lastName?.[0] || '')}
                  </div>
                )}
                <h1 className="text-2xl sm:text-3xl font-light text-primary-900 mb-2 tracking-tight">
                  {fullName}
                </h1>
                <p className="text-base sm:text-lg font-light text-primary-600 mb-4 sm:mb-6">
                  {specialist.specialization || 'Специалист'}
                </p>
                {specialist.bio && (
                  <p className="text-base font-light text-primary-700 leading-relaxed mb-6">
                    {specialist.bio}
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3 mb-8">
                {telegram && telegramUrl !== '#' && (
                  <a
                    href={telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-primary-900 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-apple hover:bg-primary-800 active:bg-primary-800 transition-colors font-normal tracking-tight text-center flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <PaperAirplaneIcon className="w-4 h-4" />
                    Связаться в Telegram
                  </a>
                )}
                {specialist.email && (
                  <a
                    href={`mailto:${specialist.email}`}
                    className="border border-primary-200 text-primary-700 px-5 sm:px-6 py-2.5 sm:py-3 rounded-apple hover:bg-primary-50 active:bg-primary-50 transition-colors font-normal tracking-tight text-center flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <EnvelopeIcon className="w-4 h-4" />
                    Написать на email
                  </a>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                  <div className="text-2xl font-light text-primary-900 mb-1 flex items-center gap-1">
                    <StarIcon className="w-5 h-5 text-primary-900" />
                    {specialist.rating || 0}
                  </div>
                  <div className="text-sm font-light text-primary-600 flex items-center gap-1.5">
                    Рейтинг
                    <div className="relative group">
                      <InformationCircleIcon className="w-4 h-4 text-primary-400 cursor-help" />
                      <div className="absolute bottom-full left-0 mb-2 w-64 px-3 py-2 bg-primary-900 text-white text-xs font-light rounded-apple opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg">
                        <div className="font-normal mb-1">Рейтинг с Kwork</div>
                        <div className="text-primary-200 leading-relaxed">Мы проверили и подтвердили рейтинг вручную</div>
                        <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-primary-900"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-light text-primary-900 mb-1">{specialist.hiredCount || 0}</div>
                  <div className="text-sm font-light text-primary-600">Нанят</div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="lg:mt-auto pt-8 border-t border-primary-100 lg:border-b-0 border-b border-primary-100">
                <div className="space-y-3">
                  {telegram && telegramUrl !== '#' && (
                    <div>
                      <p className="text-xs font-light text-primary-500 mb-1">Telegram</p>
                      <a
                        href={telegramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-normal text-primary-700 hover:text-primary-900 transition-colors"
                      >
                        {telegram}
                      </a>
                    </div>
                  )}
                  {specialist.email && (
                    <div>
                      <p className="text-xs font-light text-primary-500 mb-1">Email</p>
                      <a
                        href={`mailto:${specialist.email}`}
                        className="text-sm font-normal text-primary-700 hover:text-primary-900 transition-colors"
                      >
                        {specialist.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

          {/* Right side - Portfolio (fixed on desktop, scrollable on mobile) */}
          <div 
            ref={rightSectionRef}
            className="lg:w-1/2 lg:sticky lg:top-0 lg:h-screen relative bg-primary-50 flex flex-col min-h-[300px] sm:min-h-[400px] lg:min-h-0 lg:overflow-hidden"
          >
            {hasProjects && currentProject ? (
              <>
                {/* Заголовок проекта (фиксированный) */}
                <div className="relative z-20 pt-4 sm:pt-6 lg:pt-8 pl-4 sm:pl-6 lg:pl-8 pr-16 sm:pr-20 pb-3 sm:pb-4 bg-gradient-to-b from-primary-50 via-primary-50/95 to-transparent backdrop-blur-sm">
                  <h3 className="text-xl sm:text-2xl font-normal text-primary-900 tracking-tight break-words">
                    {currentProject.title}
                  </h3>
                  {specialist.projects && specialist.projects.length > 1 && (
                    <div className="mt-2 text-xs sm:text-sm font-light text-primary-500">
                      {currentProjectIndex + 1} / {specialist.projects.length}
                    </div>
                  )}
                </div>
                
                {/* Размытие сверху для читаемости (только на desktop) */}
                <div className="hidden lg:block absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-primary-50 via-primary-50/80 to-transparent backdrop-blur-sm pointer-events-none z-10"></div>

                {/* Галерея изображений (скроллируемая на desktop, обычная на mobile) */}
                <div className="flex-1 lg:overflow-y-auto scrollbar-hide relative">
                  {currentProject.images && currentProject.images.length > 0 ? (
                    <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4">
                      {currentProject.images.map((image, index) => (
                        <div key={index} className="relative w-full rounded-apple overflow-hidden border border-primary-100 bg-primary-50" style={{ aspectRatio: '4/3' }}>
                          <Image
                            src={image.url}
                            alt={`${currentProject.title} - фото ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1024px) 100vw, 50vw"
                            loading={index < 2 ? 'eager' : 'lazy'}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <p className="text-primary-500 font-light">Нет изображений</p>
                    </div>
                  )}
                  
                  {/* Размытие снизу (только на desktop) */}
                  <div className="hidden lg:block sticky bottom-0 h-20 bg-gradient-to-t from-primary-50 via-primary-50/95 to-transparent pointer-events-none"></div>
                </div>

                {/* Navigation arrows */}
                {specialist.projects && specialist.projects.length > 1 && (
                  <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 flex items-center gap-2 z-30">
                    <button
                      onClick={handlePrevious}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 backdrop-blur-sm border border-primary-200 flex items-center justify-center hover:bg-white active:bg-white transition-colors shadow-sm"
                      aria-label="Предыдущий проект"
                    >
                      <ChevronLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-700" />
                    </button>
                    <button
                      onClick={handleNext}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/90 backdrop-blur-sm border border-primary-200 flex items-center justify-center hover:bg-white active:bg-white transition-colors shadow-sm"
                      aria-label="Следующий проект"
                    >
                      <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-700" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center flex items-center justify-center h-full">
                <p className="text-primary-500 font-light">Портфолио пока пусто</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

