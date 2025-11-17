'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowRightOnRectangleIcon, Cog6ToothIcon, Bars3Icon } from '@heroicons/react/24/outline'
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

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
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
  }

  // Для неавторизованных показываем все ссылки, для авторизованных - только рабочие
  const navLinks = user 
    ? [
        { href: '/specialists', label: 'Таланты' },
        { href: '/projects', label: 'Проекты' },
        { href: '/resources', label: 'Ресурсы' },
      ]
    : [
        { href: '/specialists', label: 'Таланты' },
        { href: '/projects', label: 'Проекты' },
        { href: '/resources', label: 'Ресурсы' },
      ]

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-primary-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 relative">
          <Link 
            href={user ? '/specialists' : '/'} 
            className="flex items-center gap-2 text-primary-900 font-normal text-lg tracking-tight"
          >
            <img 
              src="/logo.svg" 
              alt="Logo" 
              className="h-6 w-auto"
            />
          </Link>

          <div className="hidden md:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 text-sm font-normal transition-colors tracking-tight ${
                  pathname === link.href
                    ? 'text-primary-900'
                    : 'text-primary-400 hover:text-primary-600'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div 
                className="relative"
                onMouseEnter={() => setIsProfileMenuOpen(true)}
                onMouseLeave={() => setIsProfileMenuOpen(false)}
              >
                <button className="flex items-center gap-3 px-3 py-2 rounded-apple hover:bg-primary-50 transition-colors">
                  {user.avatarUrl ? (
                    <img 
                      src={user.avatarUrl} 
                      alt={user.name || user.email}
                      className="w-8 h-8 rounded-apple object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-apple bg-primary-50 flex items-center justify-center text-primary-700 text-xs font-normal">
                      {(user.name?.[0] || user.email?.[0] || '?').toUpperCase()}
                    </div>
                  )}
                  <span className="text-primary-900 text-sm font-normal">{user.name || user.email}</span>
                </button>
                
                {isProfileMenuOpen && (
                  <>
                    {/* Безопасная зона между кнопкой и меню */}
                    <div className="absolute right-0 top-full w-full h-0.5" />
                    <div className="absolute right-0 top-full mt-0.5 w-48 bg-white rounded-apple border border-primary-100 shadow-lg py-2 z-50">
                      {user.type === 'specialist' && (
                        <Link
                          href="/profile/edit"
                          className="flex items-center gap-3 px-4 py-2 mx-2 text-sm font-normal text-primary-700 hover:bg-primary-50 rounded-apple transition-colors"
                        >
                          <Cog6ToothIcon className="w-4 h-4" />
                          Настройки
                        </Link>
                      )}
                      {user.type === 'company' && (
                        <Link
                          href="/projects/new"
                          className="flex items-center gap-3 px-4 py-2 mx-2 text-sm font-normal text-primary-700 hover:bg-primary-50 rounded-apple transition-colors"
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
                        }}
                        className="flex items-center gap-3 px-4 py-2 mx-2 text-sm font-normal text-primary-700 hover:bg-primary-50 rounded-apple transition-colors"
                      >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        Выйти
                      </Link>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-primary-700 hover:text-primary-900 px-4 py-2 text-sm font-normal transition-colors tracking-tight"
                >
                  Войти
                </Link>
                <Link
                  href="/register"
                  className="bg-primary-900 text-white px-5 py-2 rounded-apple text-sm font-normal hover:bg-primary-800 transition-colors tracking-tight"
                >
                  Регистрация
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 text-primary-700 hover:text-primary-900"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t border-primary-100">
          <div className="px-6 pt-4 pb-6 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-3 text-base font-normal tracking-tight ${
                  pathname === link.href
                    ? 'text-primary-900'
                    : 'text-primary-400 hover:text-primary-600'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-primary-100 space-y-2">
              {user ? (
                <>
                  <div className="px-3 py-3 flex items-center gap-3">
                    {user.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt={user.name || user.email}
                        className="w-10 h-10 rounded-apple object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-apple bg-primary-50 flex items-center justify-center text-primary-700 text-sm font-normal">
                        {(user.name?.[0] || user.email?.[0] || '?').toUpperCase()}
                      </div>
                    )}
                    <span className="text-base font-normal text-primary-900">
                      {user.name || user.email}
                    </span>
                  </div>
                  {user.type === 'specialist' && (
                    <Link
                      href="/profile/edit"
                      className="block px-3 py-3 text-base font-normal text-primary-600 hover:text-primary-900 tracking-tight flex items-center gap-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Cog6ToothIcon className="w-4 h-4" />
                      Настройки
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout()
                      setIsMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-3 text-base font-normal text-primary-600 hover:text-primary-900 tracking-tight"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    Выйти
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block px-3 py-3 text-base font-normal text-primary-600 hover:text-primary-900 tracking-tight"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Войти
                  </Link>
                  <Link
                    href="/register"
                    className="block px-3 py-3 text-base font-normal bg-primary-900 text-white rounded-apple hover:bg-primary-800 tracking-tight text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Регистрация
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
