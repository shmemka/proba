import type { AuthError, PostgrestError } from '@supabase/supabase-js'
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient'
import { fetchWithCache, invalidateCache } from './cache'
import type { Database } from './supabaseClient'

const DEFAULT_SPECIALIZATION = 'Дизайн'
const FALLBACK_DISPLAY_NAMES = {
  specialist: 'Специалист',
  company: 'Компания',
} as const

const normalizeEmail = (value: string) => value.trim().toLowerCase()

const cleanupWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

const splitDisplayName = (displayName: string) => {
  if (!displayName) {
    return { firstName: '', lastName: '' }
  }
  const normalized = cleanupWhitespace(displayName)
  if (!normalized) {
    return { firstName: '', lastName: '' }
  }
  const [firstName, ...rest] = normalized.split(' ')
  return {
    firstName: firstName || '',
    lastName: rest.join(' '),
  }
}

const deriveDisplayName = (
  email: string,
  userType: 'specialist' | 'company',
  provided?: string,
) => {
  const trimmedProvided = provided ? cleanupWhitespace(provided) : ''
  if (trimmedProvided) {
    return trimmedProvided
  }

  const [emailNamePart] = normalizeEmail(email).split('@')
  if (userType === 'company') {
    return emailNamePart ? `Компания ${emailNamePart}` : FALLBACK_DISPLAY_NAMES.company
  }
  return emailNamePart || FALLBACK_DISPLAY_NAMES.specialist
}

const mapSupabaseError = (error: unknown, fallback: string) => {
  if (!error) {
    return fallback
  }

  if (typeof error === 'string') {
    return error
  }

  const typedError = error as Partial<AuthError & PostgrestError & Error> & {
    status?: number
  }

  const rawMessage = typedError.message || fallback
  const normalizedMessage = rawMessage.toLowerCase()
  const code = typedError.code
  const status = typedError.status

  if (normalizedMessage.includes('already registered')) {
    return 'Пользователь с таким email уже зарегистрирован'
  }

  if (normalizedMessage.includes('invalid login credentials')) {
    return 'Неверный email или пароль'
  }

  if (
    normalizedMessage.includes('email not confirmed') ||
    normalizedMessage.includes('confirm your email')
  ) {
    return 'Подтвердите email, чтобы завершить регистрацию'
  }

  if (normalizedMessage.includes('password')) {
    return 'Пароль должен быть не короче 6 символов'
  }

  if (status === 429 || normalizedMessage.includes('too many requests')) {
    return 'Слишком много попыток. Попробуйте снова через минуту.'
  }

  if (code === '23505') {
    return 'Такие данные уже используются. Попробуйте другой email.'
  }

  if (code === '42501' || normalizedMessage.includes('row-level security')) {
    return 'Недостаточно прав для выполнения операции. Войдите заново и попробуйте ещё раз.'
  }

  return rawMessage || fallback
}

type EnsureProfileParams = {
  id: string
  userType: 'specialist' | 'company'
  email: string
  displayName?: string
}

const ensureProfileRecord = async ({
  id,
  userType,
  email,
  displayName,
}: EnsureProfileParams) => {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return
  }

  const normalizedEmail = normalizeEmail(email)

  if (userType === 'specialist') {
    const { data: existing, error: lookupError } = await supabase
      .from('specialists')
      .select('id')
      .eq('id', id)
      .limit(1)

    if (lookupError) {
      throw lookupError
    }

    if (existing && existing.length > 0) {
      return
    }

    const safeDisplayName = deriveDisplayName(normalizedEmail, 'specialist', displayName)
    const { firstName, lastName } = splitDisplayName(safeDisplayName)

    const { error: insertError } = await supabase.from('specialists').insert({
      id,
      email: normalizedEmail,
      first_name: firstName || safeDisplayName,
      last_name: lastName || '',
      specialization: DEFAULT_SPECIALIZATION,
    })

    if (insertError) {
      throw insertError
    }

    invalidateCache('specialists')
    invalidateCache(`specialist:${id}`)
    return
  }

  const { data: existingCompanies, error: companyLookupError } = await supabase
    .from('companies')
    .select('id')
    .eq('id', id)
    .limit(1)

  if (companyLookupError) {
    throw companyLookupError
  }

  if (existingCompanies && existingCompanies.length > 0) {
    return
  }

  const safeCompanyName = deriveDisplayName(normalizedEmail, 'company', displayName)

  const { error: insertCompanyError } = await supabase.from('companies').insert({
    id,
    email: normalizedEmail,
    company_name: safeCompanyName,
  })

  if (insertCompanyError) {
    throw insertCompanyError
  }
}

type Specialist = Database['public']['Tables']['specialists']['Row']
type Company = Database['public']['Tables']['companies']['Row']
type Project = Database['public']['Tables']['projects']['Row']
type Application = Database['public']['Tables']['applications']['Row']

// ============================================
// Аутентификация
// ============================================

export async function signUp(
  email: string,
  password: string,
  userType: 'specialist' | 'company',
  displayName: string,
) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const normalizedEmail = normalizeEmail(email)
  const safeDisplayName = deriveDisplayName(normalizedEmail, userType, displayName)

  try {
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          userType,
          displayName: safeDisplayName,
        },
      },
    })

    if (error) {
      throw error
    }

    const user = data.user
    if (!user) {
      throw new Error('Не удалось создать пользователя')
    }

    await ensureProfileRecord({
      id: user.id,
      userType,
      email: user.email || normalizedEmail,
      displayName: safeDisplayName,
    })

    return data
  } catch (error) {
    throw new Error(mapSupabaseError(error, 'Не удалось создать аккаунт'))
  }
}

