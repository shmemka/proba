-- ============================================
-- Безопасная миграция: company_id -> user_id
-- ============================================
-- Эта миграция сохраняет существующие данные

-- 1. Добавляем новую колонку user_id в projects (если её нет)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN user_id UUID;
    RAISE NOTICE 'Добавлена колонка user_id';
  END IF;
END $$;

-- 2. Добавляем колонку portfolio_preview для специалистов (если её нет)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'specialists' AND column_name = 'portfolio_preview'
  ) THEN
    ALTER TABLE specialists ADD COLUMN portfolio_preview TEXT[] DEFAULT '{}'::text[];
    RAISE NOTICE 'Добавлена колонка portfolio_preview';
  END IF;
END $$;

-- 3. Копируем данные из company_id в user_id (если company_id существует)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'company_id'
  ) THEN
    UPDATE projects 
    SET user_id = company_id 
    WHERE user_id IS NULL AND company_id IS NOT NULL;
    RAISE NOTICE 'Данные скопированы из company_id в user_id';
  END IF;
END $$;

-- 4. Устанавливаем user_id для всех проектов, где он NULL (берем из auth.users)
DO $$
DECLARE
  project_record RECORD;
BEGIN
  FOR project_record IN 
    SELECT id FROM projects WHERE user_id IS NULL
  LOOP
    -- Пытаемся найти user_id из других источников или устанавливаем случайный
    -- В реальности это должно быть сделано вручную для каждого проекта
    RAISE NOTICE 'Проект % не имеет user_id. Установите его вручную.', project_record.id;
  END LOOP;
END $$;

-- 5. Удаляем старые политики, которые зависят от company_id (ПЕРЕД удалением колонки!)
DROP POLICY IF EXISTS "Компании могут просматривать свои" ON projects;
DROP POLICY IF EXISTS "Компании могут создавать проекты" ON projects;
DROP POLICY IF EXISTS "Компании могут обновлять свои про" ON projects;
DROP POLICY IF EXISTS "Компании могут удалять свои проек" ON projects;
DROP POLICY IF EXISTS "Компании могут просматривать заяв" ON applications;
DROP POLICY IF EXISTS "Компании могут обновлять статус з" ON applications;
-- Также удаляем политики с полными именами (на случай, если они есть)
DROP POLICY IF EXISTS "Компании могут просматривать свои проекты" ON projects;
DROP POLICY IF EXISTS "Компании могут создавать свои проекты" ON projects;
DROP POLICY IF EXISTS "Компании могут обновлять свои проекты" ON projects;
DROP POLICY IF EXISTS "Компании могут удалять свои проекты" ON projects;
DROP POLICY IF EXISTS "Компании могут просматривать заявки на свои проекты" ON applications;
DROP POLICY IF EXISTS "Компании могут обновлять статус заявок на свои проекты" ON applications;

-- 6. Удаляем foreign key constraint для company_id
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_company_id_fkey;

-- 7. Удаляем старую колонку company_id (теперь политики уже удалены)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE projects DROP COLUMN company_id;
    RAISE NOTICE 'Колонка company_id удалена';
  END IF;
END $$;

-- 8. Устанавливаем NOT NULL для user_id (только если все проекты имеют user_id)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM projects WHERE user_id IS NULL) THEN
    ALTER TABLE projects ALTER COLUMN user_id SET NOT NULL;
    RAISE NOTICE 'user_id установлен как NOT NULL';
  ELSE
    RAISE WARNING 'Некоторые проекты не имеют user_id. Установите user_id для всех проектов перед установкой NOT NULL.';
  END IF;
END $$;

-- 9. Добавляем foreign key constraint для user_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'projects_user_id_fkey'
  ) THEN
    ALTER TABLE projects 
    ADD CONSTRAINT projects_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Добавлен foreign key constraint для user_id';
  END IF;
END $$;

-- 10. Создаем индекс для user_id (если его нет)
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- 11. Создаем новые политики для user_id (старые уже удалены в шаге 5)
DO $$
BEGIN
  -- Политика: Все могут просматривать открытые задачи
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'projects' 
    AND policyname = 'Все могут просматривать открытые задачи'
  ) THEN
    CREATE POLICY "Все могут просматривать открытые задачи"
      ON projects FOR SELECT
      USING (status = 'open');
  END IF;

  -- Политика: Пользователи могут просматривать свои задачи
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'projects' 
    AND policyname = 'Пользователи могут просматривать свои задачи'
  ) THEN
    CREATE POLICY "Пользователи могут просматривать свои задачи"
      ON projects FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  -- Политика: Пользователи могут создавать задачи
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'projects' 
    AND policyname = 'Пользователи могут создавать задачи'
  ) THEN
    CREATE POLICY "Пользователи могут создавать задачи"
      ON projects FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Политика: Пользователи могут обновлять свои задачи
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'projects' 
    AND policyname = 'Пользователи могут обновлять свои задачи'
  ) THEN
    CREATE POLICY "Пользователи могут обновлять свои задачи"
      ON projects FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  -- Политика: Пользователи могут удалять свои задачи
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'projects' 
    AND policyname = 'Пользователи могут удалять свои задачи'
  ) THEN
    CREATE POLICY "Пользователи могут удалять свои задачи"
      ON projects FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 12. Обновляем политики для applications (используем user_id вместо company_id)
-- Старые политики уже удалены в шаге 4
DO $$
BEGIN
  -- Политика: Пользователи могут просматривать заявки на свои задачи
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'applications' 
    AND policyname = 'Пользователи могут просматривать заявки на свои задачи'
  ) THEN
    CREATE POLICY "Пользователи могут просматривать заявки на свои задачи"
      ON applications FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM projects
          WHERE projects.id = applications.project_id
          AND projects.user_id = auth.uid()
        )
      );
  END IF;

  -- Политика: Пользователи могут обновлять статус заявок на свои задачи
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'applications' 
    AND policyname = 'Пользователи могут обновлять статус заявок на свои задачи'
  ) THEN
    CREATE POLICY "Пользователи могут обновлять статус заявок на свои задачи"
      ON applications FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM projects
          WHERE projects.id = applications.project_id
          AND projects.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 13. Удаляем таблицу companies (ОСТОРОЖНО: это удалит все данные компаний!)
-- Раскомментируйте следующую строку, если вы уверены, что хотите удалить таблицу companies
-- DROP TABLE IF EXISTS companies CASCADE;

-- ============================================
-- Готово!
-- ============================================
-- После выполнения этой миграции:
-- 1. Проверьте, что все проекты имеют user_id
-- 2. Если есть проекты без user_id, установите их вручную
-- 3. Раскомментируйте строку DROP TABLE companies, если хотите удалить таблицу companies

