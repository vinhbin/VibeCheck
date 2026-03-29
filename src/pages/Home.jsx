import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Zap, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../lib/supabase'
import { safeStore, safeGet } from '../lib/storage'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

// ---------------------------------------------------------------------------
// Helpers (exported so CreateCard can reuse joinEvent)
// ---------------------------------------------------------------------------

function generateRoomCode() {
  return Math.random().toString(36).padEnd(9, '0').slice(2, 8).toUpperCase()
}

export async function createEvent(name, { discord_url, organizer_linkedin } = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateRoomCode()
    const row = { name, code }
    if (discord_url) row.discord_url = discord_url
    if (organizer_linkedin) row.organizer_linkedin = organizer_linkedin
    const { data, error } = await supabase
      .from('events')
      .insert(row)
      .select()
      .single()
    if (!error) return data
    if (error.code !== '23505') throw error
  }
  throw new Error('Failed to generate unique room code after 3 attempts')
}

export async function joinEvent(rawCode, setError, navigate) {
  const code = rawCode.trim().toUpperCase()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('code', code)
    .single()

  if (!event) return setError('Room not found.')
  if (new Date(event.expires_at) < new Date()) return setError('This event has ended.')

  const storedEventId = safeGet('my_event_id')
  const storedCardId  = safeGet('my_card_id')
  if (storedEventId === event.id && storedCardId) {
    return navigate(`/room/${event.id}`)
  }

  const { count } = await supabase
    .from('vibe_cards')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)

  if (count >= event.max_cards) return setError('This room is full.')

  navigate(`/create/${event.id}`)
}

async function reclaimCard(code, pin, setError, navigate) {
  const normalCode = code.trim().toUpperCase()

  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('code', normalCode)
    .single()

  if (!event) return setError('Room not found.')

  const { data: card } = await supabase
    .from('vibe_cards')
    .select('id')
    .eq('event_id', event.id)
    .eq('pin', pin)
    .maybeSingle()

  if (!card) return setError('No card found with that PIN.')

  safeStore('my_card_id', card.id)
  safeStore('my_event_id', event.id)
  navigate(`/room/${event.id}`)
}

