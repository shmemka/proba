'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowRightOnRectangleIcon, Cog6ToothIcon, Bars3Icon, XMarkIcon, UsersIcon, BriefcaseIcon, BookOpenIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { getActiveUser } from '@/lib/storage'
import { getCurrentUser, signOut, isSupabaseAvailable, getSpecialist } from '@/lib/supabase'

type NavUser = {
  id: string
  email: string
  name?: string
  type?: 'specialist' | 'company'
  avatarUrl?: string
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [user, setUser] = useState<NavUser | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      if (isSupabaseAvailable()) {
        // Проверяем Supabase Auth
        const supabaseUser = await getCurrentUser()
        if (supabaseUser) {
          const userType = supabaseUser.user_metadata?.userType || 'specialist'
          let avatarUrl = ''
          
          // Если специалист, загружаем аватарку из профиля
          if (userType === 'specialist') {
            try {
              const specialist = await getSpecialist(supabaseUser.id)
              avatarUrl = specialist?.avatar_url || ''
            } catch (error) {
              console.error('Ошибка загрузки профиля специалиста:', error)
            }
          }
          
          setUser({
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            name: supabaseUser.user_metadata?.displayName || supabaseUser.email || '',
            type: userType,
            avatarUrl,
          })
        } else {
          setUser(null)
        }
      } else {
        // Fallback на localStorage
        const storedUser = getActiveUser()
        if (storedUser) {
          setUser({
            id: storedUser.id,
            email: storedUser.email,
            name: storedUser.name,
            type: storedUser.type,
            avatarUrl: '',
          })
        } else {
          setUser(null)
        }
      }
    }

    checkAuth()

    const handleStorageChange = () => {
      checkAuth()
    }

    // Проверяем каждые 2 секунды для обновления состояния
    const interval = setInterval(checkAuth, 2000)

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('focus', checkAuth)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', checkAuth)
    }
  }, [])

  const handleLogout = async () => {
    if (isSupabaseAvailable()) {
      await signOut()
    } else {
      localStorage.removeItem('user')
      window.dispatchEvent(new Event('storage'))
    }
    setUser(null)
    router.push('/')
    setIsMobileMenuOpen(false)
  }

  const navLinks = [
    { href: '/specialists', label: 'Таланты', icon: UsersIcon },
    { href: '/projects', label: 'Проекты', icon: BriefcaseIcon },
    { href: '/resources', label: 'Ресурсы', icon: BookOpenIcon },
  ]

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-apple border border-primary-100 shadow-sm hover:bg-primary-50 active:bg-primary-50 transition-colors"
        onClick={() => {
          setIsMobileMenuOpen(!isMobileMenuOpen)
          if (isMobileMenuOpen) {
            setIsProfileMenuOpen(false)
          }
        }}
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? (
          <XMarkIcon className="w-6 h-6 text-primary-700" />
        ) : (
          <Bars3Icon className="w-6 h-6 text-primary-700" />
        )}
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 z-40"
          onClick={() => {
            setIsMobileMenuOpen(false)
            setIsProfileMenuOpen(false)
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-white border-r border-primary-100 z-40
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          flex flex-col
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-primary-100">
          <Link
            href={user ? '/specialists' : '/'}
            className="flex items-center gap-2 text-primary-900 font-normal text-lg tracking-tight"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <img
              src="/logo.svg"
              alt="Logo"
              className="h-6 w-auto"
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  setIsProfileMenuOpen(false)
                }}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-apple text-sm font-normal transition-colors tracking-tight
                  ${
                    isActive(link.href)
                      ? 'bg-primary-50 text-primary-900'
                      : 'text-primary-600 hover:bg-primary-50 active:bg-primary-50 hover:text-primary-900'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-primary-100">
          {user ? (
            <div className="relative">
              <button 
                className="w-full flex items-center gap-3 px-4 py-3 rounded-apple hover:bg-primary-50 active:bg-primary-50 transition-colors"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || user.email}
                    className="w-10 h-10 rounded-apple object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-apple bg-primary-50 flex items-center justify-center text-primary-700 text-sm font-normal flex-shrink-0">
                    {(user.name?.[0] || user.email?.[0] || '?').toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-normal text-primary-900 truncate">
                    {user.name || user.email}
                  </p>
                  {user.type && (
                    <p className="text-xs font-light text-primary-500">
                      {user.type === 'specialist' ? 'Специалист' : 'Компания'}
                    </p>
                  )}
                </div>
              </button>
              
              {isProfileMenuOpen && (
                <>
                  {/* Безопасная зона между кнопкой и меню */}
                  <div className="absolute bottom-full left-0 w-full h-0.5" />
                  <div className="absolute bottom-full left-0 mb-0.5 w-full bg-white rounded-apple border border-primary-100 shadow-lg py-2 z-50">
                    {user.type === 'specialist' && (
                      <Link
                        href="/profile/edit"
                        onClick={() => {
                          setIsMobileMenuOpen(false)
                          setIsProfileMenuOpen(false)
                        }}
                        className="flex items-center gap-3 px-4 py-2 mx-2 text-sm font-normal text-primary-700 hover:bg-primary-50 active:bg-primary-50 rounded-apple transition-colors"
                      >
                        <Cog6ToothIcon className="w-4 h-4" />
                        Настройки
                      </Link>
                    )}
                    {user.type === 'company' && (
                      <Link
                        href="/projects/new"
                        onClick={() => {
                          setIsMobileMenuOpen(false)
                          setIsProfileMenuOpen(false)
                        }}
                        className="flex items-center gap-3 px-4 py-2 mx-2 text-sm font-normal text-primary-700 hover:bg-primary-50 active:bg-primary-50 rounded-apple transition-colors"
                      >
                        <Cog6ToothIcon className="w-4 h-4" />
                        Создать проект
                      </Link>
                    )}
                    <Link
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        handleLogout()
                        setIsProfileMenuOpen(false)
                      }}
                      className="flex items-center gap-3 px-4 py-2 mx-2 text-sm font-normal text-primary-700 hover:bg-primary-50 active:bg-primary-50 rounded-apple transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      Выйти
                    </Link>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Link
                href="/login"
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  setIsProfileMenuOpen(false)
                }}
                className="block w-full text-center px-4 py-3 rounded-apple text-sm font-normal text-primary-700 hover:bg-primary-50 active:bg-primary-50 transition-colors"
              >
                Войти
              </Link>
              <Link
                href="/register"
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  setIsProfileMenuOpen(false)
                }}
                className="block w-full text-center px-4 py-3 rounded-apple text-sm font-normal bg-primary-900 text-white hover:bg-primary-800 active:bg-primary-800 transition-colors"
              >
                Регистрация
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

