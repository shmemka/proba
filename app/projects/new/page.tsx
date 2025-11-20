'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { createProject, getCurrentUser, isSupabaseAvailable } from '@/lib/supabase'
import { getActiveUser } from '@/lib/storage'

type Specialization = 'Дизайн' | 'SMM' | 'Веб-разработка' | 'Другое'

interface ProjectData {
  title: string
  description: string
  deadline: string
  specialization: Specialization
}

export default function NewProjectPage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  
  useEffect(() => {
    // Проверяем авторизацию
    const checkAuth = async () => {
      if (isSupabaseAvailable()) {
        const user = await getCurrentUser()
        if (user) {
          setIsAuthorized(true)
        } else {
          router.push('/auth?redirect=/projects/new')
        }
      } else {
        const user = getActiveUser()
        if (user?.email) {
          setIsAuthorized(true)
        } else {
          router.push('/auth?redirect=/projects/new')
        }
      }
    }
    checkAuth()
  }, [router])
  
  const [formData, setFormData] = useState<ProjectData>({
    title: '',
    description: '',
    deadline: '',
    specialization: 'Другое',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Валидация
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Заполните обязательные поля: название и описание')
      return
    }
    
    if (!formData.deadline || new Date(formData.deadline) < new Date()) {
      alert('Укажите корректную дату срока выполнения (не в прошлом)')
      return
    }
    
    try {
      if (isSupabaseAvailable()) {
        // Используем Supabase
        const user = await getCurrentUser()
        if (!user) {
          router.push('/auth?redirect=/projects/new')
          return
        }
        
        await createProject({
          title: formData.title.trim(),
          description: formData.description.trim(),
          full_description: formData.description.trim(),
          specialization: formData.specialization,
          skills: [],
          location: '',
          deadline: formData.deadline,
          requirements: [],
          deliverables: [],
        })
        
        router.push('/projects')
      } else {
        // Fallback на localStorage
        const user = getActiveUser()
        const projects = JSON.parse(localStorage.getItem('projects') || '[]')
        const newProject = {
          ...formData,
          id: Date.now().toString(),
          status: 'open' as const,
          applicationsCount: 0,
          user: user?.name || 'Пользователь',
        }
        projects.push(newProject)
        localStorage.setItem('projects', JSON.stringify(projects))
        window.dispatchEvent(new Event('storage'))
        router.push('/projects')
      }
    } catch (error: any) {
      console.error('Ошибка создания задачи:', error)
      alert(error?.message || 'Не удалось создать задачу. Попробуйте снова.')
    }
  }

  if (!isAuthorized) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center text-primary-600 font-light">Проверка авторизации...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 pt-16 sm:pt-20 lg:pt-16">
      <div className="bg-white rounded-apple border border-primary-100 p-4 sm:p-6 lg:p-10">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-primary-900 mb-6 sm:mb-8 tracking-tight">Создать новую задачу</h1>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-light text-primary-700 mb-2">
              Название *
            </label>
            <input
              id="title"
              type="text"
              required
              placeholder="Название задачи"
              className="w-full px-4 sm:px-5 py-3 sm:py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white text-sm sm:text-base"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-light text-primary-700 mb-2">
              Описание *
            </label>
            <textarea
              id="description"
              rows={8}
              required
              placeholder="Подробно опишите задачу, что нужно сделать, какие требования..."
              className="w-full px-4 sm:px-5 py-3 sm:py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white text-sm sm:text-base"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="specialization" className="block text-sm font-light text-primary-700 mb-2">
              Направление *
            </label>
            <select
              id="specialization"
              required
              className="w-full px-4 sm:px-5 py-3 sm:py-4 border border-primary-200 rounded-apple text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white text-sm sm:text-base"
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value as Specialization })}
            >
              <option value="Дизайн">Дизайн</option>
              <option value="SMM">SMM</option>
              <option value="Веб-разработка">Веб-разработка</option>
              <option value="Другое">Другое</option>
            </select>
          </div>

          <div>
            <label htmlFor="deadline" className="block text-sm font-light text-primary-700 mb-2">
              Срок выполнения *
            </label>
            <input
              id="deadline"
              type="date"
              required
              className="w-full px-5 py-4 border border-primary-200 rounded-apple text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            />
          </div>

          <div className="bg-primary-50 border border-primary-200 rounded-apple p-5">
            <p className="text-sm text-primary-700 font-light leading-relaxed">
              <span className="font-normal">Важно:</span> Помните, что на этой платформе специалисты работают бесплатно ради опыта. 
              Взамен вы должны предоставить рекомендацию, возможность использовать проект в портфолио и честную обратную связь.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-primary-100">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 bg-primary-900 text-white px-6 py-3 sm:py-4 rounded-apple hover:bg-primary-800 transition-colors font-normal tracking-tight"
            >
              <CheckIcon className="w-5 h-5" />
              Создать задачу
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="border border-primary-200 text-primary-700 px-6 py-3 sm:py-4 rounded-apple hover:bg-primary-50 transition-colors font-normal tracking-tight"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
