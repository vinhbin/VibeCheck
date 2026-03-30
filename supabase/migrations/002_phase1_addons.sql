-- Phase 1 Addons: favorite_song, custom_prompt_response, roles
-- favorite_song + custom_prompt_response: display/personality fields, no matching effect
-- roles: "I am..." complement to looking_for — appended to offer_embedding for cross-intent matching

ALTER TABLE vibe_cards ADD COLUMN IF NOT EXISTS favorite_song          TEXT;
ALTER TABLE vibe_cards ADD COLUMN IF NOT EXISTS custom_prompt_response TEXT;
ALTER TABLE vibe_cards ADD COLUMN IF NOT EXISTS roles                  JSONB DEFAULT '[]';