// ---------------------------------------------------------------------------
// Home page
// ---------------------------------------------------------------------------
export default function Home() {
  const { code: urlCode } = useParams()
  const [searchParams]    = useSearchParams()
  const navigate          = useNavigate()
  const [error, setError] = useState(null)
  const [busy, setBusy]   = useState(false)

  const defaultTab = searchParams.get('tab') || 'join'

  // Join state
  const [joinCode, setJoinCode] = useState(urlCode ?? '')

  // Create state
  const [eventName, setEventName]       = useState('')
  const [discordUrl, setDiscordUrl]     = useState('')
  const [orgLinkedin, setOrgLinkedin]   = useState('')

  // Reclaim state
  const [reclaimCode, setReclaimCode] = useState('')
  const [reclaimPin,  setReclaimPin]  = useState('')

  // Auto-submit on /join/:code deep-link
  useEffect(() => {
    if (!urlCode) return
    setBusy(true)
    joinEvent(urlCode, setError, navigate).finally(() => setBusy(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function clearError() { setError(null) }

  async function handleJoin(e) {
    e.preventDefault()
    if (!joinCode.trim()) { setError('Enter a room code.'); return }
    clearError()
    setBusy(true)
    await joinEvent(joinCode, setError, navigate)
    setBusy(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!eventName.trim()) { setError('Give your event a name.'); return }
    clearError()
    setBusy(true)
    try {
      const event = await createEvent(eventName.trim(), {
        discord_url: discordUrl.trim() || undefined,
        organizer_linkedin: orgLinkedin.trim() || undefined,
      })
      toast.success(`Room ${event.code} created!`)
      navigate(`/create/${event.id}`, { state: { roomCode: event.code } })
    } catch {
      setError('Failed to create room. Try again.')
      setBusy(false)
    }
  }

  async function handleReclaim(e) {
    e.preventDefault()
    if (!reclaimCode.trim() || !reclaimPin.trim()) { setError('Fill in both fields.'); return }
    clearError()
    setBusy(true)
    await reclaimCard(reclaimCode, reclaimPin, setError, navigate)
    setBusy(false)
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center max-w-4xl">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 hover:text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Back</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
                <Zap className="w-7 h-7 text-primary-foreground" fill="currentColor" />
              </div>
            </div>
            <h1 className="text-3xl font-black mb-2">Welcome to VibeCheck</h1>
            <p className="text-muted-foreground">Join a room, create one, or reclaim your card</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Tabbed Card */}
          <Tabs defaultValue={defaultTab} className="w-full" onValueChange={clearError}>
            <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/10 rounded-2xl p-1">
              <TabsTrigger
                value="join"
                className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold"
              >
                Join
              </TabsTrigger>
              <TabsTrigger
                value="create"
                className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold"
              >
                Create
              </TabsTrigger>
              <TabsTrigger
                value="reclaim"
                className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold"
              >
                Reclaim
              </TabsTrigger>
            </TabsList>

            {/* Join Tab */}
            <TabsContent value="join" className="mt-6">
              <form onSubmit={handleJoin} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <div>
                  <Label htmlFor="joinCode">Room Code</Label>
                  <Input
                    id="joinCode"
                    placeholder="ABC123"
                    value={joinCode}
                    onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); clearError() }}
                    maxLength={6}
                    className="mt-2 bg-white/5 border-white/10 rounded-2xl text-lg font-mono uppercase tracking-wider"
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-2xl py-6"
                >
                  {busy ? 'Joining...' : 'Join Room'}
                </Button>
              </form>
            </TabsContent>

            {/* Create Tab */}
            <TabsContent value="create" className="mt-6">
              <form onSubmit={handleCreate} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <div>
                  <Label htmlFor="eventName">Event Name</Label>
                  <Input
                    id="eventName"
                    placeholder="Tech Meetup 2026"
                    value={eventName}
                    onChange={(e) => { setEventName(e.target.value); clearError() }}
                    maxLength={80}
                    className="mt-2 bg-white/5 border-white/10 rounded-2xl"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="discordUrl">Discord Invite (optional)</Label>
                  <Input
                    id="discordUrl"
                    placeholder="https://discord.gg/your-invite"
                    value={discordUrl}
                    onChange={(e) => setDiscordUrl(e.target.value)}
                    maxLength={200}
                    className="mt-2 bg-white/5 border-white/10 rounded-2xl"
                  />
                </div>
                <div>
                  <Label htmlFor="orgLinkedin">Organizer LinkedIn (optional)</Label>
                  <Input
                    id="orgLinkedin"
                    placeholder="https://linkedin.com/in/organizer"
                    value={orgLinkedin}
                    onChange={(e) => setOrgLinkedin(e.target.value)}
                    maxLength={200}
                    className="mt-2 bg-white/5 border-white/10 rounded-2xl"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-2xl py-6"
                >
                  {busy ? 'Creating...' : 'Create Room'}
                </Button>
              </form>
            </TabsContent>

            {/* Reclaim Tab */}
            <TabsContent value="reclaim" className="mt-6">
              <form onSubmit={handleReclaim} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                <div>
                  <Label htmlFor="reclaimCode">Room Code</Label>
                  <Input
                    id="reclaimCode"
                    placeholder="ABC123"
                    value={reclaimCode}
                    onChange={(e) => { setReclaimCode(e.target.value.toUpperCase()); clearError() }}
                    maxLength={6}
                    className="mt-2 bg-white/5 border-white/10 rounded-2xl text-lg font-mono uppercase tracking-wider"
                    autoFocus
                  />
                </div>
                <div>
                  <Label htmlFor="reclaimPin">4-Digit PIN</Label>
                  <Input
                    id="reclaimPin"
                    type="password"
                    placeholder="****"
                    value={reclaimPin}
                    onChange={(e) => { setReclaimPin(e.target.value.replace(/\D/g, '').slice(0, 4)); clearError() }}
                    maxLength={4}
                    className="mt-2 bg-white/5 border-white/10 rounded-2xl text-lg font-mono tracking-wider"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Use this if you switched browsers or cleared your session.
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-2xl py-6"
                >
                  {busy ? 'Looking up...' : 'Reclaim Card'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
