import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'
import type { Database } from './supabaseClient'

type Specialist = Database['public']['Tables']['specialists']['Row']
type Company = Database['public']['Tables']['companies']['Row']
type Project = Database['public']['Tables']['projects']['Row']
type Application = Database['public']['Tables']['applications']['Row']

// ============================================
// Аутентификация
// ============================================

export async function signUp(email: string, password: string, userType: 'specialist' | 'company', displayName: string) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        userType,
        displayName,
      },
    },
  })

  if (error) throw error
  if (!data.user) throw new Error('Не удалось создать пользователя')

  // Создаем профиль в соответствующей таблице
  if (userType === 'specialist') {
    const nameParts = displayName.split(' ')
    await supabase.from('specialists').insert({
      id: data.user.id,
      email: email.toLowerCase(),
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      specialization: 'Дизайн',
      bio: '',
      telegram: '',
    })
  } else {
    await supabase.from('companies').insert({
      id: data.user.id,
      email: email.toLowerCase(),
      company_name: displayName,
    })
  }

  return data
}

export async function signIn(email: string, password: string) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function signOut() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return
  }

  await supabase.auth.signOut()
}

export async function getCurrentUser() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return null
  }

  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getCurrentSession() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return null
  }

  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ============================================
// Специалисты
// ============================================

export async function getSpecialists() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('specialists')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Ошибка загрузки специалистов:', error)
    return []
  }

  return data || []
}

export async function getSpecialist(id: string) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('specialists')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Ошибка загрузки специалиста:', error)
    return null
  }

  return data
}

export async function updateSpecialist(id: string, updates: Partial<Specialist>) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { data, error } = await supabase
    .from('specialists')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================
// Компании
// ============================================

export async function getCompany(id: string) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Ошибка загрузки компании:', error)
    return null
  }

  return data
}

export async function updateCompany(id: string, updates: Partial<Company>) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { data, error } = await supabase
    .from('companies')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================
// Проекты
// ============================================

export async function getProjects() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      companies(company_name)
    `)
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Ошибка загрузки проектов:', error)
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  // Оптимизация: получаем все заявки одним запросом вместо N+1
  const projectIds = data.map(p => p.id)
  const { data: applicationsData } = await supabase
    .from('applications')
    .select('project_id')
    .in('project_id', projectIds)

  // Подсчитываем заявки для каждого проекта
  const applicationsCountMap = new Map<string, number>()
  if (applicationsData) {
    applicationsData.forEach(app => {
      const count = applicationsCountMap.get(app.project_id) || 0
      applicationsCountMap.set(app.project_id, count + 1)
    })
  }

  // Формируем результат
  const projectsWithApplications = data.map((project) => ({
    ...project,
    applicationsCount: applicationsCountMap.get(project.id) || 0,
    company: (project.companies as any)?.company_name || 'Компания',
  }))

  return projectsWithApplications
}

export async function getProject(id: string) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      companies(company_name)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Ошибка загрузки проекта:', error)
    return null
  }

  if (!data) return null

  // Получаем количество заявок
  const { count } = await supabase
    .from('applications')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', id)

  return {
    ...data,
    applicationsCount: count || 0,
    company: (data.companies as any)?.company_name || 'Компания',
  }
}

export async function createProject(project: {
  company_id: string
  title: string
  description: string
  full_description?: string
  specialization: string
  skills?: string[]
  location?: string
  deadline?: string
  budget?: string
  timeline?: string
  requirements?: string[]
  deliverables?: string[]
}) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  // Проверяем, существует ли запись компании, если нет - создаем
  const { data: existingCompany, error: companyCheckError } = await supabase
    .from('companies')
    .select('id')
    .eq('id', project.company_id)
    .single()

  if (companyCheckError && companyCheckError.code !== 'PGRST116') {
    // PGRST116 - это "not found", другие ошибки - реальные проблемы
    throw companyCheckError
  }

  if (!existingCompany) {
    // Компания не существует, создаем запись
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Пользователь не найден')
    }

    const { error: createCompanyError } = await supabase
      .from('companies')
      .insert({
        id: project.company_id,
        email: user.email || '',
        company_name: user.user_metadata?.displayName || 'Компания',
      })

    if (createCompanyError) {
      throw new Error(`Не удалось создать запись компании: ${createCompanyError.message}`)
    }
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      ...project,
      budget: project.budget || '',
      timeline: project.timeline || '',
      full_description: project.full_description || '',
      location: project.location || '',
      skills: project.skills || [],
      requirements: project.requirements || [],
      deliverables: project.deliverables || [],
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateProject(id: string, updates: Partial<Project>) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================
// Заявки
// ============================================

export async function getApplications(projectId?: string, specialistId?: string) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return []
  }

  let query = supabase.from('applications').select('*')

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  if (specialistId) {
    query = query.eq('specialist_id', specialistId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Ошибка загрузки заявок:', error)
    return []
  }

  return data || []
}

export async function createApplication(application: {
  project_id: string
  specialist_id: string
  message: string
}) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { data, error } = await supabase
    .from('applications')
    .insert(application)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateApplication(id: string, updates: Partial<Application>) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const { data, error } = await supabase
    .from('applications')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================
// Вспомогательные функции
// ============================================

export function isSupabaseAvailable() {
  return isSupabaseConfigured
}

