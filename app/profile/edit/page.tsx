'use client'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckIcon, PlusIcon, XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline'
import { getActiveUser, loadSpecialistProfile, readJson, saveSpecialistProfile, type StoredUser, writeJson } from '@/lib/storage'
import { getCurrentUser, getSpecialist, updateSpecialist, isSupabaseAvailable, ensureSpecialistProfile } from '@/lib/supabase'
import { uploadPublicAsset } from '@/lib/supabaseStorage'

type Specialization = 'Дизайн' | 'SMM' | 'Веб-разработка'

interface ProjectImage {
  url: string
  file?: File
}

interface Project {
  id: string
  title: string
  description: string
  images: ProjectImage[]
}

type PersistedProject = {
  id: string
  title: string
  description: string
  images: Array<{ url: string }>
}

interface ProfileData {
  firstName: string
  lastName: string
  specialization: Specialization
  bio?: string
  telegram: string
  email?: string
  avatarUrl?: string
  showInSearch?: boolean
  useEmailForContact?: boolean
  projects?: Project[]
}

const createEmptyProfile = (): ProfileData => ({
  firstName: '',
  lastName: '',
  specialization: 'Дизайн',
  bio: '',
  telegram: '',
  email: '',
  useEmailForContact: false,
})

const SUPABASE_ENABLED = isSupabaseAvailable()
const MAX_PORTFOLIO_PREVIEW = 5
const STORAGE_CACHE_TTL = '604800'

const buildPortfolioPreview = (projectList: Array<{ images: Array<{ url: string }> }>) => {
  return projectList
    .flatMap((project) => project.images.map((image) => image.url))
    .filter((url): url is string => {
      if (typeof url !== 'string' || url.trim().length === 0) {
        return false
      }
      const trimmed = url.trim()
      // Исключаем data URLs (они слишком большие и не подходят для превью)
      // Оставляем только HTTP(S) URLs или относительные пути
      return (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) && !trimmed.startsWith('data:')
    })
    .slice(0, MAX_PORTFOLIO_PREVIEW)
}

const randomId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const getFileExtension = (file: File) => {
  if (file.name && file.name.includes('.')) {
    return file.name.split('.').pop()?.toLowerCase() || 'jpg'
  }
  if (file.type && file.type.includes('/')) {
    return file.type.split('/').pop() || 'jpg'
  }
  return 'jpg'
}

const createAvatarPath = (userId: string, extension: string) => {
  return `specialists/${userId}/avatar.${extension || 'jpg'}`
}

const createPortfolioPath = (userId: string, projectId: string, fileIndex: number, extension: string) => {
  const safeProjectId = projectId || `project-${fileIndex}`
  return `specialists/${userId}/portfolio/${safeProjectId}/${randomId()}.${extension || 'jpg'}`
}

function EditProfileForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
  
  useEffect(() => {
    // Проверяем авторизацию
    const checkAuth = async () => {
      if (SUPABASE_ENABLED) {
        const user = await getCurrentUser()
        if (user) {
          setCurrentUser({
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.displayName || '',
            password: '',
            type: 'specialist',
          })
          setIsAuthorized(true)
        } else {
          router.push('/login?redirect=/profile/edit')
        }
      } else {
        const user = getActiveUser()
        if (user?.email) {
          setCurrentUser(user)
          setIsAuthorized(true)
        } else {
          router.push('/login?redirect=/profile/edit')
        }
      }
    }
    checkAuth()
  }, [router])
  
  const [formData, setFormData] = useState<ProfileData>(createEmptyProfile)
  const [projects, setProjects] = useState<Project[]>([])
  const [activeTab, setActiveTab] = useState<'general' | 'freelancers' | 'companies'>('general')
  const [freelancerSubTab, setFreelancerSubTab] = useState<'profile' | 'portfolio'>('profile')
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [isCropModalOpen, setIsCropModalOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string>('')
  const [cropImageFile, setCropImageFile] = useState<File | null>(null)
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, size: 200 })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const cropImageRef = useRef<HTMLImageElement>(null)
  const cropContainerRef = useRef<HTMLDivElement>(null)

  // Читаем параметр tab из URL и устанавливаем активную вкладку
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam === 'freelancers' || tabParam === 'general' || tabParam === 'companies') {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  // Загружаем данные профиля из Supabase или localStorage
  useEffect(() => {
    if (!isAuthorized || !currentUser) return

    const loadProfile = async () => {
      try {
        if (SUPABASE_ENABLED) {
          // Загружаем из Supabase
          const specialist = await getSpecialist(currentUser.id)
          if (specialist) {
            const specialistEmail = specialist.email || ''
            setFormData({
              firstName: specialist.first_name || '',
              lastName: specialist.last_name || '',
              specialization: (specialist.specialization as Specialization) || 'Дизайн',
              bio: specialist.bio || '',
              telegram: specialist.telegram || '',
              email: specialistEmail,
              avatarUrl: specialist.avatar_url || '',
              showInSearch: specialist.show_in_search === true,
              useEmailForContact: !!specialistEmail, // Если email есть, значит переключатель был включен
            })
            
            // Загружаем аватарку
            if (specialist.avatar_url) {
              setAvatarPreview(specialist.avatar_url)
            }
            
            // Загружаем портфолио
            if (specialist.portfolio && Array.isArray(specialist.portfolio)) {
              setProjects(specialist.portfolio as Project[])
            }
          } else {
            // Если профиля нет, загружаем имя из user metadata или currentUser
            const nameParts = currentUser.name ? currentUser.name.split(' ') : []
            setFormData(prev => ({
              ...prev,
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || '',
              email: currentUser.email || '',
            }))
          }
        } else {
          // Fallback на localStorage
          const savedProfile = loadSpecialistProfile<ProfileData | null>(currentUser.id, null)
          if (savedProfile) {
            if ('name' in savedProfile && typeof savedProfile.name === 'string') {
              const nameParts = savedProfile.name.split(' ')
              setFormData({
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                specialization: (savedProfile as any).specialization || 'Дизайн',
                bio: savedProfile.bio || '',
                telegram: (savedProfile as any).telegram || '',
                email: savedProfile.email || currentUser.email || '',
              })
            } else {
              const savedEmail = savedProfile.email || ''
              setFormData({
                ...savedProfile,
                email: savedEmail,
                avatarUrl: (savedProfile as any).avatarUrl || '',
                showInSearch: savedProfile.showInSearch === true,
                useEmailForContact: !!savedEmail, // Если email есть, значит переключатель был включен
              })
              if ((savedProfile as any).avatarUrl) {
                setAvatarPreview((savedProfile as any).avatarUrl)
              }
              if (savedProfile.projects) {
                setProjects(savedProfile.projects)
              }
            }
          } else {
            // Если профиля нет, загружаем имя из currentUser
            const nameParts = currentUser.name ? currentUser.name.split(' ') : []
            setFormData(prev => ({
              ...prev,
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || '',
              email: currentUser.email || '',
            }))
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки профиля:', error)
        const nameParts = currentUser.name ? currentUser.name.split(' ') : []
        setFormData(prev => ({
          ...prev,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          email: currentUser.email || '',
        }))
      }
    }

    loadProfile()
  }, [isAuthorized, currentUser])

  const blobToDataUrl = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const canvasToProcessedFile = (canvas: HTMLCanvasElement, fileName: string): Promise<{ file: File; preview: string }> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            reject(new Error('Не удалось создать файл из изображения'))
            return
          }

          try {
            const preview = await blobToDataUrl(blob)
            const processedFile = new File([blob], fileName, { type: blob.type || 'image/jpeg' })
            resolve({ file: processedFile, preview })
          } catch (error) {
            reject(error)
          }
        },
        'image/jpeg',
        0.9,
      )
    })
  }

  // Функция для обработки аватарки (квадрат 400x400)
  const processAvatar = (file: File): Promise<{ file: File; preview: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Не удалось создать контекст canvas'))
            return
          }

          const targetSize = 400
          const size = Math.min(img.width, img.height)
          const x = (img.width - size) / 2
          const y = (img.height - size) / 2

          canvas.width = targetSize
          canvas.height = targetSize

          ctx.drawImage(img, x, y, size, size, 0, 0, targetSize, targetSize)

          canvasToProcessedFile(canvas, `avatar-${Date.now()}.jpg`).then(resolve).catch(reject)
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleAvatarUpload = async (file: File) => {
    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const src = e.target?.result as string
          setCropImageSrc(src)
          setCropImageFile(file)
          
          // Устанавливаем начальные размеры для отображения
          const maxContainerSize = Math.min(500, window.innerWidth - 128)
          const imageAspect = img.width / img.height
          let displayWidth = img.width
          let displayHeight = img.height
          
          // Масштабируем, если изображение больше контейнера
          if (displayWidth > maxContainerSize || displayHeight > maxContainerSize) {
            if (displayWidth > displayHeight) {
              displayWidth = maxContainerSize
              displayHeight = maxContainerSize / imageAspect
            } else {
              displayHeight = maxContainerSize
              displayWidth = maxContainerSize * imageAspect
            }
          }
          
          setImageSize({ width: displayWidth, height: displayHeight })
          
          // Начальная позиция обрезки по центру (квадрат 80% от меньшей стороны)
          const initialSize = Math.min(displayWidth, displayHeight) * 0.8
          setCropArea({
            x: (displayWidth - initialSize) / 2,
            y: (displayHeight - initialSize) / 2,
            size: initialSize
          })
          
          setIsCropModalOpen(true)
        }
        img.onerror = () => {
          alert('Не удалось загрузить изображение')
        }
        img.src = src
      }
      reader.onerror = () => {
        alert('Не удалось прочитать файл')
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Ошибка обработки аватарки:', error)
      alert('Не удалось обработать аватарку')
    }
  }

  const handleCropApply = () => {
    if (!cropImageFile || !cropImageRef.current) return

    const img = cropImageRef.current
    const scaleX = img.naturalWidth / img.width
    const scaleY = img.naturalHeight / img.height

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const targetSize = 400
    canvas.width = targetSize
    canvas.height = targetSize

    const sourceX = cropArea.x * scaleX
    const sourceY = cropArea.y * scaleY
    const sourceSize = cropArea.size * Math.min(scaleX, scaleY)

    ctx.drawImage(
      img,
      sourceX, sourceY, sourceSize, sourceSize,
      0, 0, targetSize, targetSize
    )

    canvasToProcessedFile(canvas, `avatar-${Date.now()}.jpg`)
      .then(({ file: processedFile, preview }) => {
        setAvatarPreview(preview)
        if (SUPABASE_ENABLED) {
          setPendingAvatarFile(processedFile)
        } else {
          setFormData({ ...formData, avatarUrl: preview })
        }
        setIsCropModalOpen(false)
        setCropImageSrc('')
        setCropImageFile(null)
      })
      .catch((error) => {
        console.error('Ошибка обработки обрезки:', error)
        alert('Не удалось применить обрезку')
      })
  }

  const handleCropCancel = () => {
    setIsCropModalOpen(false)
    setCropImageSrc('')
    setCropImageFile(null)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!cropContainerRef.current) return
    const rect = cropContainerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Проверяем, что клик внутри области обрезки
    if (
      x >= cropArea.x && x <= cropArea.x + cropArea.size &&
      y >= cropArea.y && y <= cropArea.y + cropArea.size
    ) {
      setIsDragging(true)
      setDragStart({ x: x - cropArea.x, y: y - cropArea.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !cropContainerRef.current) return
    const rect = cropContainerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - dragStart.x
    const y = e.clientY - rect.top - dragStart.y

    const maxX = imageSize.width - cropArea.size
    const maxY = imageSize.height - cropArea.size

    setCropArea({
      ...cropArea,
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY))
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      const handleMouseMoveGlobal = (e: MouseEvent) => {
        if (!cropContainerRef.current) return
        const rect = cropContainerRef.current.getBoundingClientRect()
        const x = e.clientX - rect.left - dragStart.x
        const y = e.clientY - rect.top - dragStart.y

        const maxX = imageSize.width - cropArea.size
        const maxY = imageSize.height - cropArea.size

        setCropArea({
          ...cropArea,
          x: Math.max(0, Math.min(x, maxX)),
          y: Math.max(0, Math.min(y, maxY))
        })
      }

      const handleMouseUpGlobal = () => {
        setIsDragging(false)
      }

      document.addEventListener('mousemove', handleMouseMoveGlobal)
      document.addEventListener('mouseup', handleMouseUpGlobal)

      return () => {
        document.removeEventListener('mousemove', handleMouseMoveGlobal)
        document.removeEventListener('mouseup', handleMouseUpGlobal)
      }
    }
  }, [isDragging, dragStart, imageSize, cropArea])

  // Функция для обрезки изображения в формат 4:3 (альбомная ориентация)
  const cropImageTo4_3 = (file: File, projectId: string): Promise<{ file: File; preview: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Не удалось создать контекст canvas'))
            return
          }

          // Фиксированный размер для альбомной ориентации 4:3
          const targetWidth = 1200
          const targetHeight = 900
          const targetRatio = 4 / 3

          // Вычисляем размеры для обрезки в формате 4:3
          let sourceWidth = img.width
          let sourceHeight = img.height
          let sourceX = 0
          let sourceY = 0

          const imgRatio = img.width / img.height

          if (imgRatio > targetRatio) {
            // Изображение шире нужного формата, обрезаем по ширине
            sourceWidth = img.height * targetRatio
            sourceX = (img.width - sourceWidth) / 2
          } else {
            // Изображение выше нужного формата, обрезаем по высоте
            sourceHeight = img.width / targetRatio
            sourceY = (img.height - sourceHeight) / 2
          }

          // Устанавливаем размеры canvas
          canvas.width = targetWidth
          canvas.height = targetHeight

          // Рисуем обрезанное изображение на canvas
          ctx.drawImage(
            img,
            sourceX, sourceY, sourceWidth, sourceHeight,
            0, 0, targetWidth, targetHeight
          )

          canvasToProcessedFile(canvas, `portfolio-${projectId}-${Date.now()}.jpg`).then(resolve).catch(reject)
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleImageUpload = async (projectId: string, file: File) => {
    try {
      const { file: processedFile, preview } = await cropImageTo4_3(file, projectId)
      setProjects(prev => prev.map(project => 
        project.id === projectId
          ? { 
              ...project, 
              images: [
                ...project.images, 
                { 
                  url: preview, 
                  file: SUPABASE_ENABLED ? processedFile : undefined,
                },
              ],
            }
          : project
      ))
    } catch (error) {
      console.error('Ошибка обработки изображения:', error)
      alert('Не удалось обработать изображение')
    }
  }

  const removeImage = (projectId: string, imageIndex: number) => {
    setProjects(prev => prev.map(project =>
      project.id === projectId
        ? { ...project, images: project.images.filter((_, i) => i !== imageIndex) }
        : project
    ))
  }

  const addProject = () => {
    if (projects.length >= 3) {
      alert('Можно добавить максимум 3 проекта')
      return
    }
    setProjects(prev => [...prev, {
      id: Date.now().toString(),
      title: '',
      description: '',
      images: []
    }])
  }

  const removeProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId))
  }

  const updateProject = (projectId: string, field: 'title' | 'description', value: string) => {
    setProjects(prev => prev.map(project =>
      project.id === projectId
        ? { ...project, [field]: value }
        : project
    ))
  }

  const uploadProfileAssets = async () => {
    if (!SUPABASE_ENABLED || !currentUser) {
      return {
        avatarUrl: formData.avatarUrl || '',
        uploadedProjects: projects.map((project) => ({
          id: project.id,
          title: project.title,
          description: project.description,
          images: project.images.map((image) => ({ url: image.url })),
        })),
      }
    }

    let avatarUrl = formData.avatarUrl || ''

    if (pendingAvatarFile) {
      try {
        const extension = getFileExtension(pendingAvatarFile)
        const { publicUrl } = await uploadPublicAsset({
          file: pendingAvatarFile,
          path: createAvatarPath(currentUser.id, extension),
          cacheControl: STORAGE_CACHE_TTL,
          upsert: true,
        })
        avatarUrl = publicUrl
        setPendingAvatarFile(null)
        setAvatarPreview(publicUrl)
      } catch (error: any) {
        // Если bucket не найден, используем data URL как fallback
        if (error?.message?.includes('Bucket') && error?.message?.includes('не найден')) {
          const reader = new FileReader()
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = (e) => resolve(e.target?.result as string)
            reader.onerror = reject
            reader.readAsDataURL(pendingAvatarFile)
          })
          avatarUrl = dataUrl
          setPendingAvatarFile(null)
          setAvatarPreview(dataUrl)
          alert('⚠️ Supabase Storage не настроен. Используется локальное хранилище. Создайте bucket "public-assets" для постоянного хранения файлов.')
        } else {
          throw error
        }
      }
    }

    const uploadedProjects: PersistedProject[] = await Promise.all(
      projects.map(async (project, projectIndex) => {
        const uploadedImages = await Promise.all(
          project.images.map(async (image, imageIndex) => {
            if (!SUPABASE_ENABLED || !image.file) {
              return { url: image.url }
            }

            try {
              const extension = getFileExtension(image.file)
              const { publicUrl } = await uploadPublicAsset({
                file: image.file,
                path: createPortfolioPath(currentUser.id, project.id || `project-${projectIndex}`, imageIndex, extension),
                cacheControl: STORAGE_CACHE_TTL,
                upsert: true,
              })

              return { url: publicUrl }
            } catch (error: any) {
              // Если bucket не найден, используем data URL как fallback
              if (error?.message?.includes('Bucket') && error?.message?.includes('не найден')) {
                const reader = new FileReader()
                const dataUrl = await new Promise<string>((resolve, reject) => {
                  reader.onload = (e) => resolve(e.target?.result as string)
                  reader.onerror = reject
                  reader.readAsDataURL(image.file!)
                })
                return { url: dataUrl }
              }
              throw error
            }
          }),
        )

        return {
          id: project.id,
          title: project.title,
          description: project.description,
          images: uploadedImages,
        }
      }),
    )

    return {
      avatarUrl,
      uploadedProjects,
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentUser) {
      router.push('/login?redirect=/profile/edit')
      return
    }

    if (isSaving) {
      return
    }

    setIsSaving(true)

    try {
      if (SUPABASE_ENABLED) {
        // Сохраняем общие данные (фото, имя, фамилия)
        if (activeTab === 'general') {
          // Создаем профиль специалиста, если его нет
          try {
            await ensureSpecialistProfile({
              id: currentUser.id,
              email: currentUser.email || '',
              displayName: `${formData.firstName} ${formData.lastName}`.trim(),
            })
          } catch (profileError) {
            console.debug('Профиль специалиста уже существует или ошибка создания:', profileError)
          }

          const { avatarUrl: uploadedAvatarUrl } = await uploadProfileAssets()

          await updateSpecialist(currentUser.id, {
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            avatar_url: uploadedAvatarUrl || formData.avatarUrl || '',
          })

          setFormData((prev) => ({
            ...prev,
            avatarUrl: uploadedAvatarUrl || prev.avatarUrl || '',
          }))

          alert('Изменения сохранены')
          setIsSaving(false)
            return
        }

        // Сохраняем данные для фрилансеров
        if (activeTab === 'freelancers') {
          // Валидация
          // Проверяем, что указан хотя бы один способ связи
          const hasTelegram = formData.telegram.trim().length > 0
          const hasEmail = formData.useEmailForContact && (formData.email || currentUser.email || '').trim().length > 0
          if (!hasTelegram && !hasEmail) {
            alert('Укажите хотя бы один способ связи: Telegram или включите использование почты')
            setIsSaving(false)
            return
          }
          
          // Если пользователь хочет опубликовать карточку, проверяем полноту данных
          if (formData.showInSearch === true) {
            if (!hasTelegram) {
              alert('Для публикации карточки необходимо указать Telegram')
              setIsSaving(false)
              return
            }
          }

          // Создаем профиль специалиста, если его нет
          try {
            await ensureSpecialistProfile({
              id: currentUser.id,
              email: currentUser.email || '',
              displayName: `${formData.firstName} ${formData.lastName}`.trim(),
            })
          } catch (profileError) {
            // Профиль может уже существовать - это нормально
            console.debug('Профиль специалиста уже существует или ошибка создания:', profileError)
          }

          const { avatarUrl: uploadedAvatarUrl, uploadedProjects } = await uploadProfileAssets()
          const portfolioData = uploadedProjects.map((project) => ({
            id: project.id,
            title: project.title,
            description: project.description,
            images: project.images.map((image) => ({ url: image.url })),
          }))
          const portfolioPreview = buildPortfolioPreview(uploadedProjects)

          // Определяем, можно ли опубликовать карточку
          // Карточка публикуется только если заполнены все обязательные поля и указан хотя бы один способ связи
          const canPublish = Boolean(
            formData.firstName.trim() &&
            formData.lastName.trim() &&
            formData.telegram.trim() // Для публикации обязательно нужен Telegram
          )
            
          const shouldPublish = formData.showInSearch === true && canPublish

          // Определяем email для связи
          // Сохраняем null вместо пустой строки, если переключатель выключен
          const contactEmail = formData.useEmailForContact ? (formData.email || currentUser.email || '') : null

          await updateSpecialist(currentUser.id, {
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            specialization: formData.specialization,
            bio: formData.bio || '',
            telegram: formData.telegram.trim(),
            email: contactEmail,
            avatar_url: uploadedAvatarUrl || formData.avatarUrl || '',
            show_in_search: shouldPublish,
            portfolio: portfolioData,
            portfolio_preview: portfolioPreview,
          })
          
          // Обновляем состояние, если карточка не может быть опубликована
          if (formData.showInSearch === true && !canPublish) {
            setFormData(prev => ({ ...prev, showInSearch: false }))
          }

          setFormData((prev) => ({
            ...prev,
            avatarUrl: uploadedAvatarUrl || prev.avatarUrl || '',
          }))

          setProjects(
            uploadedProjects.map((project) => ({
              ...project,
              images: project.images.map((image) => ({ url: image.url })),
            })),
          )

          alert('Изменения сохранены')
        }
      } else {
        // Fallback на localStorage
        if (activeTab === 'general') {
          // Сохраняем общие данные
          const profileDataWithProjects = {
            ...formData,
            projects: projects.map(p => ({
              id: p.id,
              title: p.title,
              description: p.description,
              images: p.images.map(img => ({ url: img.url }))
            })),
            portfolioPreview: buildPortfolioPreview(projects.map(p => ({
              id: p.id,
              title: p.title,
              description: p.description,
              images: p.images.map(img => ({ url: img.url }))
            }))),
          }
          saveSpecialistProfile(currentUser.id, profileDataWithProjects)
        alert('Изменения сохранены')
          setIsSaving(false)
          return
        }

        if (activeTab === 'freelancers') {
          // Валидация
          const hasTelegram = formData.telegram.trim().length > 0
          const hasEmail = formData.useEmailForContact && (formData.email || currentUser.email || '').trim().length > 0
          if (!hasTelegram && !hasEmail) {
            alert('Укажите хотя бы один способ связи: Telegram или включите использование почты')
            setIsSaving(false)
            return
          }
          
          if (formData.showInSearch === true) {
            if (!hasTelegram) {
              alert('Для публикации карточки необходимо указать Telegram')
              setIsSaving(false)
              return
            }
          }

          const projectsPayload = projects.map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            images: p.images.map(img => ({ url: img.url }))
          }))
          
          // Определяем, можно ли опубликовать карточку
          const canPublish = Boolean(
            formData.firstName.trim() &&
            formData.lastName.trim() &&
            hasTelegram // Для публикации обязательно нужен Telegram
          )
            
          const shouldPublish = formData.showInSearch === true && canPublish
          
          // Определяем email для связи
          // Сохраняем null вместо пустой строки, если переключатель выключен
          const contactEmail = formData.useEmailForContact ? (formData.email || currentUser.email || '') : null
          
          const profileDataWithProjects = {
            ...formData,
            email: contactEmail,
            showInSearch: shouldPublish,
            projects: projectsPayload,
            portfolioPreview: buildPortfolioPreview(projectsPayload),
          }
          saveSpecialistProfile(currentUser.id, profileDataWithProjects)
          
          // Обновляем состояние, если карточка не может быть опубликована
          if (formData.showInSearch === true && !canPublish) {
            setFormData(prev => ({ ...prev, showInSearch: false }))
          }
          
          const specialists = readJson<any[]>('specialists', [])
          const existingIndex = specialists.findIndex((s: any) => s.id === currentUser.id)
          const specialistId = currentUser.id || Date.now().toString()
          
          const specialistData = {
            id: specialistId,
            ...profileDataWithProjects,
            rating: existingIndex >= 0 ? specialists[existingIndex].rating || 0 : 0,
            hiredCount: existingIndex >= 0 ? specialists[existingIndex].hiredCount || 0 : 0,
          }
          
          if (existingIndex >= 0) {
            specialists[existingIndex] = specialistData
          } else {
            specialists.push(specialistData)
          }
          
          writeJson('specialists', specialists)
          window.dispatchEvent(new Event('storage'))
        }

        alert('Изменения сохранены')
      }
    } catch (error: any) {
      console.error('Ошибка сохранения профиля:', error)
      alert(error?.message || 'Не удалось сохранить профиль. Попробуйте снова.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAuthorized) {
    return (
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-16">
        <div className="text-center text-primary-600 font-light">Проверка авторизации...</div>
      </div>
    )
  }

  const specializations: Specialization[] = ['Дизайн', 'SMM', 'Веб-разработка']

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-primary-900 mb-2 sm:mb-3 tracking-tight">Настройки</h1>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-primary-200">
        <div className="flex gap-6 overflow-x-auto scrollbar-hide -mx-4 sm:mx-0 px-4 sm:px-0">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`relative text-sm font-normal transition-colors tracking-tight pb-4 whitespace-nowrap ${
              activeTab === 'general'
                ? 'text-[#FF4600]'
                : 'text-primary-400 hover:text-primary-600'
            }`}
          >
            Общие
            {activeTab === 'general' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF4600]"></span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('freelancers')}
            className={`relative text-sm font-normal transition-colors tracking-tight pb-4 whitespace-nowrap ${
              activeTab === 'freelancers'
                ? 'text-[#FF4600]'
                : 'text-primary-400 hover:text-primary-600'
            }`}
          >
            Для фрилансеров
            {activeTab === 'freelancers' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF4600]"></span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('companies')}
            className={`relative text-sm font-normal transition-colors tracking-tight pb-4 whitespace-nowrap ${
              activeTab === 'companies'
                ? 'text-[#FF4600]'
                : 'text-primary-400 hover:text-primary-600'
            }`}
          >
            Для компаний
            {activeTab === 'companies' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF4600]"></span>
            )}
          </button>
        </div>
      </div>


      <form onSubmit={handleSubmit}>
        {activeTab === 'general' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Загрузка аватарки */}
            <div>
              <label className="block text-sm font-light text-primary-700 mb-2">
                Фото профиля
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                <div className="relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-apple overflow-hidden border border-primary-200 bg-primary-50 flex items-center justify-center">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Аватар"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary-400 text-xl sm:text-2xl font-light">
                        {(formData.firstName?.[0] || '') + (formData.lastName?.[0] || '') || '?'}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 w-full sm:w-auto">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    <label className="inline-block cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleAvatarUpload(file)
                          }
                        }}
                      />
                      <span className="inline-flex items-center gap-2 px-4 py-2 border border-primary-200 rounded-apple text-sm font-normal text-primary-700 hover:bg-primary-50 transition-colors">
                        <PhotoIcon className="w-4 h-4" />
                        {avatarPreview ? 'Изменить фото' : 'Загрузить фото'}
                      </span>
                    </label>
                    {avatarPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarPreview('')
                          setFormData({ ...formData, avatarUrl: '' })
                          setPendingAvatarFile(null)
                        }}
                        className="text-sm font-light text-primary-500 hover:text-primary-700"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                  <p className="text-xs font-light text-primary-500 mt-2">
                    Рекомендуемый размер: квадрат, минимум 400x400px
                  </p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-light text-primary-700 mb-2">
                  Имя
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-light text-primary-700 mb-2">
                  Фамилия
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-primary-100">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 bg-primary-900 text-white px-6 py-3 sm:py-4 rounded-apple hover:bg-primary-800 transition-colors font-normal tracking-tight disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <CheckIcon className="w-5 h-5" />
                {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="border border-primary-200 text-primary-700 px-6 py-3 sm:py-4 rounded-apple hover:bg-primary-50 transition-colors font-normal tracking-tight"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {activeTab === 'freelancers' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Toggle: Показывать меня в поиске */}
            <div className="flex items-center justify-between p-4 bg-primary-50 rounded-apple border border-primary-100">
              <div className="flex-1">
                <span className="text-sm font-light text-primary-700 block">Показывать меня в поиске</span>
                {formData.showInSearch !== true && (
                  <p className="text-xs font-light text-primary-500 mt-1">
                    Ваша карточка не опубликована. Заполните все обязательные поля и укажите Telegram для публикации.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  const checked = !formData.showInSearch
                  // Проверяем, можно ли опубликовать карточку
                  const hasTelegram = formData.telegram.trim().length > 0
                  const hasRequiredFields = formData.firstName.trim() && formData.lastName.trim()
                  
                  if (checked && (!hasRequiredFields || !hasTelegram)) {
                    alert('Для публикации карточки необходимо заполнить все обязательные поля (имя, фамилия) и указать Telegram')
                    return
                  }
                  
                  setFormData({ ...formData, showInSearch: checked })
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF4600] focus:ring-offset-2 ${
                  formData.showInSearch === true ? 'bg-[#FF4600]' : 'bg-primary-300'
                }`}
                role="switch"
                aria-checked={formData.showInSearch === true}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.showInSearch === true ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Segmented Controls */}
            <div className="flex gap-2 p-1 bg-primary-50 rounded-apple border border-primary-100">
              <button
                type="button"
                onClick={() => setFreelancerSubTab('profile')}
                className={`flex-1 px-4 py-2 rounded-apple text-sm font-normal transition-colors ${
                  freelancerSubTab === 'profile'
                    ? 'bg-white text-primary-900 shadow-sm'
                    : 'text-primary-600 hover:text-primary-900'
                }`}
              >
                Профиль
              </button>
              <button
                type="button"
                onClick={() => setFreelancerSubTab('portfolio')}
                className={`flex-1 px-4 py-2 rounded-apple text-sm font-normal transition-colors ${
                  freelancerSubTab === 'portfolio'
                    ? 'bg-white text-primary-900 shadow-sm'
                    : 'text-primary-600 hover:text-primary-900'
                }`}
              >
                Портфолио
              </button>
            </div>

            {freelancerSubTab === 'profile' && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label htmlFor="specialization" className="block text-sm font-light text-primary-700 mb-2">
                    Специализация
                  </label>
              <select
                id="specialization"
                className="w-full px-5 py-4 border border-primary-200 rounded-apple text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value as Specialization })}
              >
                {specializations.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-light text-primary-700 mb-2">
                О себе
              </label>
              <textarea
                id="bio"
                rows={5}
                placeholder="Расскажите о себе, своем опыте и целях..."
                className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white"
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="telegram" className="block text-sm font-light text-primary-700 mb-2">
                Телеграм для связи
              </label>
              <input
                id="telegram"
                type="text"
                placeholder="@username"
                className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white"
                value={formData.telegram}
                onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
              />
              <p className="text-xs font-light text-primary-500 mt-2">
                Обязательно для публикации карточки. Укажите хотя бы один способ связи: Telegram или включите использование почты.
              </p>
            </div>

            <div className="pt-4 border-t border-primary-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.useEmailForContact === true}
                  onChange={(e) => setFormData({ ...formData, useEmailForContact: e.target.checked })}
                  className="w-5 h-5 rounded border-primary-200 text-[#FF4600] focus:ring-1 focus:ring-[#FF4600] focus:ring-offset-0"
                />
                <div className="flex-1">
                  <span className="text-sm font-light text-primary-700 block">Использовать почту для связи</span>
                  <p className="text-xs font-light text-primary-500 mt-1">
                    {formData.useEmailForContact ? (currentUser?.email || 'example@gmail.com') : 'Почта не будет использоваться для связи'}
                  </p>
                </div>
              </label>
            </div>

              </div>
            )}

            {freelancerSubTab === 'portfolio' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-light text-primary-900 mb-1 tracking-tight">Портфолио</h2>
                    <p className="text-xs sm:text-sm font-light text-primary-600">Добавьте до 3 проектов с фотографиями</p>
                  </div>
                  {projects.length < 3 && (
                    <button
                      type="button"
                      onClick={addProject}
                      className="inline-flex items-center justify-center gap-2 bg-primary-900 text-white px-4 sm:px-5 py-2 sm:py-3 rounded-apple hover:bg-primary-800 transition-colors font-normal tracking-tight"
                    >
                      <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      Добавить проект
                    </button>
                  )}
                </div>

                <div className="space-y-4 sm:space-y-6">
              {projects.map((project, projectIndex) => (
                <div key={project.id} className="border border-primary-200 rounded-apple p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
                  <div className="flex items-start justify-between">
                    <h3 className="text-xl font-normal text-primary-900 tracking-tight">Проект {projectIndex + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeProject(project.id)}
                      className="p-2 hover:bg-primary-50 rounded-apple transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5 text-primary-600" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-light text-primary-700 mb-2">
                      Название проекта
                    </label>
                    <input
                      type="text"
                      placeholder="Название проекта"
                      className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white"
                      value={project.title}
                      onChange={(e) => updateProject(project.id, 'title', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-light text-primary-700 mb-2">
                      Описание проекта
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Описание проекта"
                      className="w-full px-5 py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white"
                      value={project.description}
                      onChange={(e) => updateProject(project.id, 'description', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-light text-primary-700 mb-2">
                      Фотографии (до 3, формат 4:3)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {project.images.map((image, imageIndex) => (
                        <div key={imageIndex} className="relative group">
                          <div className="rounded-apple overflow-hidden border border-primary-200 bg-primary-50" style={{ aspectRatio: '4/3' }}>
                            <img
                              src={image.url}
                              alt={`Проект ${projectIndex + 1} - фото ${imageIndex + 1}`}
                              className="w-full h-full object-cover"
                              style={{ aspectRatio: '4/3' }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(project.id, imageIndex)}
                            className="absolute top-2 right-2 p-1 bg-white/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <XMarkIcon className="w-4 h-4 text-primary-700" />
                          </button>
                        </div>
                      ))}
                      {project.images.length < 3 && (
                        <label className="rounded-apple border-2 border-dashed border-primary-300 hover:border-primary-400 transition-colors cursor-pointer flex items-center justify-center bg-primary-50" style={{ aspectRatio: '4/3' }}>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                handleImageUpload(project.id, file)
                              }
                            }}
                          />
                          <div className="text-center">
                            <PhotoIcon className="w-8 h-8 text-primary-400 mx-auto mb-2" />
                            <span className="text-xs font-light text-primary-600">Добавить фото</span>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {projects.length === 0 && (
                <div className="text-center py-16 text-primary-500 font-light">
                  <PhotoIcon className="w-16 h-16 text-primary-300 mx-auto mb-4" />
                  <p className="text-base mb-2">Портфолио пока пусто</p>
                  <p className="text-sm">Добавьте проекты, чтобы показать свои работы</p>
                </div>
              )}
              </div>
            </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-primary-100">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 bg-primary-900 text-white px-6 py-3 sm:py-4 rounded-apple hover:bg-primary-800 transition-colors font-normal tracking-tight disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <CheckIcon className="w-5 h-5" />
                {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="border border-primary-200 text-primary-700 px-6 py-3 sm:py-4 rounded-apple hover:bg-primary-50 transition-colors font-normal tracking-tight"
              >
                Отмена
              </button>
            </div>
          </div>
        )}


        {activeTab === 'companies' && (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-light text-primary-900 mb-4 tracking-tight">Для компаний</h2>
              <p className="text-sm font-light text-primary-600 mb-6">Настройки для компаний будут доступны в ближайшее время</p>
            </div>
          </div>
        )}
      </form>

      {/* Модальное окно для обрезки аватарки */}
      {isCropModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-apple border border-primary-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-primary-100">
              <h2 className="text-xl font-normal text-primary-900 tracking-tight">Обрезка фотографии</h2>
              <button
                type="button"
                onClick={handleCropCancel}
                className="w-9 h-9 rounded-full bg-white border border-primary-200 flex items-center justify-center hover:bg-primary-50 active:scale-95 transition-all duration-200"
              >
                <XMarkIcon className="w-5 h-5 text-primary-700" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div
                ref={cropContainerRef}
                className="relative mx-auto bg-primary-50 rounded-apple overflow-hidden"
                style={{ width: imageSize.width, height: imageSize.height }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                {cropImageSrc && (
                  <img
                    ref={cropImageRef}
                    src={cropImageSrc}
                    alt="Обрезка"
                    className="block w-full h-full object-contain"
                    style={{ width: imageSize.width, height: imageSize.height }}
                    draggable={false}
                  />
                )}
                
                {/* Затемнение вне области обрезки */}
                {imageSize.width > 0 && imageSize.height > 0 && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `
                        linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.5) ${(cropArea.x / imageSize.width) * 100}%,
                        transparent ${(cropArea.x / imageSize.width) * 100}%, transparent ${((cropArea.x + cropArea.size) / imageSize.width) * 100}%,
                        rgba(0,0,0,0.5) ${((cropArea.x + cropArea.size) / imageSize.width) * 100}%, rgba(0,0,0,0.5) 100%),
                        linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.5) ${(cropArea.y / imageSize.height) * 100}%,
                        transparent ${(cropArea.y / imageSize.height) * 100}%, transparent ${((cropArea.y + cropArea.size) / imageSize.height) * 100}%,
                        rgba(0,0,0,0.5) ${((cropArea.y + cropArea.size) / imageSize.height) * 100}%, rgba(0,0,0,0.5) 100%)
                      `
                    }}
                  />
                )}

                {/* Рамка области обрезки */}
                <div
                  className="absolute border-2 border-white shadow-lg cursor-move"
                  style={{
                    left: cropArea.x,
                    top: cropArea.y,
                    width: cropArea.size,
                    height: cropArea.size,
                  }}
                >
                  {/* Углы для визуального указания области обрезки */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white" />
                </div>
              </div>

              <div className="mt-4 text-center">
                <p className="text-sm font-light text-primary-600">
                  Перетащите рамку, чтобы выбрать область для обрезки
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-primary-100">
              <button
                type="button"
                onClick={handleCropCancel}
                className="px-6 py-3 border border-primary-200 text-primary-700 rounded-apple hover:bg-primary-50 transition-colors font-normal tracking-tight"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleCropApply}
                className="inline-flex items-center justify-center gap-2 bg-primary-900 text-white px-6 py-3 rounded-apple hover:bg-primary-800 transition-colors font-normal tracking-tight"
              >
                <CheckIcon className="w-5 h-5" />
                Применить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EditProfilePage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <div className="text-center text-primary-600 font-light">Загрузка...</div>
      </div>
    }>
      <EditProfileForm />
    </Suspense>
  )
}
