-- ============================================
-- Миграция: Добавление поля specialization в projects
-- ============================================
-- Эта миграция добавляет поле specialization, если его нет,
-- и обновляет RLS политики для правильной работы с откликами

-- Проверяем и добавляем поле specialization, если его нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'specialization'
  ) THEN
    ALTER TABLE projects ADD COLUMN specialization TEXT DEFAULT 'Другое';
    RAISE NOTICE 'Добавлено поле specialization в таблицу projects';
  ELSE
    RAISE NOTICE 'Поле specialization уже существует в таблице projects';
  END IF;
END $$;

-- Создаем индекс для specialization, если его нет
CREATE INDEX IF NOT EXISTS idx_projects_specialization ON projects(specialization);

-- Убеждаемся, что поле user_id существует (если используется company_id, это не изменит)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'user_id'
  ) THEN
    -- Если используется company_id, добавляем user_id как алиас
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'company_id'
    ) THEN
      -- Добавляем user_id и копируем данные из company_id
      ALTER TABLE projects ADD COLUMN user_id UUID;
      UPDATE projects SET user_id = company_id WHERE user_id IS NULL;
      RAISE NOTICE 'Добавлено поле user_id и скопированы данные из company_id';
    ELSE
      RAISE WARNING 'Не найдено ни user_id, ни company_id в таблице projects';
    END IF;
  ELSE
    RAISE NOTICE 'Поле user_id уже существует в таблице projects';
  END IF;
END $$;

-- Убеждаемся, что поле created_at существует
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE projects ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE 'Добавлено поле created_at в таблицу projects';
  ELSE
    RAISE NOTICE 'Поле created_at уже существует в таблице projects';
  END IF;
END $$;

-- Обновляем RLS политики для applications, чтобы они проверяли user_id
-- Удаляем старые политики, если они используют company_id
DO $$
BEGIN
  -- Удаляем политику, если она использует company_id
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'applications' 
    AND policyname = 'Applications are viewable by project owner and applicant'
  ) THEN
    DROP POLICY IF EXISTS "Applications are viewable by project owner and applicant" ON applications;
    RAISE NOTICE 'Удалена старая политика applications';
  END IF;
END $$;

-- Создаем правильные RLS политики для applications
-- Политика 1: Специалисты могут просматривать свои заявки
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'applications' 
    AND policyname = 'Специалисты могут просматривать свои заявки'
  ) THEN
    CREATE POLICY "Специалисты могут просматривать свои заявки"
      ON applications FOR SELECT
      USING (auth.uid() = specialist_id);
    RAISE NOTICE 'Создана политика: Специалисты могут просматривать свои заявки';
  END IF;
END $$;

-- Политика 2: Пользователи могут просматривать заявки на свои задачи (через user_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'applications' 
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
    RAISE NOTICE 'Создана политика: Пользователи могут просматривать заявки на свои задачи';
  ELSE
    -- Обновляем существующую политику, если она использует company_id
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
    RAISE NOTICE 'Обновлена политика: Пользователи могут просматривать заявки на свои задачи';
  END IF;
END $$;

-- Политика 3: Пользователи могут обновлять статус заявок на свои задачи (через user_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'applications' 
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
    RAISE NOTICE 'Создана политика: Пользователи могут обновлять статус заявок на свои задачи';
  ELSE
    -- Обновляем существующую политику
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
    RAISE NOTICE 'Обновлена политика: Пользователи могут обновлять статус заявок на свои задачи';
  END IF;
END $$;

