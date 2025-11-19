-- ============================================
-- ИСПРАВЛЕНИЕ ПОЛИТИК ДОСТУПА К ОТКЛИКАМ (APPLICATIONS)
-- ============================================
-- Этот скрипт обновляет политики RLS для таблицы applications
-- чтобы владельцы проектов могли видеть отклики только на свои задачи
-- 
-- ВАЖНО: Убедитесь, что в таблице projects используется поле user_id (не company_id)
-- ============================================

-- ШАГ 1: Проверяем структуру таблицы projects
-- Выполните этот запрос, чтобы убедиться, что используется user_id:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' 
  AND column_name IN ('user_id', 'company_id')
ORDER BY column_name;

-- Если в результате есть только user_id - продолжайте
-- Если есть company_id - нужно будет адаптировать политики

-- ============================================
-- ШАГ 2: Удаляем старые политики (если они существуют)
-- ============================================

-- Удаляем политики, которые могут использовать неправильное поле
DROP POLICY IF EXISTS "Applications are viewable by project owner and applicant" ON applications;
DROP POLICY IF EXISTS "Project owners can update applications" ON applications;
DROP POLICY IF EXISTS "Специалисты могут просматривать свои заявки" ON applications;
DROP POLICY IF EXISTS "Пользователи могут просматривать заявки на свои задачи" ON applications;
DROP POLICY IF EXISTS "Специалисты могут создавать заявки" ON applications;
DROP POLICY IF EXISTS "Специалисты могут обновлять свои заявки" ON applications;
DROP POLICY IF EXISTS "Пользователи могут обновлять статус заявок на свои задачи" ON applications;
DROP POLICY IF EXISTS "Specialists can insert their own applications" ON applications;
DROP POLICY IF EXISTS "Specialists can update their own applications" ON applications;

-- ============================================
-- ШАГ 3: Создаем правильные политики (используя user_id)
-- ============================================

-- Политика 1: Специалисты могут просматривать ТОЛЬКО свои заявки
CREATE POLICY "Специалисты могут просматривать свои заявки"
  ON applications FOR SELECT
  USING (auth.uid() = specialist_id);

-- Политика 2: Владельцы проектов могут просматривать заявки ТОЛЬКО на свои задачи
CREATE POLICY "Владельцы проектов могут просматривать заявки на свои задачи"
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = applications.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Политика 3: Специалисты могут создавать заявки
CREATE POLICY "Специалисты могут создавать заявки"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = specialist_id);

-- Политика 4: Специалисты могут обновлять свои заявки
CREATE POLICY "Специалисты могут обновлять свои заявки"
  ON applications FOR UPDATE
  USING (auth.uid() = specialist_id);

-- Политика 5: Владельцы проектов могут обновлять статус заявок на свои задачи
CREATE POLICY "Владельцы проектов могут обновлять статус заявок на свои задачи"
  ON applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = applications.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ============================================
-- ШАГ 4: Проверка политик
-- ============================================

-- Проверяем, что RLS включен
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'applications';

-- Показываем все политики для таблицы applications
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'applications'
ORDER BY policyname;

-- ============================================
-- РЕЗУЛЬТАТ
-- ============================================
-- После выполнения скрипта должно быть 5 политик:
-- 1. Специалисты могут просматривать свои заявки (SELECT)
-- 2. Владельцы проектов могут просматривать заявки на свои задачи (SELECT)
-- 3. Специалисты могут создавать заявки (INSERT)
-- 4. Специалисты могут обновлять свои заявки (UPDATE)
-- 5. Владельцы проектов могут обновлять статус заявок на свои задачи (UPDATE)
-- ============================================

