-- ========================================
-- Supabase Migration: UPDATE existing database
-- FreeExperience Platform
-- ========================================
-- Используйте ЭТОТ файл если у вас УЖЕ ЕСТЬ таблицы в Supabase
-- Этот скрипт безопасно обновит существующую структуру

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- STEP 1: Drop old policies (если есть)
-- ========================================
DROP POLICY IF EXISTS "Specialists are viewable by everyone" ON specialists;
DROP POLICY IF EXISTS "Users can insert their own specialist profile" ON specialists;
DROP POLICY IF EXISTS "Users can update their own specialist profile" ON specialists;
DROP POLICY IF EXISTS "Companies are viewable by everyone" ON companies;
DROP POLICY IF EXISTS "Users can insert their own company profile" ON companies;
DROP POLICY IF EXISTS "Users can update their own company profile" ON companies;
DROP POLICY IF EXISTS "Projects are viewable by everyone" ON projects;
DROP POLICY IF EXISTS "Companies can insert their own projects" ON projects;
DROP POLICY IF EXISTS "Companies can update their own projects" ON projects;
DROP POLICY IF EXISTS "Companies can delete their own projects" ON projects;
DROP POLICY IF EXISTS "Applications are viewable by project owner and applicant" ON applications;
DROP POLICY IF EXISTS "Specialists can insert their own applications" ON applications;
DROP POLICY IF EXISTS "Project owners can update applications" ON applications;

-- ========================================
-- STEP 2: Create tables if not exist
-- ========================================

-- Table: specialists
CREATE TABLE IF NOT EXISTS specialists (
  id UUID PRIMARY KEY,
  name TEXT,
  email TEXT,
  title TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  location TEXT DEFAULT '',
  experience TEXT DEFAULT '',
  portfolio TEXT DEFAULT '',
  github TEXT DEFAULT '',
  projects JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key to auth.users if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'specialists_id_fkey'
  ) THEN
    ALTER TABLE specialists 
      ADD CONSTRAINT specialists_id_fkey 
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Table: companies
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key to auth.users if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'companies_id_fkey'
  ) THEN
    ALTER TABLE companies 
      ADD CONSTRAINT companies_id_fkey 
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ========================================
-- STEP 3: Update projects table
-- ========================================

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT,
  description TEXT,
  full_description TEXT DEFAULT '',
  skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  location TEXT DEFAULT '',
  deadline DATE,
  status TEXT DEFAULT 'open',
  requirements TEXT[] DEFAULT ARRAY[]::TEXT[],
  deliverables TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if not exist
DO $$
BEGIN
  -- Add company_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN company_id UUID;
    RAISE NOTICE 'Added company_id column to projects table';
  END IF;
  
  -- Add status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'status'
  ) THEN
    ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'open';
    RAISE NOTICE 'Added status column to projects table';
  END IF;
  
  -- Add full_description
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'full_description'
  ) THEN
    ALTER TABLE projects ADD COLUMN full_description TEXT DEFAULT '';
    RAISE NOTICE 'Added full_description column to projects table';
  END IF;
  
  -- Add requirements
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'requirements'
  ) THEN
    ALTER TABLE projects ADD COLUMN requirements TEXT[] DEFAULT ARRAY[]::TEXT[];
    RAISE NOTICE 'Added requirements column to projects table';
  END IF;
  
  -- Add deliverables
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'deliverables'
  ) THEN
    ALTER TABLE projects ADD COLUMN deliverables TEXT[] DEFAULT ARRAY[]::TEXT[];
    RAISE NOTICE 'Added deliverables column to projects table';
  END IF;
END $$;

-- Set default company_id for existing projects (берем первую компанию)
DO $$
DECLARE
  first_company_id UUID;
BEGIN
  -- Получаем ID первой компании
  SELECT id INTO first_company_id FROM companies LIMIT 1;
  
  IF first_company_id IS NOT NULL THEN
    -- Обновляем все проекты без company_id
    UPDATE projects 
    SET company_id = first_company_id 
    WHERE company_id IS NULL;
    
    RAISE NOTICE 'Set company_id for existing projects to: %', first_company_id;
  ELSE
    RAISE NOTICE 'No companies found. Projects will need company_id set manually.';
  END IF;
END $$;

-- Add NOT NULL constraint only if no NULL values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM projects WHERE company_id IS NULL) THEN
    ALTER TABLE projects ALTER COLUMN company_id SET NOT NULL;
    RAISE NOTICE 'Set company_id as NOT NULL';
  ELSE
    RAISE WARNING 'Some projects have NULL company_id. Please set company_id before making it NOT NULL.';
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'projects_company_id_fkey'
  ) THEN
    ALTER TABLE projects 
      ADD CONSTRAINT projects_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key constraint on company_id';
  END IF;
END $$;

