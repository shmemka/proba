'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { getSupabaseClient } from '@/lib/supabaseClient'
import SkeletonLoader from '@/components/SkeletonLoader'

interface Article {
  id: string
  title: string
  content: string
  image_url: string
  excerpt: string
  author_id: string
  created_at: string
  updated_at: string
}

export default function ArticlePage() {
  const params = useParams()
  const [article, setArticle] = useState<Article | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadArticle = async () => {
      const supabase = getSupabaseClient()
      if (!supabase) {
        setError('База данных не настроена')
        setIsLoading(false)
        return
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('articles')
          .select('*')
          .eq('id', params.id)
          .single()

        if (fetchError) {
          setError('Статья не найдена')
          return
        }

        setArticle(data)
      } catch (err: any) {
        setError(err.message || 'Ошибка загрузки статьи')
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      loadArticle()
    }
  }, [params.id])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <SkeletonLoader />
        </div>
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-light text-primary-900 mb-4">Статья не найдена</h1>
          <Link
            href="/resources"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-900 font-light"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Вернуться к ресурсам
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Навигация */}
        <div className="mb-6 sm:mb-8">
          <Link
            href="/resources"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-900 font-light transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Назад к ресурсам</span>
          </Link>
        </div>

        {/* Заголовок */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-primary-900 mb-6 sm:mb-8 tracking-tight">
          {article.title}
        </h1>

        {/* Изображение 16:9 */}
        {article.image_url && (
          <div className="relative w-full mb-8 sm:mb-12 rounded-apple overflow-hidden border border-primary-100" style={{ aspectRatio: '16/9' }}>
            <Image
              src={article.image_url}
              alt={article.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 896px"
              priority
            />
          </div>
        )}

        {/* Содержание */}
        <div className="prose prose-lg max-w-none">
          <div className="space-y-4 sm:space-y-6 text-primary-700 font-light leading-relaxed text-base sm:text-lg whitespace-pre-wrap">
            {article.content}
          </div>
        </div>
      </div>
    </div>
  )
}

