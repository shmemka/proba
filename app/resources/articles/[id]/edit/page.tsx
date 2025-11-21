'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeftIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { useAuthUser } from '@/hooks/useAuthUser'
import { uploadPublicAsset } from '@/lib/supabaseStorage'
import SkeletonLoader from '@/components/SkeletonLoader'

interface Article {
  id: string
  title: string
  content: string
  image_url: string
  excerpt: string
  author_id: string
}

export default function EditArticlePage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuthUser()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [article, setArticle] = useState<Article | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadArticle = async () => {
      const supabase = getSupabaseClient()
      if (!supabase) {
        setError('База данных не настроена')
        setIsLoading(false)
        return
      }

      // Проверяем авторизацию
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        setError('Необходима авторизация')
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

        // Проверяем, что пользователь - автор статьи
        if (data.author_id !== currentUser.id) {
          setError('У вас нет прав на редактирование этой статьи')
          return
        }

        setArticle(data)
        setTitle(data.title)
        setContent(data.content)
        setImageUrl(data.image_url || '')
        setExcerpt(data.excerpt || '')
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

  const handleImageUpload = async (file: File) => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      setError('База данных не настроена')
      return
    }

    setIsUploadingImage(true)
    setError(null)

    try {
      // Генерируем уникальное имя файла
      const fileExtension = file.name.split('.').pop() || 'jpg'
      const fileName = `articles/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`

      // Загружаем в Supabase Storage
      const { publicUrl } = await uploadPublicAsset({
        file,
        path: fileName,
      })

      setImageUrl(publicUrl)
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки изображения')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
  }

  const handleRemoveImage = () => {
    setImageUrl('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      setError('База данных не настроена')
      return
    }

    if (!title.trim() || !content.trim()) {
      setError('Заполните все обязательные поля')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // Генерируем excerpt из начала контента, если не задан
      const finalExcerpt = excerpt.trim() || content.trim().substring(0, 150).replace(/\n/g, ' ') + '...'

      const { error: updateError } = await supabase
        .from('articles')
        .update({
          title: title.trim(),
          content: content.trim(),
          image_url: imageUrl,
          excerpt: finalExcerpt,
        })
        .eq('id', params.id)

      if (updateError) {
        setError(updateError.message || 'Ошибка сохранения статьи')
        return
      }

      router.push(`/resources/articles/${params.id}`)
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения статьи')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <SkeletonLoader />
        </div>
      </div>
    )
  }

  if (error && !article) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-light text-primary-900 mb-4">{error}</h1>
          <button
            onClick={() => router.push('/resources')}
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-900 font-light"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Вернуться к ресурсам
          </button>
        </div>
      </div>
    )
  }

  if (!article) {
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        {/* Навигация */}
        <button
          onClick={() => router.push(`/resources/articles/${params.id}`)}
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-900 font-light mb-6 sm:mb-8 transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>Назад к статье</span>
        </button>

        <h1 className="text-3xl sm:text-4xl font-light text-primary-900 mb-8 tracking-tight">
          Редактировать статью
        </h1>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-apple text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6 sm:space-y-8">
          {/* Заголовок */}
          <div>
            <label className="block text-sm font-normal text-primary-900 mb-2">
              Заголовок <span className="text-primary-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-primary-200 rounded-apple focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-primary-900 font-light"
              placeholder="Введите заголовок статьи"
            />
          </div>

          {/* Изображение */}
          <div>
            <label className="block text-sm font-normal text-primary-900 mb-2">
              Изображение (16:9)
            </label>
            {imageUrl ? (
              <div className="relative w-full mb-4" style={{ aspectRatio: '16/9' }}>
                <div className="absolute inset-0 rounded-apple overflow-hidden border border-primary-200">
                  <Image
                    src={imageUrl}
                    alt="Превью"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 896px"
                  />
                </div>
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-2 bg-white rounded-apple border border-primary-200 hover:bg-primary-50 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-primary-700" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-primary-300 rounded-apple p-8 sm:p-12 text-center cursor-pointer hover:border-primary-400 transition-colors"
                style={{ aspectRatio: '16/9' }}
              >
                <PhotoIcon className="w-12 h-12 text-primary-400 mx-auto mb-4" />
                <p className="text-primary-600 font-light">
                  {isUploadingImage ? 'Загрузка...' : 'Нажмите, чтобы загрузить изображение'}
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              disabled={isUploadingImage}
            />
            {!imageUrl && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="mt-2 px-4 py-2 text-sm text-primary-600 hover:text-primary-900 font-light disabled:opacity-50"
              >
                {isUploadingImage ? 'Загрузка...' : 'Выбрать файл'}
              </button>
            )}
          </div>

          {/* Краткое описание (excerpt) */}
          <div>
            <label className="block text-sm font-normal text-primary-900 mb-2">
              Краткое описание (для карточки)
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 border border-primary-200 rounded-apple focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-primary-900 font-light resize-none"
              placeholder="Краткое описание статьи (будет показано на карточке)"
            />
            <p className="mt-1 text-xs text-primary-500 font-light">
              Если не указано, будет автоматически сгенерировано из начала статьи
            </p>
          </div>

          {/* Содержание */}
          <div>
            <label className="block text-sm font-normal text-primary-900 mb-2">
              Содержание <span className="text-primary-400">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              className="w-full px-4 py-3 border border-primary-200 rounded-apple focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-primary-900 font-light resize-y"
              placeholder="Введите содержание статьи"
            />
          </div>

          {/* Кнопки */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving || isUploadingImage}
              className="px-6 py-3 bg-primary-900 text-white rounded-apple hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-light"
            >
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              onClick={() => router.push(`/resources/articles/${params.id}`)}
              disabled={isSaving}
              className="px-6 py-3 border border-primary-200 text-primary-700 rounded-apple hover:bg-primary-50 transition-colors disabled:opacity-50 font-light"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

