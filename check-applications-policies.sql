-- Скрипт для проверки и обновления политик доступа к откликам (applications)
-- Выполните этот скрипт в SQL Editor в Supabase, если нужно обновить политики

-- ============================================
-- ШАГ 1: Удаляем старые политики (если они используют company_id)
-- ============================================

-- Удаляем политики, которые могут использовать неправильное поле
DROP POLICY IF EXISTS "Applications are viewable by project owner and applicant" ON applications;
DROP POLICY IF EXISTS "Project owners can update applications" ON applications;

-- ============================================
-- ШАГ 2: Создаем правильные политики (используя user_id)
-- ============================================

-- Политика: Специалисты могут просматривать свои заявки
DROP POLICY IF EXISTS "Специалисты могут просматривать свои заявки" ON applications;
CREATE POLICY "Специалисты могут просматривать свои заявки"
  ON applications FOR SELECT
  USING (auth.uid() = specialist_id);

-- Политика: Владельцы проектов могут просматривать заявки на свои задачи
DROP POLICY IF EXISTS "Пользователи могут просматривать заявки на свои задачи" ON applications;
CREATE POLICY "Пользователи могут просматривать заявки на свои задачи"
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = applications.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Политика: Специалисты могут создавать заявки
DROP POLICY IF EXISTS "Специалисты могут создавать заявки" ON applications;
CREATE POLICY "Специалисты могут создавать заявки"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = specialist_id);

-- Политика: Специалисты могут обновлять свои заявки
DROP POLICY IF EXISTS "Специалисты могут обновлять свои заявки" ON applications;
CREATE POLICY "Специалисты могут обновлять свои заявки"
  ON applications FOR UPDATE
  USING (auth.uid() = specialist_id);

-- Политика: Владельцы проектов могут обновлять статус заявок на свои задачи
DROP POLICY IF EXISTS "Пользователи могут обновлять статус заявок на свои задачи" ON applications;
CREATE POLICY "Пользователи могут обновлять статус заявок на свои задачи"
  ON applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = applications.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- ============================================
-- ШАГ 3: Проверка политик
-- ============================================

-- Проверяем, что RLS включен
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'applications';

-- Показываем все политики для таблицы applications
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'applications'
ORDER BY policyname;

