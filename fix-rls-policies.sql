-- ============================================
-- Восстановление RLS политик для FreeExperience
-- ============================================
-- Этот скрипт восстанавливает все необходимые политики

-- ============================================
-- 1. SPECIALISTS (Специалисты)
-- ============================================

-- Включаем RLS (если еще не включен)
ALTER TABLE specialists ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики, если они существуют (чтобы избежать конфликтов)
DROP POLICY IF EXISTS "Все могут просматривать профили специалистов" ON specialists;
DROP POLICY IF EXISTS "Specialists are viewable by everyone" ON specialists;
DROP POLICY IF EXISTS "Пользователи могут создавать профиль специалиста" ON specialists;
DROP POLICY IF EXISTS "Users can insert their own specialist profile" ON specialists;
DROP POLICY IF EXISTS "Пользователи могут обновлять свой профиль специалиста" ON specialists;
DROP POLICY IF EXISTS "Users can update their own specialist profile" ON specialists;

-- Создаем политики для specialists
CREATE POLICY "Все могут просматривать профили специалистов"
  ON specialists FOR SELECT
  USING (true);

CREATE POLICY "Пользователи могут создавать профиль специалиста"
  ON specialists FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Пользователи могут обновлять свой профиль специалиста"
  ON specialists FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- 2. PROJECTS (Задачи)
-- ============================================

-- Включаем RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики
DROP POLICY IF EXISTS "Все могут просматривать открытые задачи" ON projects;
DROP POLICY IF EXISTS "Projects are viewable by everyone" ON projects;
DROP POLICY IF EXISTS "Пользователи могут просматривать свои задачи" ON projects;
DROP POLICY IF EXISTS "Пользователи могут создавать задачи" ON projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
DROP POLICY IF EXISTS "Companies can insert their own projects" ON projects;
DROP POLICY IF EXISTS "Пользователи могут обновлять свои задачи" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Companies can update their own projects" ON projects;
DROP POLICY IF EXISTS "Пользователи могут удалять свои задачи" ON projects;
DROP POLICY IF EXISTS "Companies can delete their own projects" ON projects;

-- Создаем политики для projects
CREATE POLICY "Все могут просматривать открытые задачи"
  ON projects FOR SELECT
  USING (status = 'open');

CREATE POLICY "Пользователи могут просматривать свои задачи"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи могут создавать задачи"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Пользователи могут обновлять свои задачи"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Пользователи могут удалять свои задачи"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. APPLICATIONS (Заявки/Отклики)
-- ============================================

-- Включаем RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики
DROP POLICY IF EXISTS "Специалисты могут просматривать свои заявки" ON applications;
DROP POLICY IF EXISTS "Пользователи могут просматривать заявки на свои задачи" ON applications;
DROP POLICY IF EXISTS "Applications are viewable by project owner and applicant" ON applications;
DROP POLICY IF EXISTS "Специалисты могут создавать заявки" ON applications;
DROP POLICY IF EXISTS "Specialists can insert their own applications" ON applications;
DROP POLICY IF EXISTS "Специалисты могут обновлять свои заявки" ON applications;
DROP POLICY IF EXISTS "Пользователи могут обновлять статус заявок на свои задачи" ON applications;
DROP POLICY IF EXISTS "Project owners can update applications" ON applications;

-- Создаем политики для applications
-- Политика 1: Специалисты могут просматривать свои собственные заявки
CREATE POLICY "Специалисты могут просматривать свои заявки"
  ON applications FOR SELECT
  USING (auth.uid() = specialist_id);

-- Политика 2: Владельцы задач могут просматривать заявки на свои задачи
CREATE POLICY "Пользователи могут просматривать заявки на свои задачи"
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

-- Политика 5: Владельцы задач могут обновлять заявки на свои задачи
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
-- Готово!
-- ============================================
-- Проверьте, что политики применены:
-- SELECT tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

