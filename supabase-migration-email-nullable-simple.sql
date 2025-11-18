-- ============================================
-- Миграция: Делаем поле email nullable в таблице specialists
-- ============================================
-- ВАЖНО: Скопируйте и выполните ТОЛЬКО этот SQL-код в Supabase SQL Editor
-- НЕ копируйте TypeScript код из других файлов!

-- Шаг 1: Убираем UNIQUE constraint с email
ALTER TABLE specialists DROP CONSTRAINT IF EXISTS specialists_email_key;
DROP INDEX IF EXISTS idx_specialists_email;

-- Шаг 2: Делаем поле email nullable
ALTER TABLE specialists ALTER COLUMN email DROP NOT NULL;

-- Шаг 3: Обновляем существующие пустые строки на NULL
UPDATE specialists SET email = NULL WHERE email = '';

-- Шаг 4: Создаем обычный (не уникальный) индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_specialists_email ON specialists(email) WHERE email IS NOT NULL;

-- Готово! ✅

