import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://fbjmjrsujakfykktpsij.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiam1qcnN1amFrZnlra3Rwc2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MjAyMjMsImV4cCI6MjA5MDI5NjIyM30.5xLLocdaPi_wbioZfWjTlC2bFDGlMyIJDWWrcaMnITM'
)

// --- Find the room ---
const { data: event, error: eventErr } = await supabase
  .from('events')
  .select('id, name, code')
  .eq('code', 'DKI4YM')
  .single()

if (eventErr || !event) {
  console.error('Room not found:', eventErr)
  process.exit(1)
}
console.log(`Found room: ${event.name} (${event.code}) — ${event.id}`)

// --- Fake profiles covering all Phase 1 features ---
const fakeCards = [
  {
    name: 'Maya Patel',
    emoji: '🚀',
    pin: '1111',
    project: 'AI-powered legal doc summarizer for small businesses',
    need: 'Frontend engineer to build the dashboard, someone who knows React and data viz',
    offer: 'Full-stack background, deep ML/NLP experience, happy to mentor on model fine-tuning',
    energy: 8,
    linkedin: 'mayapatel',
    instagram: 'maya.builds',
    looking_for: ['co-founder', 'collaborator'],
    roles: ['mentor', 'investor'],
    favorite_song: 'Kendrick Lamar — HUMBLE.',
  },
  {
    name: 'Jordan Lee',
    emoji: '🎨',
    pin: '2222',
    project: 'Design system and component library for early-stage startups',
    need: 'A technical co-founder who can handle infra and backend, ideally someone with SaaS experience',
    offer: 'Product design, brand identity, Figma wizardry, can ship pixel-perfect UIs fast',
    energy: 6,
    linkedin: 'jordanlee-design',
    instagram: 'jordan.ux',
    looking_for: ['co-founder', 'hiring'],
    roles: ['collaborator', 'friends'],
    favorite_song: 'Frank Ocean — Nights',
  },
  {
    name: 'Sam Torres',
    emoji: '💡',
    pin: '3333',
    project: 'Climate fintech — carbon credit marketplace for SMEs',
    need: 'Regulatory and legal advisor, also looking for a growth/marketing person who gets B2B',
    offer: '10 years in finance, strong network in ESG investing circles, previously exited a fintech startup',
    energy: 7,
    linkedin: 'samtorres-fintech',
    instagram: null,
    looking_for: ['mentor', 'investor'],
    roles: ['co-founder', 'investor'],
  },
  {
    name: 'Alex Kim',
    emoji: '🛠️',
    pin: '4444',
    project: 'Dev tooling — automated code review bot trained on your own codebase',
    need: 'Go-to-market help, someone who can talk to developer teams and close early design partners',
    offer: 'Principal engineer background, built and scaled infra at two YC companies, open source contributor',
    energy: 5,
    linkedin: 'alexkim-eng',
    instagram: 'alex.codes',
    looking_for: ['collaborator', 'hiring'],
    roles: ['mentor', 'co-founder'],
  },
  {
    name: 'Priya Sharma',
    emoji: '📊',
    pin: '5555',
    project: 'Healthcare analytics dashboard for independent clinics',
    need: 'iOS/mobile developer and someone with healthcare compliance knowledge (HIPAA etc)',
    offer: 'Data science and visualization, 5 years in health-tech, can navigate EMR integrations',
    energy: 4,
    linkedin: null,
    instagram: 'priya.data',
    looking_for: ['collaborator', 'learning'],
    roles: ['learning', 'friends'],
    favorite_song: 'Childish Gambino — Redbone',
  },
  {
    name: 'Chris Nakamura',
    emoji: '🎯',
    pin: '6666',
    project: 'Job board specifically for remote roles at climate and social impact startups',
    need: 'Engineering help to scale the platform, currently hitting bottlenecks with job matching algorithm',
    offer: 'Product and growth chops, ran growth at two Series A startups, strong content marketing background',
    energy: 9,
    linkedin: 'chrisnakamura',
    instagram: 'chris.growth',
    looking_for: ['hiring', 'co-founder'],
    roles: ['collaborator', 'mentor'],
    favorite_song: 'The Weeknd — Blinding Lights',
  },
]

// --- Insert cards ---
let inserted = 0
for (const card of fakeCards) {
  const { data, error } = await supabase
    .from('vibe_cards')
    .insert({ event_id: event.id, ...card })
    .select('id, name')
    .single()

  if (error) {
    console.error(`  ✗ ${card.name}:`, error.message)
  } else {
    console.log(`  ✓ ${data.name} (${data.id})`)
    inserted++
  }
}

console.log(`\nDone — ${inserted}/${fakeCards.length} cards inserted into room ${event.code}`)
