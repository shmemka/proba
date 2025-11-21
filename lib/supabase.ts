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

export const deriveDisplayName = (
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

type EnsureSpecialistProfileParams = {
  id: string
  email: string
  displayName?: string
  avatarUrl?: string
}

export const ensureSpecialistProfile = async ({
  id,
  email,
  displayName,
  avatarUrl,
}: EnsureSpecialistProfileParams) => {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return
  }

  const normalizedEmail = normalizeEmail(email)

  const { data: existing, error: lookupError } = await supabase
    .from('specialists')
    .select('id, avatar_url')
    .eq('id', id)
    .limit(1)

  if (lookupError) {
    throw lookupError
  }

  // Если профиль существует, обновляем аватарку, если её нет, но есть новая
  if (existing && existing.length > 0) {
    const currentProfile = existing[0]
    // Обновляем аватарку, если её нет в профиле, но есть в параметрах
    if (avatarUrl && !currentProfile.avatar_url) {
      const { error: updateError } = await supabase
        .from('specialists')
        .update({ avatar_url: avatarUrl })
        .eq('id', id)

      if (updateError) {
        console.debug('Не удалось обновить аватарку в профиле:', updateError)
      } else {
        invalidateCache(`specialist:${id}`)
      }
    }
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
    show_in_search: false, // По умолчанию карточка не публикуется
    avatar_url: avatarUrl || null,
  })

  if (insertError) {
    throw insertError
  }

  invalidateCache('specialists')
  invalidateCache(`specialist:${id}`)
}

type Specialist = Database['public']['Tables']['specialists']['Row']
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
  const safeDisplayName = deriveDisplayName(normalizedEmail, 'specialist', displayName)

  try {
    // Инвалидируем кеш перед регистрацией
    invalidateCache('auth:')

    // Получаем базовый URL для redirect
    let baseUrl = ''
    if (typeof window !== 'undefined') {
      baseUrl = window.location.origin
    } else if (process.env.NEXT_PUBLIC_SITE_URL) {
      baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    } else if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`
    }
    
    if (!baseUrl) {
      throw new Error('Не удалось определить базовый URL. Установите NEXT_PUBLIC_SITE_URL в переменных окружения.')
    }
    
    // Убеждаемся, что baseUrl не заканчивается на /
    baseUrl = baseUrl.replace(/\/$/, '')
    const emailRedirectTo = `${baseUrl}/auth/confirm`

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo,
        data: {
          userType: 'specialist',
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

    // Инвалидируем кеш после успешной регистрации
    invalidateCache('auth:')

    // Создаем профиль специалиста (опционально, можно создать позже в настройках)
    try {
      await ensureSpecialistProfile({
        id: user.id,
        email: user.email || normalizedEmail,
        displayName: safeDisplayName,
      })
    } catch (profileError) {
      // Не критично, профиль можно создать позже
      console.debug('Не удалось создать профиль специалиста при регистрации:', profileError)
    }

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
    // Инвалидируем кеш перед входом
    invalidateCache('auth:')

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (error) {
      throw error
    }

    const user = data.user
    if (user) {
      // Инвалидируем кеш после успешного входа
      invalidateCache('auth:')

      const safeDisplayName = deriveDisplayName(
        user.email || normalizedEmail,
        'specialist',
        user.user_metadata?.displayName,
      )

      // Создаем профиль специалиста (опционально, можно создать позже в настройках)
      try {
        await ensureSpecialistProfile({
          id: user.id,
          email: user.email || normalizedEmail,
          displayName: safeDisplayName,
        })
      } catch (profileError) {
        // Не критично, профиль можно создать позже
        console.debug('Не удалось создать профиль специалиста при входе:', profileError)
      }
    }

    return data
  } catch (error) {
    throw new Error(mapSupabaseError(error, 'Не удалось выполнить вход'))
  }
}

export async function signInWithGoogle(redirectTo?: string) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    throw new Error('Supabase не настроен')
  }

  try {
    // Получаем текущий URL для редиректа после OAuth
    let baseUrl = ''
    
    if (typeof window !== 'undefined') {
      // Используем текущий домен из браузера
      baseUrl = window.location.origin
    } else if (process.env.NEXT_PUBLIC_SITE_URL) {
      // Используем переменную окружения, если задана
      baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    } else {
      // Fallback: используем Vercel URL из переменных окружения
      // Это будет работать для всех доменов, подключенных к Vercel
      baseUrl = process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}`
        : ''
    }
    
    // Если baseUrl все еще пустой, это ошибка конфигурации
    if (!baseUrl) {
      throw new Error('Не удалось определить базовый URL. Установите NEXT_PUBLIC_SITE_URL в переменных окружения.')
    }
    
    // Убеждаемся, что baseUrl не заканчивается на /
    baseUrl = baseUrl.replace(/\/$/, '')
    
    const emailRedirectTo = redirectTo || `${baseUrl}/auth/callback`

    // Логирование для отладки (можно убрать после исправления)
    if (typeof window !== 'undefined') {
      console.log('OAuth redirect URL:', emailRedirectTo)
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: emailRedirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      console.error('OAuth error:', error)
      throw error
    }

    return data
  } catch (error) {
    throw new Error(mapSupabaseError(error, 'Не удалось выполнить вход через Google'))
  }
}

