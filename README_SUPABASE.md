# 🚀 Supabase Integration - Полная документация

## 📝 Обзор

Этот проект интегрирован с Supabase для хранения данных и аутентификации пользователей.

**Особенности:**
- ✅ Полная интеграция с Supabase Auth
- ✅ Row Level Security (RLS) для безопасности
- ✅ Автоматический fallback на localStorage
- ✅ Упрощенная модель: все пользователи регистрируются как специалисты и владельцы проектов
- ✅ Real-time обновления (готово к использованию)

---

## 🏗 Архитектура

### Клиент Supabase

**Файл**: `lib/supabaseClient.ts`

```typescript
getSupabaseClient() // Получить singleton клиент для браузера
```

**Особенности:**
- Singleton паттерн (один экземпляр на приложение)
- Автоматическая проверка переменных окружения
- Graceful degradation на localStorage
- Автоматическое обновление токенов

### Структура базы данных

```
auth.users (Supabase Auth)
    └─> specialists (профили специалистов + настройки)
            └─> projects (задачи пользователей по user_id)
                    └─> applications (заявки специалистов)
Storage
    └─> public-assets (аватары и изображения портфолио)
```

---

## 🔐 Аутентификация

### Регистрация

**Специалист:**
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'specialist@example.com',
  password: 'password123',
  options: {
    data: {
      userType: 'specialist',
      displayName: 'Имя Фамилия'
    }
  }
})

// После регистрации создается запись в specialists
await supabase.from('specialists').insert({
  id: data.user.id,
  name: 'Имя Фамилия',
  email: 'specialist@example.com',
  // ... другие поля
})
```

### Вход

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

// Получить отображаемое имя
const displayName = data.user?.user_metadata?.displayName
```

### Выход

```typescript
await supabase.auth.signOut()
```

### Проверка сессии

```typescript
const { data: { session } } = await supabase.auth.getSession()

if (session) {
  console.log('User:', session.user)
  console.log('Display name:', session.user.user_metadata?.displayName)
}
```

---

## 📊 Работа с данными

### Specialists (Специалисты)

**Создание профиля:**
```typescript
const { error } = await supabase.from('specialists').insert({
  id: userId, // auth.uid()
  email: 'email@example.com',
  first_name: 'Имя',
  last_name: 'Фамилия',
  specialization: 'Дизайн',
  bio: 'Описание',
  telegram: '@username',
  show_in_search: true,
  portfolio: [],
  portfolio_preview: []
})
```

**Обновление профиля:**
```typescript
const { error } = await supabase
  .from('specialists')
  .update({
    bio: 'Новая биография',
    telegram: '@new_handle',
    specialization: 'SMM'
  })
  .eq('id', userId)
```

**Получение всех специалистов:**
```typescript
const { data, error } = await supabase
  .from('specialists')
  .select('*')
  .order('created_at', { ascending: false })
```

### Projects (Проекты)

**Создание проекта:**
```typescript
const { error } = await supabase.from('projects').insert({
  user_id: userId, // auth.uid()
  title: 'Название проекта',
  description: 'Краткое описание',
  full_description: 'Полное описание',
  skills: ['React', 'Node.js'],
  location: 'Москва',
  deadline: '2024-12-31',
  status: 'open',
  requirements: ['Опыт с React', 'Английский язык'],
  deliverables: ['Готовое приложение', 'Документация']
})
```

**Получение проектов с информацией о владельце:**
```typescript
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('status', 'open')
  .order('deadline', { ascending: true })
```

**Получение проектов пользователя:**
```typescript
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('user_id', userId)
```

### Applications (Заявки)

**Создание заявки:**
```typescript
const { error } = await supabase.from('applications').insert({
  project_id: projectId,
  specialist_id: userId, // auth.uid() специалиста
  text: 'Текст заявки',
  status: 'pending'
})
```

**Получение заявок проекта (для владельца задачи):**
```typescript
const { data, error } = await supabase
  .from('applications')
  .select(`
    *,
    specialists(name, email, title, skills)
  `)
  .eq('project_id', projectId)
```

**Обновление статуса заявки:**
```typescript
const { error } = await supabase
  .from('applications')
  .update({ status: 'accepted' })
  .eq('id', applicationId)
```

---

## 🔒 Row Level Security (RLS)

### Specialists
- **SELECT**: Все могут просматривать ✅
- **INSERT**: Только свой профиль (auth.uid() = id) ✅
- **UPDATE**: Только свой профиль ✅
- **DELETE**: Запрещено ❌

### Projects
- **SELECT**: Все могут просматривать ✅
- **INSERT**: Только свои проекты (`user_id = auth.uid()`) ✅
- **UPDATE**: Только свои проекты ✅
- **DELETE**: Только свои проекты ✅

### Applications
- **SELECT**: Только специалист-автор или владелец проекта ✅
- **INSERT**: Только свои заявки (specialist_id = auth.uid()) ✅
- **UPDATE**: Только владелец проекта (для смены статуса) ✅
- **DELETE**: Запрещено ❌

---

## 🎣 Хуки и подписки

### Отслеживание изменений Auth

```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'SIGNED_IN') {
        console.log('User signed in:', session.user)
      }
      if (event === 'SIGNED_OUT') {
        console.log('User signed out')
      }
    }
  )

  return () => {
    subscription.unsubscribe()
  }
}, [])
```

### Real-time подписки (готово к использованию)

```typescript
// Подписка на новые проекты
const channel = supabase
  .channel('projects')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'projects'
  }, (payload) => {
    console.log('Новый проект:', payload.new)
  })
  .subscribe()

// Отписка
channel.unsubscribe()
```

---

## 🛠 Утилиты

### Получение ID текущего пользователя

```typescript
const getCurrentUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id
}
```

### Проверка, является ли пользователь владельцем

```typescript
const isOwner = async (resourceId: string, table: string) => {
  const { data: { user } } = await supabase.auth.getUser()
  const ownerColumn = table === 'projects' ? 'user_id' : 'id'
  
  const { data } = await supabase
    .from(table)
    .select(ownerColumn)
    .eq('id', resourceId)
    .eq(ownerColumn, user?.id)
    .single()
  
  return !!data
}
```

---

## 🐛 Отладка

### Логирование запросов

```typescript
const { data, error } = await supabase.from('specialists').select('*')

if (error) {
  console.error('Supabase error:', error.message)
  console.error('Details:', error.details)
  console.error('Hint:', error.hint)
}
```

### Проверка политик RLS

```sql
-- В SQL Editor Supabase
SELECT * FROM specialists WHERE id = auth.uid();
SELECT * FROM projects WHERE user_id = auth.uid();
```

---

## 📈 Производительность

### Оптимизация запросов

**Плохо:**
```typescript
// Получаем все колонки (включая тяжелое portfolio) даже для списка
const { data } = await supabase.from('specialists').select('*')
```

**Хорошо:**
```typescript
// Берем только нужные поля + легкий предпросмотр портфолио
const { data } = await supabase
  .from('specialists')
  .select('id, first_name, last_name, specialization, avatar_url, portfolio_preview')
  .order('created_at', { ascending: false })
```

### Пагинация

```typescript
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .range(0, 9) // Первые 10 записей
```

---

## 🔄 Миграция данных

### Из localStorage в Supabase

Приложение автоматически работает с localStorage если Supabase не настроен.
Для миграции данных нужно будет написать скрипт.

---

## 📚 Полезные ссылки

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Realtime](https://supabase.com/docs/guides/realtime)

---

## ✅ Готово!

Документация покрывает все основные случаи использования Supabase в проекте.