export async function signIn(email: string, password: string) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  const normalizedEmail = normalizeEmail(email)

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (error) {
      throw error
    }

    const user = data.user
    if (user) {
      const userType = user.user_metadata?.userType === 'company' ? 'company' : 'specialist'
      const safeDisplayName = deriveDisplayName(
        user.email || normalizedEmail,
        userType,
        user.user_metadata?.displayName,
      )

      await ensureProfileRecord({
        id: user.id,
        userType,
        email: user.email || normalizedEmail,
        displayName: safeDisplayName,
      })
    }

    return data
  } catch (error) {
    throw new Error(mapSupabaseError(error, 'Не удалось выполнить вход'))
  }
}

export async function signOut() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return
  }

  await supabase.auth.signOut()
  invalidateCache('auth:')
}

const AUTH_USER_CACHE_KEY = 'auth:user'
const AUTH_SESSION_CACHE_KEY = 'auth:session'

export async function getCurrentUser(options?: { force?: boolean }) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return null
  }

  return fetchWithCache(
    AUTH_USER_CACHE_KEY,
    async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      return user ?? null
    },
    5_000,
    options?.force,
  )
}

export async function getCurrentSession(options?: { force?: boolean }) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return null
  }

  return fetchWithCache(
    AUTH_SESSION_CACHE_KEY,
    async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      return session ?? null
    },
    5_000,
    options?.force,
  )
}

// ============================================
// Специалисты
// ============================================

export async function getSpecialists(options?: { force?: boolean }) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return []
  }

  return fetchWithCache(
    'specialists',
    async () => {
      const { data, error } = await supabase
        .from('specialists')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Ошибка загрузки специалистов:', error)
        throw error
      }

      return data || []
    },
    60_000,
    options?.force,
  )
}

export async function getSpecialist(id: string, options?: { force?: boolean }) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return null
  }

  return fetchWithCache(
    `specialist:${id}`,
    async () => {
      const { data, error } = await supabase
        .from('specialists')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Ошибка загрузки специалиста:', error)
        throw error
      }

      return data
    },
    60_000,
    options?.force,
  )
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
  invalidateCache('specialists')
  invalidateCache(`specialist:${id}`)
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
    throw error
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

export async function getProjects(options?: { force?: boolean }) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return []
  }

  return fetchWithCache(
    'projects',
    async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(
          `
      *,
      companies(company_name)
    `,
        )
        .eq('status', 'open')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Ошибка загрузки проектов:', error)
        throw error
      }

      if (!data || data.length === 0) {
        return []
      }

      // Оптимизация: получаем все заявки одним запросом вместо N+1
      const projectIds = data.map((p) => p.id)
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('applications')
        .select('project_id')
        .in('project_id', projectIds)

      if (applicationsError) {
        console.error('Ошибка загрузки заявок для проектов:', applicationsError)
        // Не блокируем загрузку проектов, просто вернём их без счётчиков
        return data.map((project) => ({
          ...project,
          applicationsCount: 0,
          company: (project.companies as any)?.company_name || 'Компания',
        }))
      }

      // Подсчитываем заявки для каждого проекта
      const applicationsCountMap = new Map<string, number>()
      if (applicationsData) {
        applicationsData.forEach((app) => {
          const count = applicationsCountMap.get(app.project_id) || 0
          applicationsCountMap.set(app.project_id, count + 1)
        })
      }

      // Формируем результат
      return data.map((project) => ({
        ...project,
        applicationsCount: applicationsCountMap.get(project.id) || 0,
        company: (project.companies as any)?.company_name || 'Компания',
      }))
    },
    30_000,
    options?.force,
  )
}

export async function getProject(id: string, options?: { force?: boolean }) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return null
  }

  return fetchWithCache(
    `project:${id}`,
    async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(
          `
      *,
      companies(company_name)
    `,
        )
        .eq('id', id)
        .single()

      if (error) {
        console.error('Ошибка загрузки проекта:', error)
        throw error
      }

      if (!data) return null

      // Получаем количество заявок
      const { count, error: applicationsError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', id)

      if (applicationsError) {
        console.error('Ошибка загрузки количества заявок для проекта:', applicationsError)
      }

      return {
        ...data,
        applicationsCount: count || 0,
        company: (data.companies as any)?.company_name || 'Компания',
      }
    },
    30_000,
    options?.force,
  )
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

  const currentUser = await getCurrentUser()
  if (!currentUser) {
      throw new Error('Пользователь не найден')
    }

  if (!currentUser.email) {
    throw new Error('У аккаунта компании отсутствует email')
  }

  await ensureProfileRecord({
        id: project.company_id,
    userType: 'company',
    email: currentUser.email,
    displayName: currentUser.user_metadata?.displayName,
      })

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
  invalidateCache('projects')
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
  invalidateCache('projects')
  invalidateCache(`project:${id}`)
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
    throw error
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
  invalidateCache('projects')
  invalidateCache(`project:${application.project_id}`)
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
  invalidateCache('projects')
  return data
}

export async function hasApplication(projectId: string, specialistId: string) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return false
  }

  const { count, error } = await supabase
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('specialist_id', specialistId)

  if (error) {
    console.error('Ошибка проверки заявки:', error)
    return false
  }

  return (count || 0) > 0
}

// ============================================
// Вспомогательные функции
// ============================================

export function isSupabaseAvailable() {
  return isSupabaseConfigured
}

