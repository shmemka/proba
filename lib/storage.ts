export type UserType = 'specialist' | 'company'

export interface StoredUser {
  id: string
  email: string
  name: string
  password: string
  type: UserType
  companyName?: string
}

const STORAGE_KEYS = {
  users: 'users',
  activeUser: 'user',
  legacySpecialistProfile: 'specialistProfile',
  specialistProfilePrefix: 'specialistProfile:',
} as const

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) {
    return fallback
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export const readJson = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') {
    return fallback
  }

  return safeParse<T>(window.localStorage.getItem(key), fallback)
}

export const writeJson = (key: string, value: unknown) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(key, JSON.stringify(value))
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}

export const getStoredUsers = (): StoredUser[] => {
  return readJson<StoredUser[]>(STORAGE_KEYS.users, [])
}

export const setStoredUsers = (users: StoredUser[]) => {
  writeJson(STORAGE_KEYS.users, users)
}

export const findUserByEmail = (email: string) => {
  const normalized = email.trim().toLowerCase()
  return getStoredUsers().find((user) => user.email.trim().toLowerCase() === normalized) || null
}

export const registerUser = (payload: Omit<StoredUser, 'id'>) => {
  const newUser: StoredUser = {
    ...payload,
    id: generateId(),
  }

  const existingUsers = getStoredUsers()
  existingUsers.push(newUser)
  setStoredUsers(existingUsers)

  return newUser
}

export const upsertUser = (user: StoredUser) => {
  const users = getStoredUsers()
  const index = users.findIndex((existing) => existing.id === user.id)
  if (index >= 0) {
    users[index] = user
  } else {
    users.push(user)
  }
  setStoredUsers(users)
}

export const setActiveUser = (user: StoredUser | null) => {
  if (!user) {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEYS.activeUser)
    }
    return
  }

  writeJson(STORAGE_KEYS.activeUser, user)
}

export const getActiveUser = (): StoredUser | null => {
  return readJson<StoredUser | null>(STORAGE_KEYS.activeUser, null)
}

const getProfileKey = (userId: string) => `${STORAGE_KEYS.specialistProfilePrefix}${userId}`

export const loadSpecialistProfile = <T>(userId: string | undefined, fallback: T): T => {
  if (!userId) {
    return readJson<T>(STORAGE_KEYS.legacySpecialistProfile, fallback)
  }

  const namespaced = readJson<T | null>(getProfileKey(userId), null)
  if (namespaced) {
    return namespaced
  }

  const legacyProfile = readJson<T | null>(STORAGE_KEYS.legacySpecialistProfile, null)
  if (legacyProfile) {
    writeJson(getProfileKey(userId), legacyProfile)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEYS.legacySpecialistProfile)
    }
    return legacyProfile
  }

  return fallback
}

export const saveSpecialistProfile = <T>(userId: string | undefined, profile: T) => {
  if (!userId) {
    writeJson(STORAGE_KEYS.legacySpecialistProfile, profile)
    return
  }

  writeJson(getProfileKey(userId), profile)
}
