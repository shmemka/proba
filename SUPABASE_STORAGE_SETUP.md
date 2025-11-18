# 📦 Настройка Supabase Storage для загрузки изображений

## ❌ Ошибка: "Bucket not found"

Если вы видите ошибку **"Bucket not found"** при загрузке изображений, это значит, что в Supabase Storage еще не создан bucket `public-assets`.

---

## ✅ Решение: Создание bucket (5 минут)

### Шаг 1: Откройте Storage в Supabase

1. Войдите на https://supabase.com/dashboard
2. Выберите ваш проект
3. В левом меню найдите **Storage** 📦
4. Нажмите на **"Buckets"**

### Шаг 2: Создайте новый bucket

1. Нажмите кнопку **"New bucket"** (справа вверху)
2. Заполните форму:
   - **Name**: `public-assets` (имя должно быть именно таким!)
   - **Public bucket**: включите переключатель ✅ (это важно!)
3. Нажмите **"Create bucket"**

### Шаг 3: Настройте политики доступа (RLS)

После создания bucket:

1. Откройте созданный bucket `public-assets`
2. Перейдите на вкладку **"Policies"**
3. Нажмите **"New policy"** или **"Add policy"**
4. Вставьте следующий SQL код:

```sql
-- Политика 1: Общедоступное чтение (все могут просматривать изображения)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-assets');

-- Политика 2: Авторизованные пользователи могут загружать файлы
CREATE POLICY "Users can upload to their folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'public-assets'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 2) = auth.uid()::text
);

-- Политика 3: Авторизованные пользователи могут обновлять свои файлы
CREATE POLICY "Users can update their files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'public-assets'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 2) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'public-assets'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 2) = auth.uid()::text
);

-- Политика 4: Авторизованные пользователи могут удалять свои файлы
CREATE POLICY "Users can delete their files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'public-assets'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 2) = auth.uid()::text
);
```

5. Нажмите **"Review"** и затем **"Save policy"**

Или выполните весь SQL код сразу в **SQL Editor** → **New query**.

---

## 🧪 Проверка

После создания bucket и настройки политик:

1. **Проверьте bucket:**
   - Storage → Buckets → должен быть `public-assets` ✅
   - Убедитесь, что стоит галочка **"Public bucket"** ✅

2. **Проверьте политики:**
   - Storage → Buckets → `public-assets` → Policies
   - Должно быть 4 политики (read, insert, update, delete) ✅

3. **Попробуйте загрузить изображение:**
   - Откройте профиль → Портфолио
   - Загрузите изображение
   - Должно работать без ошибок! ✅

---

## 📋 Пошаговая инструкция (с скриншотами шагов)

### Вариант 1: Через UI (проще)

1. **Storage** → **Buckets** → **New bucket**
2. Name: `public-assets`, включить **Public bucket**
3. **Create bucket**
4. Открыть bucket → **Policies** → скопировать SQL выше → выполнить

### Вариант 2: Через SQL Editor (быстрее)

1. **SQL Editor** → **New query**
2. Скопировать весь код ниже:

```sql
-- Создание bucket через SQL (если UI не работает)
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Политики доступа
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-assets');

CREATE POLICY "Users can upload to their folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'public-assets'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 2) = auth.uid()::text
);

CREATE POLICY "Users can update their files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'public-assets'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 2) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'public-assets'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 2) = auth.uid()::text
);

CREATE POLICY "Users can delete their files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'public-assets'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 2) = auth.uid()::text
);
```

3. Нажать **Run**

---

## 🔍 Проверка что bucket создан

Выполните в SQL Editor:

```sql
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'public-assets';
```

Должна быть одна строка:
- `id`: `public-assets`
- `name`: `public-assets`
- `public`: `true` ✅

---

## ⚠️ Важные моменты

1. **Имя bucket**: должно быть точно `public-assets` (без пробелов, без заглавных букв)
2. **Public bucket**: обязательно включите, иначе изображения не будут доступны
3. **Политики**: без них загрузка не будет работать
4. **Переменная окружения**: проверьте `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=public-assets
   ```

---

## 🚨 Частые проблемы

### Ошибка: "permission denied"
**Решение**: Проверьте политики RLS в bucket `public-assets` → Policies

### Ошибка: "bucket is private"
**Решение**: Включите опцию **"Public bucket"** в настройках bucket

### Изображения не загружаются
**Решение**: 
1. Проверьте что bucket создан: Storage → Buckets
2. Проверьте что политики настроены: Bucket → Policies
3. Проверьте консоль браузера (F12) на ошибки

### Изображения загружаются, но не отображаются
**Решение**: Убедитесь что bucket помечен как **Public** ✅

---

## 🎉 После настройки

1. Перезагрузите страницу приложения
2. Попробуйте загрузить аватар или изображение портфолио
3. Файлы должны загружаться в `public-assets/specialists/{user_id}/...`
4. Изображения должны отображаться в карточках специалистов

---

## 📚 Дополнительно

- Структура хранения: `public-assets/specialists/{user_id}/avatar.jpg`
- Структура портфолио: `public-assets/specialists/{user_id}/portfolio/{project_id}/{image_id}.jpg`
- Все файлы автоматически доступны по публичному URL
- Cache-Control установлен на 7 дней для оптимизации

**Готово!** После создания bucket загрузка изображений будет работать! 🚀

