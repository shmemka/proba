-- ============================================
-- Миграция: Делаем поле email nullable в таблице specialists
-- ============================================
-- Это позволяет сохранять NULL вместо пустой строки,
-- когда пользователь выключает переключатель "Использовать почту для связи"
-- 
-- Проблема: 
-- - Поле email имеет UNIQUE NOT NULL constraint
-- - Если несколько пользователей выключат переключатель, все будут иметь пустую строку
-- - Это нарушит UNIQUE constraint
--
-- Решение:
-- - Делаем email nullable (убираем NOT NULL)
-- - Убираем UNIQUE constraint (email используется только для контакта, не для идентификации)
-- - В коде сохраняем NULL вместо пустой строки, если переключатель выключен

-- Шаг 1: Убираем UNIQUE constraint с email (если существует)
DO $$ 
BEGIN
  -- Проверяем и удаляем уникальный индекс, если он существует
  IF EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE tablename = 'specialists' 
    AND indexname = 'idx_specialists_email'
  ) THEN
    DROP INDEX IF EXISTS idx_specialists_email;
  END IF;
  
  -- Проверяем и удаляем уникальное ограничение, если оно существует
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE table_name = 'specialists' 
    AND constraint_name = 'specialists_email_key'
  ) THEN
    ALTER TABLE specialists DROP CONSTRAINT specialists_email_key;
  END IF;
END $$;

-- Шаг 2: Делаем поле email nullable
DO $$ 
BEGIN
  -- Проверяем, является ли поле NOT NULL
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'specialists' 
    AND column_name = 'email'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE specialists ALTER COLUMN email DROP NOT NULL;
  END IF;
END $$;

-- Шаг 3: Обновляем существующие пустые строки на NULL
UPDATE specialists 
SET email = NULL 
WHERE email = '';

-- Шаг 4: Создаем обычный (не уникальный) индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_specialists_email ON specialists(email) WHERE email IS NOT NULL;

-- Готово! ✅
-- Теперь поле email может быть NULL, что позволяет корректно обрабатывать
-- случай, когда пользователь выключает переключатель "Использовать почту для связи"

