-- Phase 1 Migration: Add contact info, event description/extras, and looking_for tags
-- Run this in Supabase SQL Editor against your project

-- 1. Contact fields on vibe_cards
ALTER TABLE vibe_cards ADD COLUMN IF NOT EXISTS linkedin  TEXT;
ALTER TABLE vibe_cards ADD COLUMN IF NOT EXISTS instagram TEXT;

-- 2. Event description and organizer-configured extras
ALTER TABLE events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS extras      JSONB DEFAULT '{"looking_for": true}';

-- 3. Looking-for tags on vibe_cards (JSONB for consistency with snapshots)
ALTER TABLE vibe_cards ADD COLUMN IF NOT EXISTS looking_for JSONB DEFAULT '[]';

-- 4. Update event RLS to allow organizers to update their events
DO $$ BEGIN
  CREATE POLICY "events_update" ON events FOR UPDATE USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
