-- ============================================
-- Таблица: articles (статьи)
-- ============================================
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  excerpt TEXT DEFAULT '',
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Удаляем существующие политики (если есть) перед созданием новых
DROP POLICY IF EXISTS "articles_select_policy" ON articles;
DROP POLICY IF EXISTS "articles_insert_policy" ON articles;
DROP POLICY IF EXISTS "articles_update_policy" ON articles;
DROP POLICY IF EXISTS "articles_delete_policy" ON articles;

-- Политики доступа
-- Все могут просматривать статьи
CREATE POLICY "articles_select_policy"
  ON articles FOR SELECT
  USING (true);

-- Только авторизованные пользователи могут создавать статьи
CREATE POLICY "articles_insert_policy"
  ON articles FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Только автор статьи может обновлять свою статью
CREATE POLICY "articles_update_policy"
  ON articles FOR UPDATE
  USING (auth.uid() = author_id);

-- Только автор статьи может удалять свою статью
CREATE POLICY "articles_delete_policy"
  ON articles FOR DELETE
  USING (auth.uid() = author_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_articles_updated_at ON articles;
CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
