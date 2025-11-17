-- ============================================
-- Добавление поля avatar_url в таблицу specialists
-- ============================================
-- Этот скрипт добавляет поле avatar_url, если оно еще не существует
-- Используйте этот скрипт, если таблица specialists уже создана

-- Проверяем, существует ли колонка, и добавляем её, если нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'specialists' 
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE specialists ADD COLUMN avatar_url TEXT DEFAULT '';
  END IF;
END $$;

-- Готово! ✅

