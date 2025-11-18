-- ============================================
-- Проверка структуры после перехода на user_id
-- ============================================
-- Используйте этот файл, чтобы убедиться, что база данных
-- соответствует актуальной архитектуре (без таблицы companies)

-- 1. Проверяем, что в projects есть колонка user_id
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name = 'user_id';

-- 2. Убеждаемся, что колонка company_id отсутствует
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name = 'company_id';

-- 3. Проверяем, что таблицы companies больше нет
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'companies';

-- 4. Проверяем колонку portfolio_preview в specialists
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'specialists'
  AND column_name = 'portfolio_preview';

-- 5. Смотрим актуальные политики RLS для projects и applications
SELECT 
  tablename,
  policyname,
  cmd AS command,
  qual AS using_expression
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('projects', 'applications')
ORDER BY tablename, policyname;

-- Если какие-то запросы не возвращают строк:
-- - выполните supabase-migrate-to-user-id.sql для миграции company_id -> user_id
-- - запустите supabase-migration.sql для чистой установки
-- - выполните supabase-update-for-tasks.sql, чтобы гарантировать актуальные RLS-политики

