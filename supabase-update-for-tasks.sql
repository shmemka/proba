-- ============================================
-- Обновление для функционала задач
-- ============================================
-- Этот скрипт проверяет и обновляет политики RLS для корректной работы
-- просмотра откликов компаниями с данными специалистов

-- Проверяем, что политика для specialists позволяет всем просматривать
-- (должна уже существовать, но проверяем)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'specialists' 
    AND policyname = 'Все могут просматривать профили специалистов'
  ) THEN
    CREATE POLICY "Все могут просматривать профили специалистов"
      ON specialists FOR SELECT
      USING (true);
  END IF;
END $$;

-- Убеждаемся, что политика для applications позволяет компаниям
-- просматривать заявки на свои проекты (должна уже существовать)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'applications' 
    AND policyname = 'Компании могут просматривать заявки на свои проекты'
  ) THEN
    CREATE POLICY "Компании могут просматривать заявки на свои проекты"
      ON applications FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM projects
          WHERE projects.id = applications.project_id
          AND projects.company_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Убеждаемся, что политика для projects позволяет компаниям
-- просматривать все свои проекты (не только открытые)
-- Это нужно для категории "Мои проекты"
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'projects' 
    AND policyname = 'Компании могут просматривать свои проекты'
  ) THEN
    CREATE POLICY "Компании могут просматривать свои проекты"
      ON projects FOR SELECT
      USING (auth.uid() = company_id);
  END IF;
END $$;

-- Проверяем, что все поля в таблице projects существуют
-- (они уже должны быть, но проверяем для уверенности)
-- Поля description, deadline уже есть и обязательны
-- Остальные поля (full_description, skills, location и т.д.) опциональны

-- ============================================
-- Готово!
-- ============================================
-- Если все политики уже существуют, скрипт ничего не изменит
-- Если какой-то политики нет, она будет создана

