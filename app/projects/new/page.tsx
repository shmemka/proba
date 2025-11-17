'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { createProject, getCurrentUser, isSupabaseAvailable } from '@/lib/supabase'
import { getActiveUser } from '@/lib/storage'

interface ProjectData {
  title: string
  description: string
  fullDescription: string
  skills: string[]
  location: string
  deadline: string
  requirements: string[]
  deliverables: string[]
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
          const userType = user.user_metadata?.userType
          if (userType === 'company' || user.email) {
            setIsAuthorized(true)
          } else {
            router.push('/login?redirect=/projects/new')
          }
        } else {
          router.push('/login?redirect=/projects/new')
        }
      } else {
        const user = getActiveUser()
        if (user?.type === 'company' || user?.email) {
          setIsAuthorized(true)
        } else {
          router.push('/login?redirect=/projects/new')
        }
      }
    }
    checkAuth()
  }, [router])
  
  const [formData, setFormData] = useState<ProjectData>({
    title: '',
    description: '',
    fullDescription: '',
    skills: [],
    location: '',
    deadline: '',
    requirements: [],
    deliverables: [],
  })
  const [newSkill, setNewSkill] = useState('')
  const [newRequirement, setNewRequirement] = useState('')
  const [newDeliverable, setNewDeliverable] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Валидация
    if (!formData.title.trim() || !formData.description.trim() || !formData.fullDescription.trim()) {
      alert('Заполните обязательные поля: название, краткое и полное описание')
      return
    }
    
    if (formData.skills.length === 0) {
      alert('Добавьте хотя бы один навык')
      return
    }
    
    if (!formData.deadline || new Date(formData.deadline) < new Date()) {
      alert('Укажите корректную дату дедлайна (не в прошлом)')
      return
    }
    
    try {
      if (isSupabaseAvailable()) {
        // Используем Supabase
        const user = await getCurrentUser()
        if (!user) {
          router.push('/login?redirect=/projects/new')
          return
        }
        
        await createProject({
          company_id: user.id,
          title: formData.title,
          description: formData.description,
          full_description: formData.fullDescription,
          specialization: formData.skills[0] || 'Другое',
          skills: formData.skills,
          location: formData.location,
          deadline: formData.deadline,
          requirements: formData.requirements,
          deliverables: formData.deliverables,
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
          company: user?.name || 'Компания',
        }
        projects.push(newProject)
        localStorage.setItem('projects', JSON.stringify(projects))
        window.dispatchEvent(new Event('storage'))
        router.push('/projects')
      }
    } catch (error: any) {
      console.error('Ошибка создания проекта:', error)
      alert(error?.message || 'Не удалось создать проект. Попробуйте снова.')
    }
  }

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, newSkill.trim()] })
      setNewSkill('')
    }
  }

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) })
  }

  const addRequirement = () => {
    if (newRequirement.trim()) {
      setFormData({ ...formData, requirements: [...formData.requirements, newRequirement.trim()] })
      setNewRequirement('')
    }
  }

  const removeRequirement = (index: number) => {
    setFormData({ ...formData, requirements: formData.requirements.filter((_, i) => i !== index) })
  }

  const addDeliverable = () => {
    if (newDeliverable.trim()) {
      setFormData({ ...formData, deliverables: [...formData.deliverables, newDeliverable.trim()] })
      setNewDeliverable('')
    }
  }

  const removeDeliverable = (index: number) => {
    setFormData({ ...formData, deliverables: formData.deliverables.filter((_, i) => i !== index) })
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
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-primary-900 mb-6 sm:mb-8 tracking-tight">Разместить новый проект</h1>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-light text-primary-700 mb-2">
              Название проекта *
            </label>
            <input
              id="title"
              type="text"
              required
              placeholder="Например: Разработка лендинга для стартапа"
              className="w-full px-4 sm:px-5 py-3 sm:py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white text-sm sm:text-base"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-light text-primary-700 mb-2">
              Краткое описание *
            </label>
            <input
              id="description"
              type="text"
              required
              placeholder="Краткое описание для списка проектов"
              className="w-full px-4 sm:px-5 py-3 sm:py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white text-sm sm:text-base"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="fullDescription" className="block text-sm font-light text-primary-700 mb-2">
              Полное описание проекта *
            </label>
            <textarea
              id="fullDescription"
              rows={6}
              required
              placeholder="Подробно опишите проект, что нужно сделать, какие задачи решить..."
              className="w-full px-4 sm:px-5 py-3 sm:py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white text-sm sm:text-base"
              value={formData.fullDescription}
              onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-light text-primary-700 mb-2">
              Требуемые навыки *
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Добавить навык"
                className="flex-1 px-4 sm:px-5 py-3 sm:py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white text-sm sm:text-base"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-4 sm:px-5 py-3 sm:py-4 bg-primary-900 text-white rounded-apple hover:bg-primary-800 transition-colors flex-shrink-0"
              >
                <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-apple text-xs font-light"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="hover:text-primary-900"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="location" className="block text-sm font-light text-primary-700 mb-2">
                Локация *
              </label>
              <input
                id="location"
                type="text"
                required
                placeholder="Москва, Санкт-Петербург, Удаленно..."
                className="w-full px-4 sm:px-5 py-3 sm:py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white text-sm sm:text-base"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
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
          </div>

          <div>
            <label className="block text-sm font-light text-primary-700 mb-2">
              Требования к исполнителю
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Добавить требование"
                className="flex-1 px-4 sm:px-5 py-3 sm:py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white text-sm sm:text-base"
                value={newRequirement}
                onChange={(e) => setNewRequirement(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRequirement())}
              />
              <button
                type="button"
                onClick={addRequirement}
                className="px-4 sm:px-5 py-3 sm:py-4 bg-primary-900 text-white rounded-apple hover:bg-primary-800 transition-colors flex-shrink-0"
              >
                <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            <ul className="space-y-2 text-primary-700 font-light">
              {formData.requirements.map((req, index) => (
                <li key={index} className="flex items-center justify-between px-3 py-2 bg-primary-50 rounded-apple">
                  <span>{req}</span>
                  <button
                    type="button"
                    onClick={() => removeRequirement(index)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="block text-sm font-light text-primary-700 mb-2">
              Ожидаемый результат работы
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Добавить результат"
                className="flex-1 px-4 sm:px-5 py-3 sm:py-4 border border-primary-200 rounded-apple placeholder-primary-400 text-primary-900 focus:outline-none focus:ring-1 focus:ring-primary-900 focus:border-primary-900 font-light bg-white text-sm sm:text-base"
                value={newDeliverable}
                onChange={(e) => setNewDeliverable(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDeliverable())}
              />
              <button
                type="button"
                onClick={addDeliverable}
                className="px-4 sm:px-5 py-3 sm:py-4 bg-primary-900 text-white rounded-apple hover:bg-primary-800 transition-colors flex-shrink-0"
              >
                <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            <ul className="space-y-2 text-primary-700 font-light">
              {formData.deliverables.map((deliverable, index) => (
                <li key={index} className="flex items-center justify-between px-3 py-2 bg-primary-50 rounded-apple">
                  <span>{deliverable}</span>
                  <button
                    type="button"
                    onClick={() => removeDeliverable(index)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
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
              Разместить проект
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

