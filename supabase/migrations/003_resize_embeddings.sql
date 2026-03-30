-- Resize embedding columns from vector(768) to vector(3072)
-- Required because gemini-embedding-001 (the available model) outputs 3072 dims.
-- Safe to run: no existing rows have embeddings populated.

DROP INDEX IF EXISTS idx_offer_embedding;

ALTER TABLE vibe_cards
  ALTER COLUMN need_embedding  TYPE vector(3072),
  ALTER COLUMN offer_embedding TYPE vector(3072);

CREATE INDEX idx_offer_embedding ON vibe_cards USING hnsw (offer_embedding vector_cosine_ops);

-- Re-create match_cards with the correct vector size
CREATE OR REPLACE FUNCTION match_cards(
  query_embedding vector(3072),
  p_event_id      uuid,
  exclude_card_id uuid,
  match_count     int DEFAULT 3
)
RETURNS TABLE (id uuid, similarity float)
LANGUAGE sql AS $$
  SELECT
    id,
    1 - (offer_embedding <=> query_embedding) AS similarity
  FROM vibe_cards
  WHERE
    event_id        = p_event_id
    AND id          <> exclude_card_id
    AND offer_embedding IS NOT NULL
  ORDER BY offer_embedding <=> query_embedding
  LIMIT match_count;
$$;
