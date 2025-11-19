'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircleIcon, UserIcon } from '@heroicons/react/24/outline'
import { getCurrentUser } from '@/lib/supabase'

export default function VerifiedPage() {
  const router = useRouter()

  useEffect(() => {
    // Проверяем, авторизован ли пользователь
    const checkAuth = async () => {
      const user = await getCurrentUser()
      if (!user) {
        // Если пользователь не авторизован, перенаправляем на страницу входа
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  const handleGoToProfile = () => {
    router.push('/profile/edit')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 sm:py-16 lg:py-20 px-4 sm:px-6">
      <div className="max-w-md w-full space-y-8 sm:space-y-10">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-apple bg-green-50 flex items-center justify-center">
              <CheckCircleIcon className="w-12 h-12 text-green-600" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-light text-primary-900 tracking-tight">
              Email подтвержден!
            </h1>
            <p className="text-sm sm:text-base font-light text-primary-600">
              Ваш email успешно подтвержден. Теперь вы можете пользоваться всеми возможностями платформы.
            </p>
          </div>

          <div className="pt-6 space-y-4">
            <button
              onClick={handleGoToProfile}
              className="w-full flex items-center justify-center gap-2 py-4 px-5 border border-transparent text-base font-normal rounded-apple text-white bg-primary-900 hover:bg-primary-800 focus:outline-none focus:ring-1 focus:ring-primary-900 transition-colors tracking-tight"
            >
              <UserIcon className="w-5 h-5" />
              Перейти в профиль
            </button>
            
            <Link
              href="/specialists"
              className="block w-full text-center py-4 px-5 border border-primary-200 text-base font-normal rounded-apple text-primary-900 hover:bg-primary-50 focus:outline-none focus:ring-1 focus:ring-primary-900 transition-colors tracking-tight"
            >
              Посмотреть специалистов
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