export async function signOut() {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return
  }

  // Инвалидируем кеш до выхода, чтобы гарантировать очистку
  invalidateCache('auth:')
  
  // Выполняем выход из Supabase
  await supabase.auth.signOut()
  
  // Дополнительная инвалидация после выхода
  invalidateCache('auth:')
  
  // Устанавливаем флаг в sessionStorage, чтобы главная страница не редиректила
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('just_logged_out', 'true')
    // Удалим флаг через 2 секунды
    setTimeout(() => {
      sessionStorage.removeItem('just_logged_out')
    }, 2000)
  }
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
      // Используем getSession вместо getUser для более надежной проверки сессии
      const {
        data: { session },
      } = await supabase.auth.getSession()
      
      if (!session?.user) {
        return null
      }

      // Проверяем, что сессия не истекла
      if (session.expires_at && session.expires_at * 1000 < Date.now()) {
        return null
      }

      return session.user
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
      // Сначала пытаемся загрузить с portfolio_preview
      let query = supabase
        .from('specialists')
        .select('*')
        .order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        // Если ошибка связана с отсутствием колонки, пробуем без неё
        if (error.message?.includes('portfolio_preview') || error.code === '42703') {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('specialists')
            .select(
              'id, email, first_name, last_name, specialization, bio, telegram, avatar_url, show_in_search, portfolio',
            )
            .order('created_at', { ascending: false })

          if (fallbackError) {
            console.error('Ошибка загрузки специалистов:', fallbackError)
            throw fallbackError
          }

          // Добавляем пустой portfolio_preview для совместимости
          // Пытаемся извлечь URL из portfolio JSONB если есть
          return (fallbackData || []).map((item: any) => {
            let preview: string[] = []
            
            // Пытаемся извлечь URL из portfolio если он есть
            if (item.portfolio && Array.isArray(item.portfolio)) {
              preview = item.portfolio
                .flatMap((project: any) => {
                  if (!project.images || !Array.isArray(project.images)) return []
                  return project.images.map((img: any) => {
                    const url = typeof img === 'string' ? img : img?.url
                    return url
                  }).filter((url: any): url is string => {
                    if (typeof url !== 'string' || !url.trim()) return false
                    const trimmed = url.trim()
                    return (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) && !trimmed.startsWith('data:')
                  })
                })
                .slice(0, 5)
            }
            
            return {
              ...item,
              portfolio_preview: preview,
            }
          })
        }

        console.error('Ошибка загрузки специалистов:', error)
        throw error
      }

      // Добавляем portfolio_preview если его нет (для старых записей)
      // Фильтруем валидные URL (исключаем data URLs)
      return (data || []).map((item: any) => {
        const preview = Array.isArray(item.portfolio_preview) 
          ? item.portfolio_preview.filter((url: any) => {
              if (typeof url !== 'string' || !url.trim()) return false
              const trimmed = url.trim()
              return (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) && !trimmed.startsWith('data:')
            })
          : []
        
        return {
          ...item,
          portfolio_preview: preview,
        }
      })
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

  // Создаем копию updates без portfolio_preview на случай, если колонка не существует
  const safeUpdates = { ...updates }
  
  const { data, error } = await supabase
    .from('specialists')
    .update(safeUpdates)
    .eq('id', id)
    .select()
    .single()

  // Если ошибка из-за отсутствия portfolio_preview, пробуем без него
  if (error && (error.message?.includes('portfolio_preview') || error.code === '42703')) {
    const { portfolio_preview, ...updatesWithoutPreview } = safeUpdates as any
    
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('specialists')
      .update(updatesWithoutPreview)
      .eq('id', id)
      .select()
      .single()

    if (fallbackError) throw fallbackError
    
    invalidateCache('specialists')
    invalidateCache(`specialist:${id}`)
    return fallbackData
  }

  if (error) throw error
  invalidateCache('specialists')
  invalidateCache(`specialist:${id}`)
  return data
}

