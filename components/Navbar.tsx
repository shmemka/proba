'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowRightOnRectangleIcon, Cog6ToothIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useAuthUser } from '@/hooks/useAuthUser'
import { signOut, signInWithGoogle, isSupabaseAvailable } from '@/lib/supabase'

const SUPABASE_AVAILABLE = isSupabaseAvailable()

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const { user, refresh } = useAuthUser()

  // Блокируем скролл страницы когда мобильное меню открыто
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  const handleGoogleSignIn = async () => {
    if (!isSupabaseAvailable()) {
      return
    }

    if (isGoogleLoading) {
      return
    }

    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
    } catch (err: any) {
      console.error('Ошибка входа через Google:', err)
      setIsGoogleLoading(false)
    }
  }

  const handleLogout = async () => {
    if (SUPABASE_AVAILABLE) {
      await signOut()
    } else {
      localStorage.removeItem('user')
      window.dispatchEvent(new Event('storage'))
    }
    await refresh()
    router.push('/')
  }

  // Для неавторизованных показываем все ссылки, для авторизованных - только рабочие
  const navLinks = user 
    ? [
        { href: '/specialists', label: 'Таланты' },
        { href: '/projects', label: 'Задачи' },
        { href: '/resources', label: 'Ресурсы' },
      ]
    : [
        { href: '/specialists', label: 'Таланты' },
        { href: '/projects', label: 'Задачи' },
        { href: '/resources', label: 'Ресурсы' },
      ]

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-primary-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 relative">
          <Link 
            href={user ? '/specialists' : '/'} 
            className="flex items-center gap-2 text-primary-900 font-normal text-lg tracking-tight"
          >
            <Image 
              src="/logo.svg" 
              alt="Logo" 
              width={120}
              height={24}
              className="h-6 w-auto"
              priority
            />
          </Link>

          <div className="hidden md:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={true}
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
                    <div className="relative w-8 h-8 rounded-[10px] overflow-hidden">
                      <Image 
                        src={user.avatarUrl} 
                        alt={user.name || user.email}
                        fill
                        className="object-cover"
                        sizes="32px"
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-[10px] bg-primary-50 flex items-center justify-center text-primary-700 text-xs font-normal">
                      {(user.name?.[0] || user.email?.[0] || '?').toUpperCase()}
                    </div>
                  )}
                  <span className="text-primary-900 text-sm font-normal">{user.name || user.email}</span>
                </button>
                
                {isProfileMenuOpen && (
                  <>
                    {/* Безопасная зона между кнопкой и меню */}
                    <div className="absolute right-0 top-full w-full h-0.5" />
                    <div className="absolute right-0 top-full mt-0.5 w-48 bg-white rounded-apple border border-primary-100 shadow-lg py-2 z-50 animate-fade-in">
                      <Link
                        href="/profile/edit"
                        className="flex items-center gap-3 px-4 py-2 mx-2 text-sm font-normal text-primary-700 hover:bg-primary-50 rounded-apple transition-colors"
                      >
                        <Cog6ToothIcon className="w-4 h-4" />
                        Настройки
                      </Link>
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
                {isSupabaseAvailable() && (
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={isGoogleLoading}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-normal text-primary-700 hover:text-primary-900 transition-all duration-200 tracking-tight active:scale-95 disabled:opacity-70"
                  >
                    {isGoogleLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-900"></div>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        <span>Продолжить с Google</span>
                      </>
                    )}
                  </button>
                )}
                <Link
                  href="/auth"
                  className="bg-primary-900 text-white px-5 py-2 rounded-apple text-sm font-normal hover:bg-primary-800 transition-all duration-200 tracking-tight active:scale-95"
                >
                  Войти
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 text-primary-700 hover:text-primary-900 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
          >
            {isMenuOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <Bars3Icon className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <>
          {/* Затемнение фона */}
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Мобильное меню */}
          <div 
            className="md:hidden fixed inset-x-4 top-20 bg-white z-50 shadow-lg animate-fade-in max-h-[calc(100vh-5rem)] overflow-y-auto rounded-apple"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 sm:px-6 pt-4 pb-6 space-y-3">
              {/* Ссылки навигации */}
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={true}
                  className={`block px-4 py-3 text-base font-normal tracking-tight rounded-apple transition-colors ${
                    pathname === link.href
                      ? 'text-primary-900 bg-primary-50'
                      : 'text-primary-700 hover:text-primary-900 hover:bg-primary-50'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              
              {/* Разделитель */}
              <div className="border-t border-primary-100 my-3"></div>
              
              {/* Профиль или кнопки входа */}
              {user ? (
                <>
                  <Link
                    href="/profile/edit"
                    className="flex items-center gap-3 px-4 py-3 text-base font-normal text-primary-700 hover:text-primary-900 hover:bg-primary-50 rounded-apple transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Cog6ToothIcon className="w-5 h-5" />
                    Настройки
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout()
                      setIsMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-base font-normal text-primary-700 hover:text-primary-900 hover:bg-primary-50 rounded-apple transition-colors text-left"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    Выйти
                  </button>
                </>
              ) : (
                <>
                  {isSupabaseAvailable() && (
                    <button
                      onClick={() => {
                        handleGoogleSignIn()
                        setIsMenuOpen(false)
                      }}
                      disabled={isGoogleLoading}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3 text-base font-normal text-primary-900 bg-white border border-primary-200 rounded-apple hover:bg-primary-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isGoogleLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-900"></div>
                      ) : (
                        <>
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                          </svg>
                          <span>Продолжить с Google</span>
                        </>
                      )}
                    </button>
                  )}
                  <Link
                    href="/auth"
                    className="block w-full text-center px-4 py-3 text-base font-normal bg-primary-900 text-white rounded-apple hover:bg-primary-800 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Продолжить с почтой
                  </Link>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </nav>
  )
}
