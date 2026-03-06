-- Memory performance indexes + Export contract cleanup

ALTER TABLE "MemoryExport" DROP COLUMN IF EXISTS "schema";

-- 向量检索索引（余弦）
CREATE INDEX IF NOT EXISTS "Memory_embedding_ivfflat_idx"
  ON "Memory"
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100)
  WHERE embedding IS NOT NULL;

-- 过滤索引
CREATE INDEX IF NOT EXISTS "Memory_metadata_gin_idx"
  ON "Memory"
  USING gin ("metadata" jsonb_path_ops);

CREATE INDEX IF NOT EXISTS "Memory_categories_gin_idx"
  ON "Memory"
  USING gin (categories);

CREATE INDEX IF NOT EXISTS "Memory_keywords_gin_idx"
  ON "Memory"
  USING gin (keywords);