// ============================================
// Компании - удалено, больше не используется
// ============================================

// ============================================
// Проекты
// ============================================

export async function getProjects(options?: { force?: boolean; userId?: string; specialistId?: string }) {
  const supabase = getSupabaseClient()
  if (!supabase) {
    return []
  }

  const cacheKey = `projects${options?.userId ? `:user:${options.userId}` : ''}${options?.specialistId ? `:specialist:${options.specialistId}` : ''}`

  return fetchWithCache(
    cacheKey,
    async () => {
      let query = supabase
        .from('projects')
        .select('*')

      // Если указан userId, показываем все задачи пользователя (включая закрытые)
      if (options?.userId) {
        query = query.eq('user_id', options.userId)
      } else if (options?.specialistId) {
        // Если указан specialistId, показываем задачи, на которые специалист подал заявку
        const { data: applicationsData } = await supabase
          .from('applications')
          .select('project_id')
          .eq('specialist_id', options.specialistId)
        
        if (applicationsData && applicationsData.length > 0) {
          const projectIds = applicationsData.map(a => a.project_id)
          query = query.in('id', projectIds)
        } else {
          // Если нет заявок, возвращаем пустой массив
          return []
        }
      } else {
        // По умолчанию показываем только открытые задачи
        query = query.eq('status', 'open')
      }

      query = query.order('created_at', { ascending: false })

      const { data, error } = await query

      if (error) {
        console.error('Ошибка загрузки задач:', error)
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
        console.error('Ошибка загрузки заявок для задач:', applicationsError)
        // Не блокируем загрузку задач, просто вернём их без счётчиков
        return data.map((project) => ({
          ...project,
          applicationsCount: 0,
        }))
      }

      // Подсчитываем заявки для каждой задачи
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
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Ошибка загрузки задачи:', error)
        throw error
      }

      if (!data) return null

      // Получаем количество заявок
      const { count, error: applicationsError } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', id)

      if (applicationsError) {
        console.error('Ошибка загрузки количества заявок для задачи:', applicationsError)
      }

      return {
        ...data,
        applicationsCount: count || 0,
        user_id: data.user_id,
      }
    },
    30_000,
    options?.force,
  )
}

export async function createProject(project: {
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

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: currentUser.id,
      title: project.title,
      description: project.description,
      full_description: project.full_description || project.description,
      specialization: project.specialization || 'Другое',
      skills: project.skills || [],
      location: project.location || '',
      deadline: project.deadline || null,
      budget: project.budget || '',
      timeline: project.timeline || '',
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

  // Если запрашиваются отклики на задачу, проверяем, что пользователь является владельцем
  if (projectId) {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      // Если пользователь не авторизован, не возвращаем отклики на задачи
      return []
    }

    // Проверяем, является ли пользователь владельцем задачи
    const project = await getProject(projectId)
    if (!project || project.user_id !== currentUser.id) {
      // Пользователь не является владельцем задачи - не возвращаем отклики
      console.warn('Попытка просмотра откликов на чужую задачу')
      return []
    }
  }

  let query = supabase
    .from('applications')
    .select(`
      *,
      specialists(id, first_name, last_name, email, telegram, avatar_url, specialization, bio),
      projects(id, title)
    `)

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
  // Инвалидируем кэш для всех вариантов проектов
  invalidateCache('projects:company:')
  invalidateCache('projects:specialist:')
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

