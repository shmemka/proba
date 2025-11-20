'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Редирект на новую единую страницу аутентификации
  useEffect(() => {
    const redirect = searchParams.get('redirect')
    if (redirect) {
      router.replace(`/auth?redirect=${encodeURIComponent(redirect)}`)
    } else {
      router.replace('/auth')
    }
  }, [router, searchParams])

  // Временная заглушка (будет редирект)
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900 mx-auto"></div>
        <p className="text-primary-600 font-light">Перенаправление...</p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-primary-600">Загрузка...</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
