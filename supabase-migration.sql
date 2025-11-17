-- ============================================
-- FreeExperience Platform - Database Schema
-- ============================================

-- Удаляем существующие таблицы (если нужно пересоздать)
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS specialists CASCADE;

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

CREATE POLICY "Специалисты могут создавать свой профиль"
  ON specialists FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Специалисты могут обновлять свой профиль"
  ON specialists FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- Таблица: companies (профили компаний)
-- ============================================
CREATE TABLE companies (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_companies_email ON companies(email);

-- RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Все могут просматривать компании"
  ON companies FOR SELECT
  USING (true);

CREATE POLICY "Компании могут создавать свой профиль"
  ON companies FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Компании могут обновлять свой профиль"
  ON companies FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- Таблица: projects (проекты компаний)
-- ============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  specialization TEXT NOT NULL,
  budget TEXT NOT NULL,
  timeline TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_projects_company_id ON projects(company_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_specialization ON projects(specialization);

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Все могут просматривать открытые проекты"
  ON projects FOR SELECT
  USING (status = 'open');

CREATE POLICY "Компании могут просматривать свои проекты"
  ON projects FOR SELECT
  USING (auth.uid() = company_id);

CREATE POLICY "Компании могут создавать проекты"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = company_id);

CREATE POLICY "Компании могут обновлять свои проекты"
  ON projects FOR UPDATE
  USING (auth.uid() = company_id);

CREATE POLICY "Компании могут удалять свои проекты"
  ON projects FOR DELETE
  USING (auth.uid() = company_id);

-- ============================================
-- Таблица: applications (заявки на проекты)
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

CREATE POLICY "Компании могут просматривать заявки на свои проекты"
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = applications.project_id
      AND projects.company_id = auth.uid()
    )
  );

CREATE POLICY "Специалисты могут создавать заявки"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = specialist_id);

CREATE POLICY "Специалисты могут обновлять свои заявки"
  ON applications FOR UPDATE
  USING (auth.uid() = specialist_id);

CREATE POLICY "Компании могут обновлять статус заявок на свои проекты"
  ON applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = applications.project_id
      AND projects.company_id = auth.uid()
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

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
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

