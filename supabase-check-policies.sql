-- ============================================
-- Проверка политик RLS для функционала задач
-- ============================================
-- Этот скрипт проверяет наличие необходимых политик
-- Если все политики уже существуют, ничего делать не нужно

-- Проверяем политики для specialists
SELECT 
  'specialists' as table_name,
  policyname,
  cmd as command
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'specialists'
ORDER BY policyname;

-- Проверяем политики для applications
SELECT 
  'applications' as table_name,
  policyname,
  cmd as command
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'applications'
ORDER BY policyname;

-- Проверяем политики для projects
SELECT 
  'projects' as table_name,
  policyname,
  cmd as command
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'projects'
ORDER BY policyname;

-- ============================================
-- Если все политики на месте, ничего делать не нужно
-- Если какой-то политики нет, выполните основной скрипт миграции
-- ============================================

