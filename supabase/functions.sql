-- Enable vector extension for semantic matching
CREATE EXTENSION IF NOT EXISTS vector;

-- Enum prevents invalid status values at the DB layer
CREATE TYPE match_status AS ENUM ('pending', 'accepted', 'declined');

CREATE TABLE events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  code        TEXT        UNIQUE NOT NULL,
  max_cards   INT         DEFAULT 200,
  expires_at  TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vibe_cards (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID        REFERENCES events(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  emoji           TEXT        NOT NULL,
  pin             CHAR(4)     NOT NULL,
  project         TEXT        NOT NULL,
  need            TEXT        NOT NULL CHECK (char_length(need) >= 10),
  offer           TEXT        NOT NULL CHECK (char_length(offer) >= 10),
  energy          INT         DEFAULT 5 CHECK (energy BETWEEN 1 AND 10),
  need_embedding  vector(768),
  offer_embedding vector(768),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vibe_cards_event_id ON vibe_cards(event_id);
CREATE INDEX idx_offer_embedding ON vibe_cards USING hnsw (offer_embedding vector_cosine_ops);

CREATE TABLE matches (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  card_a         UUID        REFERENCES vibe_cards(id) ON DELETE CASCADE,
  card_b         UUID        REFERENCES vibe_cards(id) ON DELETE CASCADE,
  initiator_card UUID,
  card_a_snapshot JSONB,
  card_b_snapshot JSONB,
  icebreaker     TEXT,
  status         match_status DEFAULT 'pending',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_match  UNIQUE (LEAST(card_a::text, card_b::text), GREATEST(card_a::text, card_b::text)),
  CONSTRAINT no_self_match CHECK  (card_a <> card_b)
);

CREATE TABLE failed_embeds (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id    UUID        REFERENCES vibe_cards(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE vibe_cards    ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_embeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_read"    ON events      FOR SELECT USING (true);
CREATE POLICY "events_insert"  ON events      FOR INSERT WITH CHECK (true);

CREATE POLICY "cards_read"     ON vibe_cards  FOR SELECT USING (true);
CREATE POLICY "cards_insert"   ON vibe_cards  FOR INSERT WITH CHECK (true);
CREATE POLICY "cards_update"   ON vibe_cards  FOR UPDATE USING (true);
CREATE POLICY "cards_delete"   ON vibe_cards  FOR DELETE USING (true);

CREATE POLICY "matches_read"   ON matches     FOR SELECT USING (true);
CREATE POLICY "matches_insert" ON matches     FOR INSERT WITH CHECK (true);
CREATE POLICY "matches_update" ON matches     FOR UPDATE USING (true);

CREATE POLICY "embeds_insert"  ON failed_embeds FOR INSERT WITH CHECK (true);
CREATE POLICY "embeds_delete"  ON failed_embeds FOR DELETE USING (true);

-- ---------------------------------------------------------------------------
-- Functions + triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION check_room_capacity() RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM vibe_cards WHERE event_id = NEW.event_id)
     >= (SELECT max_cards FROM events WHERE id = NEW.event_id) THEN
    RAISE EXCEPTION 'room_full';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_room_capacity
  BEFORE INSERT ON vibe_cards
  FOR EACH ROW EXECUTE FUNCTION check_room_capacity();

CREATE OR REPLACE FUNCTION match_cards(
  query_embedding vector(768),
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
