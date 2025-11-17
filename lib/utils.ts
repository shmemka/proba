// Утилита для debounce
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

// Утилита для форматирования специалиста из разных источников
export function formatSpecialistFromStorage(saved: any) {
  let migratedSpecialist
  if ('name' in saved && typeof saved.name === 'string') {
    const nameParts = saved.name.split(' ')
    migratedSpecialist = {
      id: saved.id,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      specialization: saved.specialization || 'Дизайн',
      bio: saved.bio || '',
      telegram: saved.telegram || '',
      email: saved.email || '',
      avatarUrl: saved.avatarUrl || '',
      rating: saved.rating || 0,
      hiredCount: saved.hiredCount || 0,
      showInSearch: saved.showInSearch !== undefined ? saved.showInSearch : true,
      projects: saved.projects || [],
    }
  } else {
    migratedSpecialist = {
      id: saved.id,
      firstName: saved.firstName || '',
      lastName: saved.lastName || '',
      specialization: saved.specialization || 'Дизайн',
      bio: saved.bio,
      telegram: saved.telegram || '',
      email: saved.email,
      avatarUrl: saved.avatarUrl || '',
      rating: saved.rating || 0,
      hiredCount: saved.hiredCount || 0,
      showInSearch: saved.showInSearch !== undefined ? saved.showInSearch : true,
      projects: saved.projects || [],
    }
  }
  return migratedSpecialist
}

