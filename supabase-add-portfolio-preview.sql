-- ============================================
-- Добавление поля portfolio_preview в таблицу specialists
-- ============================================
-- Этот скрипт добавляет поле portfolio_preview, если оно еще не существует
-- Используйте этот скрипт, если таблица specialists уже создана

-- Проверяем, существует ли колонка, и добавляем её, если нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'specialists' 
    AND column_name = 'portfolio_preview'
  ) THEN
    ALTER TABLE specialists ADD COLUMN portfolio_preview TEXT[] DEFAULT '{}'::text[];
    RAISE NOTICE 'Добавлена колонка portfolio_preview';
  ELSE
    RAISE NOTICE 'Колонка portfolio_preview уже существует';
  END IF;
END $$;

-- Готово! ✅

