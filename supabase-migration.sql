-- ============================================
-- FreeExperience Platform - Database Schema
-- Simplified user_id-based structure
-- ============================================

-- Удаляем существующие таблицы (если нужно пересоздать)
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS specialists CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- ============================================
-- Таблица: specialists (профили специалистов)
-- ============================================
CREATE TABLE specialists (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  bio TEXT DEFAULT '',
  telegram TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  show_in_search BOOLEAN DEFAULT true,
  portfolio JSONB DEFAULT '[]'::jsonb,
  portfolio_preview TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX idx_specialists_email ON specialists(email);
CREATE INDEX idx_specialists_specialization ON specialists(specialization);

-- RLS (Row Level Security)
ALTER TABLE specialists ENABLE ROW LEVEL SECURITY;

-- Политики доступа
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
-- Таблица: projects (задачи пользователей)
-- ============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  full_description TEXT DEFAULT '',
  specialization TEXT NOT NULL,
  skills TEXT[] DEFAULT '{}'::text[],
  location TEXT DEFAULT '',
  deadline DATE,
  budget TEXT DEFAULT '',
  timeline TEXT DEFAULT '',
  requirements TEXT[] DEFAULT '{}'::text[],
  deliverables TEXT[] DEFAULT '{}'::text[],
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_specialization ON projects(specialization);

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Политики доступа
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
-- Таблица: applications (заявки на задачи)
-- ============================================
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  specialist_id UUID NOT NULL REFERENCES specialists(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, specialist_id)
);

-- Индексы
CREATE INDEX idx_applications_project_id ON applications(project_id);
CREATE INDEX idx_applications_specialist_id ON applications(specialist_id);
CREATE INDEX idx_applications_status ON applications(status);

-- RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Специалисты могут просматривать свои заявки"
  ON applications FOR SELECT
  USING (auth.uid() = specialist_id);

CREATE POLICY "Пользователи могут просматривать заявки на свои задачи"
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = applications.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Специалисты могут создавать заявки"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = specialist_id);

CREATE POLICY "Специалисты могут обновлять свои заявки"
  ON applications FOR UPDATE
  USING (auth.uid() = specialist_id);

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
-- Триггеры для автоматического обновления updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_specialists_updated_at
  BEFORE UPDATE ON specialists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Готово!
-- ============================================
-- Миграция выполнена успешно ✅