-- Add status check constraint (after ensuring column exists)
DO $$
BEGIN
  -- First ensure status column exists and has default
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'status'
  ) THEN
    -- Set default for existing NULL values
    UPDATE projects SET status = 'open' WHERE status IS NULL;
    
    -- Drop old constraint if exists
    ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
    
    -- Add new constraint
    ALTER TABLE projects 
      ADD CONSTRAINT projects_status_check 
      CHECK (status IN ('open', 'in_progress', 'completed'));
    
    RAISE NOTICE 'Added status check constraint';
  END IF;
END $$;

-- ========================================
-- STEP 4: Update applications table
-- ========================================

CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID,
  text TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add specialist_id column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'applications' AND column_name = 'specialist_id'
  ) THEN
    ALTER TABLE applications ADD COLUMN specialist_id UUID;
    RAISE NOTICE 'Added specialist_id column to applications table';
  END IF;
END $$;

-- Add foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'applications_project_id_fkey'
  ) THEN
    ALTER TABLE applications 
      ADD CONSTRAINT applications_project_id_fkey 
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'applications_specialist_id_fkey'
  ) THEN
    ALTER TABLE applications 
      ADD CONSTRAINT applications_specialist_id_fkey 
      FOREIGN KEY (specialist_id) REFERENCES specialists(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'applications_project_id_specialist_id_key'
  ) THEN
    ALTER TABLE applications 
      ADD CONSTRAINT applications_project_id_specialist_id_key 
      UNIQUE(project_id, specialist_id);
  END IF;
END $$;

-- Add status check constraint for applications
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'applications' AND column_name = 'status'
  ) THEN
    -- Set default for existing NULL values
    UPDATE applications SET status = 'pending' WHERE status IS NULL;
    
    -- Drop old constraint if exists
    ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
    
    -- Add new constraint
    ALTER TABLE applications 
      ADD CONSTRAINT applications_status_check 
      CHECK (status IN ('pending', 'accepted', 'rejected'));
    
    RAISE NOTICE 'Added applications status check constraint';
  END IF;
END $$;

-- ========================================
-- STEP 5: Create indexes
-- ========================================
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_deadline ON projects(deadline);
CREATE INDEX IF NOT EXISTS idx_applications_project_id ON applications(project_id);
CREATE INDEX IF NOT EXISTS idx_applications_specialist_id ON applications(specialist_id);
CREATE INDEX IF NOT EXISTS idx_specialists_email ON specialists(email);
CREATE INDEX IF NOT EXISTS idx_companies_email ON companies(email);

-- ========================================
-- STEP 6: Create/Update triggers
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_specialists_updated_at ON specialists;
CREATE TRIGGER update_specialists_updated_at 
  BEFORE UPDATE ON specialists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at 
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at 
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_applications_updated_at ON applications;
CREATE TRIGGER update_applications_updated_at 
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- STEP 7: Enable RLS
-- ========================================
ALTER TABLE specialists ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- ========================================
-- STEP 8: Create RLS policies
-- ========================================

-- Specialists policies
CREATE POLICY "Specialists are viewable by everyone" 
  ON specialists FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own specialist profile" 
  ON specialists FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own specialist profile" 
  ON specialists FOR UPDATE 
  USING (auth.uid() = id);

-- Companies policies
CREATE POLICY "Companies are viewable by everyone" 
  ON companies FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own company profile" 
  ON companies FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own company profile" 
  ON companies FOR UPDATE 
  USING (auth.uid() = id);

-- Projects policies
CREATE POLICY "Projects are viewable by everyone" 
  ON projects FOR SELECT 
  USING (true);

CREATE POLICY "Companies can insert their own projects" 
  ON projects FOR INSERT 
  WITH CHECK (auth.uid() = company_id);

CREATE POLICY "Companies can update their own projects" 
  ON projects FOR UPDATE 
  USING (auth.uid() = company_id);

CREATE POLICY "Companies can delete their own projects" 
  ON projects FOR DELETE 
  USING (auth.uid() = company_id);

-- Applications policies
CREATE POLICY "Applications are viewable by project owner and applicant" 
  ON applications FOR SELECT 
  USING (
    auth.uid() = specialist_id OR 
    auth.uid() IN (SELECT company_id FROM projects WHERE id = applications.project_id)
  );

CREATE POLICY "Specialists can insert their own applications" 
  ON applications FOR INSERT 
  WITH CHECK (auth.uid() = specialist_id);

CREATE POLICY "Project owners can update applications" 
  ON applications FOR UPDATE 
  USING (
    auth.uid() IN (SELECT company_id FROM projects WHERE id = applications.project_id)
  );

-- ========================================
-- STEP 9: Helper functions
-- ========================================
CREATE OR REPLACE FUNCTION get_project_applications_count(project_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*)::INTEGER FROM applications WHERE project_id = project_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- COMPLETED
-- ========================================
-- Migration completed successfully!
-- Existing data preserved, structure updated.

SELECT 'Migration completed!' as status;

