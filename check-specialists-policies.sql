-- Проверка политик для таблицы SPECIALISTS
SELECT 
  'SPECIALISTS' as table_name,
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression,
  CASE 
    WHEN cmd = 'SELECT' AND qual IS NULL THEN '❌ КРИТИЧНО: Нет условия для SELECT'
    WHEN cmd = 'INSERT' AND with_check IS NULL THEN '❌ КРИТИЧНО: Нет условия для INSERT'
    WHEN cmd = 'UPDATE' AND qual IS NULL THEN '❌ КРИТИЧНО: Нет условия для UPDATE'
    ELSE '✅ OK'
  END as status
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'specialists'
ORDER BY cmd, policyname;

-- Проверяем, включен ли RLS для specialists
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS ВКЛЮЧЕН'
    ELSE '❌ RLS ВЫКЛЮЧЕН - ЭТО ПРОБЛЕМА!'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'specialists';

-- Проверяем общее количество политик для specialists
SELECT 
  COUNT(*) as total_policies,
  COUNT(*) FILTER (WHERE cmd = 'SELECT') as select_policies,
  COUNT(*) FILTER (WHERE cmd = 'INSERT') as insert_policies,
  COUNT(*) FILTER (WHERE cmd = 'UPDATE') as update_policies
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'specialists';

