-- ============================================
-- Проверка текущего состояния RLS политик
-- ============================================

-- Проверяем, включен ли RLS для таблиц
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ ВКЛЮЧЕН'
    ELSE '❌ ВЫКЛЮЧЕН'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('specialists', 'projects', 'applications')
ORDER BY tablename;

-- Просмотр всех политик для важных таблиц
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,  -- SELECT, INSERT, UPDATE, DELETE
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('specialists', 'projects', 'applications')
ORDER BY tablename, cmd, policyname;

-- Проверяем конкретно политики для specialists
SELECT 
  'SPECIALISTS' as table_name,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NULL THEN '❌ НЕТ УСЛОВИЯ'
    ELSE '✅ ЕСТЬ УСЛОВИЕ'
  END as has_condition
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'specialists'
ORDER BY cmd, policyname;

-- Проверяем конкретно политики для projects
SELECT 
  'PROJECTS' as table_name,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NULL THEN '❌ НЕТ УСЛОВИЯ'
    ELSE '✅ ЕСТЬ УСЛОВИЕ'
  END as has_condition
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'projects'
ORDER BY cmd, policyname;

-- Проверяем конкретно политики для applications
SELECT 
  'APPLICATIONS' as table_name,
  policyname,
  cmd as operation,
  CASE 
    WHEN qual IS NULL THEN '❌ НЕТ УСЛОВИЯ'
    ELSE '✅ ЕСТЬ УСЛОВИЕ'
  END as has_condition
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'applications'
ORDER BY cmd, policyname;

