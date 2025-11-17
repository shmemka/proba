'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CheckIcon, PlusIcon, XMarkIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline'
import { getActiveUser, loadSpecialistProfile, readJson, saveSpecialistProfile, type StoredUser, writeJson } from '@/lib/storage'
import { getCurrentUser, getSpecialist, updateSpecialist, isSupabaseAvailable } from '@/lib/supabase'
import Image from 'next/image'

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

interface ProfileData {
  firstName: string
  lastName: string
  specialization: Specialization
  bio?: string
  telegram: string
  email?: string
  avatarUrl?: string
  showInSearch?: boolean
  projects?: Project[]
}

const createEmptyProfile = (): ProfileData => ({
  firstName: '',
  lastName: '',
  specialization: 'Дизайн',
  bio: '',
  telegram: '',
  email: '',
})

export default function EditProfilePage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null)
  
  useEffect(() => {
    const checkAuth = async () => {
      if (isSupabaseAvailable()) {
        const user = await getCurrentUser()
        if (user) {
          const userType = user.user_metadata?.userType
          if (userType === 'specialist') {
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
          router.push('/login?redirect=/profile/edit')
        }
      } else {
        const user = getActiveUser()
        if (user?.type === 'specialist' && user.email) {
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
  const [activeTab, setActiveTab] = useState<'card' | 'portfolio'>('card')
  const [avatarPreview, setAvatarPreview] = useState<string>('')

  useEffect(() => {
    if (!isAuthorized || !currentUser) return

    const loadProfile = async () => {
      try {
        if (isSupabaseAvailable()) {
          const specialist = await getSpecialist(currentUser.id)
          if (specialist) {
            setFormData({
              firstName: specialist.first_name || '',
              lastName: specialist.last_name || '',
              specialization: (specialist.specialization as Specialization) || 'Дизайн',
              bio: specialist.bio || '',
              telegram: specialist.telegram || '',
              email: specialist.email || currentUser.email || '',
              avatarUrl: specialist.avatar_url || '',
              showInSearch: specialist.show_in_search !== undefined ? specialist.show_in_search : true,
            })
            
            if (specialist.avatar_url) {
              setAvatarPreview(specialist.avatar_url)
            }
            
            if (specialist.portfolio && Array.isArray(specialist.portfolio)) {
              setProjects(specialist.portfolio as Project[])
            }
          } else {
            setFormData(prev => ({ ...prev, email: currentUser.email || '' }))
          }
        } else {
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
              setFormData({
                ...savedProfile,
                email: savedProfile.email || currentUser.email || '',
                avatarUrl: (savedProfile as any).avatarUrl || '',
                showInSearch: savedProfile.showInSearch !== undefined ? savedProfile.showInSearch : true,
              })
              if ((savedProfile as any).avatarUrl) {
                setAvatarPreview((savedProfile as any).avatarUrl)
              }
              if (savedProfile.projects) {
                setProjects(savedProfile.projects)
              }
            }
          } else {
            setFormData(prev => ({ ...prev, email: currentUser.email || '' }))
          }
        }
      } catch (error) {
        console.error('Ошибка загрузки профиля:', error)
        setFormData(prev => ({ ...prev, email: currentUser.email || '' }))
      }
    }

    loadProfile()
  }, [isAuthorized, currentUser])

  const processAvatar = (file: File): Promise<string> => {
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

          resolve(canvas.toDataURL('image/jpeg', 0.9))
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
      const processedAvatar = await processAvatar(file)
      setAvatarPreview(processedAvatar)
      setFormData({ ...formData, avatarUrl: processedAvatar })
    } catch (error) {
      console.error('Ошибка обработки аватарки:', error)
      alert('Не удалось обработать аватарку')
    }
  }

  const cropImageTo4_3 = (file: File): Promise<string> => {
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

          const targetWidth = 1200
          const targetHeight = 900
          const targetRatio = 4 / 3

          let sourceWidth = img.width
          let sourceHeight = img.height
          let sourceX = 0
          let sourceY = 0

          const imgRatio = img.width / img.height

          if (imgRatio > targetRatio) {
            sourceWidth = img.height * targetRatio
            sourceX = (img.width - sourceWidth) / 2
          } else {
            sourceHeight = img.width / targetRatio
            sourceY = (img.height - sourceHeight) / 2
          }

          canvas.width = targetWidth
          canvas.height = targetHeight

          ctx.drawImage(
            img,
            sourceX, sourceY, sourceWidth, sourceHeight,
            0, 0, targetWidth, targetHeight
          )

          resolve(canvas.toDataURL('image/jpeg', 0.9))
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleImageUpload = useCallback(async (projectId: string, files: FileList | null) => {
    if (!files || files.length === 0) return
    
    try {
      const uploadPromises = Array.from(files).slice(0, 3).map(file => cropImageTo4_3(file))
      const croppedImages = await Promise.all(uploadPromises)
      
      setProjects(prev => prev.map(project => 
        project.id === projectId
          ? { 
              ...project, 
              images: [
                ...project.images, 
                ...croppedImages.map(url => ({ url }))
              ].slice(0, 3)
            }
          : project
      ))
    } catch (error) {
      console.error('Ошибка обработки изображения:', error)
      alert('Не удалось обработать изображение')
    }
  }, [])

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
    if (confirm('Удалить этот проект?')) {
      setProjects(prev => prev.filter(p => p.id !== projectId))
    }
  }

  const updateProject = (projectId: string, field: 'title' | 'description', value: string) => {
    setProjects(prev => prev.map(project =>
      project.id === projectId
        ? { ...project, [field]: value }
        : project
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.telegram.trim()) {
      alert('Заполните обязательные поля: имя, фамилия и Telegram')
      return
    }

    if (!currentUser) {
      router.push('/login?redirect=/profile/edit')
      return
    }

    try {
      if (isSupabaseAvailable()) {
        const portfolioData = projects
          .filter(p => p.title.trim() || p.description.trim() || p.images.length > 0)
          .map(p => ({
            id: p.id,
            title: p.title.trim(),
            description: p.description.trim(),
            images: p.images.map(img => ({ url: img.url }))
          }))

        await updateSpecialist(currentUser.id, {
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          specialization: formData.specialization,
          bio: formData.bio || '',
          telegram: formData.telegram.trim(),
          email: formData.email || currentUser.email,
          avatar_url: formData.avatarUrl || '',
          show_in_search: formData.showInSearch !== false,
          portfolio: portfolioData,
        })

        router.push('/specialists')
      } else {
        const profileDataWithProjects = {
          ...formData,
          projects: projects
            .filter(p => p.title.trim() || p.description.trim() || p.images.length > 0)
            .map(p => ({
              id: p.id,
              title: p.title.trim(),
              description: p.description.trim(),
              images: p.images.map(img => ({ url: img.url }))
            }))
        }
        saveSpecialistProfile(currentUser.id, profileDataWithProjects)
        
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
        router.push('/specialists')
      }
    } catch (error: any) {
      console.error('Ошибка сохранения профиля:', error)
      alert(error?.message || 'Не удалось сохранить профиль. Попробуйте снова.')
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
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light text-primary-900 mb-2 tracking-tight">Настройки</h1>
        <p className="text-base sm:text-lg font-light text-primary-600">Управляйте информацией о себе</p>
      </div>

      {/* Tabs */}
      <div className="mb-8 border-b border-primary-200">
        <div className="flex gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('card')}
            className={`relative text-sm font-normal transition-colors tracking-tight pb-4 ${
              activeTab === 'card'
                ? 'text-[#FF4600]'
                : 'text-primary-400 hover:text-primary-600'
            }`}
          >
            Моя карточка
            {activeTab === 'card' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF4600]"></span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('portfolio')}
            className={`relative text-sm font-normal transition-colors tracking-tight pb-4 ${
              activeTab === 'portfolio'
                ? 'text-[#FF4600]'
                : 'text-primary-400 hover:text-primary-600'
            }`}
          >
            Портфолио
            {activeTab === 'portfolio' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF4600]"></span>
            )}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {activeTab === 'card' && (
          <div className="bg-white rounded-apple border border-primary-100 p-6 sm:p-8 lg:p-10 space-y-6">
            {/* Avatar */}
            <div>
              <label className="block text-sm font-light text-primary-700 mb-3">Фото профиля</label>
              <div className="flex items-center gap-6">
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-apple overflow-hidden border border-primary-200 bg-primary-50 flex-shrink-0">
                  {avatarPreview ? (
                    <Image
                      src={avatarPreview}
                      alt="Аватар"
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-primary-400 text-xl sm:text-2xl font-light">
                      {(formData.firstName?.[0] || '') + (formData.lastName?.[0] || '') || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <label className="inline-block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleAvatarUpload(file)
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
                      }}
                      className="ml-3 text-sm font-light text-primary-500 hover:text-primary-700"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-light text-primary-700 mb-2">
                  Имя <span className="text-primary-400">*</span>
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white text-sm"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-light text-primary-700 mb-2">
                  Фамилия <span className="text-primary-400">*</span>
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white text-sm"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="specialization" className="block text-sm font-light text-primary-700 mb-2">
                Специализация <span className="text-primary-400">*</span>
              </label>
              <select
                id="specialization"
                required
                className="w-full px-4 py-3 border border-primary-200 rounded-apple text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white text-sm"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value as Specialization })}
              >
                {specializations.map((spec) => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-light text-primary-700 mb-2">
                О себе
              </label>
              <textarea
                id="bio"
                rows={4}
                placeholder="Расскажите о себе, своем опыте и целях..."
                className="w-full px-4 py-3 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white text-sm resize-none"
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="telegram" className="block text-sm font-light text-primary-700 mb-2">
                Телеграм для связи <span className="text-primary-400">*</span>
              </label>
              <input
                id="telegram"
                type="text"
                required
                placeholder="@username"
                className="w-full px-4 py-3 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white text-sm"
                value={formData.telegram}
                onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-light text-primary-700 mb-2">
                Почта для связи
              </label>
              <input
                id="email"
                type="email"
                placeholder="example@mail.com"
                className="w-full px-4 py-3 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white text-sm"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="pt-4 border-t border-primary-100">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showInSearch !== false}
                  onChange={(e) => setFormData({ ...formData, showInSearch: e.target.checked })}
                  className="w-5 h-5 rounded border-primary-200 text-[#FF4600] focus:ring-1 focus:ring-[#FF4600] focus:ring-offset-0"
                />
                <span className="text-sm font-light text-primary-700">Показывать меня в поиске</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-primary-100">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 bg-primary-900 text-white px-6 py-3 rounded-apple hover:bg-primary-800 transition-colors font-normal tracking-tight text-sm"
              >
                <CheckIcon className="w-4 h-4" />
                Сохранить изменения
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="border border-primary-200 text-primary-700 px-6 py-3 rounded-apple hover:bg-primary-50 transition-colors font-normal tracking-tight text-sm"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-light text-primary-900 mb-1 tracking-tight">Портфолио</h2>
                <p className="text-sm font-light text-primary-600">Добавьте до 3 проектов с фотографиями</p>
              </div>
              {projects.length < 3 && (
                <button
                  type="button"
                  onClick={addProject}
                  className="inline-flex items-center gap-2 bg-primary-900 text-white px-4 py-2 rounded-apple hover:bg-primary-800 transition-colors font-normal text-sm"
                >
                  <PlusIcon className="w-4 h-4" />
                  Добавить проект
                </button>
              )}
            </div>
            {projects.length === 0 ? (
              <div className="bg-white rounded-apple border border-primary-100 p-12 text-center">
                <PhotoIcon className="w-12 h-12 text-primary-300 mx-auto mb-4" />
                <p className="text-base font-light text-primary-600 mb-1">Портфолио пусто</p>
                <p className="text-sm font-light text-primary-500 mb-6">Добавьте проекты, чтобы показать свои работы</p>
                <button
                  type="button"
                  onClick={addProject}
                  className="inline-flex items-center gap-2 bg-primary-900 text-white px-4 py-2 rounded-apple hover:bg-primary-800 transition-colors font-normal text-sm"
                >
                  <PlusIcon className="w-4 h-4" />
                  Добавить первый проект
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {projects.map((project, projectIndex) => (
                  <div key={project.id} className="bg-white rounded-apple border border-primary-100 p-6 space-y-6">
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-normal text-primary-900 tracking-tight">Проект {projectIndex + 1}</h3>
                      <button
                        type="button"
                        onClick={() => removeProject(project.id)}
                        className="p-2 hover:bg-primary-50 rounded-apple transition-colors"
                        aria-label="Удалить проект"
                      >
                        <TrashIcon className="w-5 h-5 text-primary-500" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-light text-primary-700 mb-2">
                        Название проекта
                      </label>
                      <input
                        type="text"
                        placeholder="Название проекта"
                        className="w-full px-4 py-3 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white text-sm"
                        value={project.title}
                        onChange={(e) => updateProject(project.id, 'title', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-light text-primary-700 mb-2">
                        Описание
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Краткое описание проекта"
                        className="w-full px-4 py-3 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white text-sm resize-none"
                        value={project.description}
                        onChange={(e) => updateProject(project.id, 'description', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-light text-primary-700 mb-3">
                        Фотографии {project.images.length > 0 && `(${project.images.length}/3)`}
                      </label>
                      
                      {project.images.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                          {project.images.map((image, imageIndex) => (
                            <div key={imageIndex} className="relative group">
                              <div className="relative w-full rounded-apple overflow-hidden border border-primary-200 bg-primary-50" style={{ aspectRatio: '4/3' }}>
                                <Image
                                  src={image.url}
                                  alt={`${project.title || 'Проект'} - фото ${imageIndex + 1}`}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 640px) 100vw, 33vw"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeImage(project.id, imageIndex)}
                                className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-apple opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Удалить фото"
                              >
                                <XMarkIcon className="w-4 h-4 text-primary-700" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {project.images.length < 3 && (
                        <label className="block w-full rounded-apple border-2 border-dashed border-primary-300 hover:border-primary-400 transition-colors cursor-pointer bg-primary-50 p-8 text-center">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handleImageUpload(project.id, e.target.files)}
                          />
                          <PhotoIcon className="w-8 h-8 text-primary-400 mx-auto mb-2" />
                          <span className="text-sm font-light text-primary-600 block">
                            {project.images.length === 0 ? 'Добавить фотографии' : `Добавить еще (до ${3 - project.images.length})`}
                          </span>
                          <span className="text-xs font-light text-primary-500 mt-1 block">Формат 4:3, до 3 фото</span>
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-primary-100">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 bg-primary-900 text-white px-6 py-3 rounded-apple hover:bg-primary-800 transition-colors font-normal tracking-tight text-sm"
              >
                <CheckIcon className="w-4 h-4" />
                Сохранить изменения
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="border border-primary-200 text-primary-700 px-6 py-3 rounded-apple hover:bg-primary-50 transition-colors font-normal tracking-tight text-sm"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}

