import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Slider } from './ui/slider'

export function VibeCardForm({ onSubmit, initial = {}, submitting = false }) {
  const [form, setForm] = useState({
    name:     initial.name     ?? '',
    emoji:    initial.emoji    ?? '👋',
    pin:      initial.pin      ?? '',
    project:  initial.project  ?? '',
    need:     initial.need     ?? '',
    offer:    initial.offer    ?? '',
    energy:   initial.energy   ?? 5,
    linkedin: initial.linkedin ?? '',
  })
  const [errors, setErrors]       = useState({})
  const [emojiOpen, setEmojiOpen] = useState(false)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim())            e.name    = 'Name is required'
    if (!/^\d{4}$/.test(form.pin))    e.pin     = 'Must be exactly 4 digits'
    if (!form.project.trim())         e.project = 'What are you building?'
    if (form.need.trim().length < 10) e.need    = `${10 - form.need.trim().length} more chars needed`
    if (form.offer.trim().length < 10) e.offer  = `${10 - form.offer.trim().length} more chars needed`
    return e
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSubmit({
      name:     form.name.trim(),
      emoji:    form.emoji,
      pin:      form.pin,
      project:  form.project.trim(),
      need:     form.need.trim(),
      offer:    form.offer.trim(),
      energy:   form.energy,
      linkedin: form.linkedin.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="space-y-6">
          {/* Name */}
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Alex Chen"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              maxLength={80}
              className="mt-2 bg-white/5 border-white/10 rounded-2xl"
            />
            {errors.name && <p className="text-destructive text-sm mt-2">{errors.name}</p>}
          </div>

          {/* Emoji Picker */}
          <div className="relative">
            <Label>Your Emoji</Label>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEmojiOpen(o => !o)}
              className="mt-2 w-full justify-start bg-white/5 border-white/10 rounded-2xl hover:bg-white/10"
            >
              <span className="text-3xl mr-2">{form.emoji}</span>
              <span className="text-muted-foreground">Click to change</span>
            </Button>
            {emojiOpen && (
              <div className="absolute z-50 mt-2 left-0">
                <EmojiPicker
                  onEmojiClick={(emojiData) => { set('emoji', emojiData.emoji); setEmojiOpen(false) }}
                  theme="dark"
                  width={320}
                  height={400}
                />
              </div>
            )}
          </div>

          {/* PIN */}
          <div>
            <Label htmlFor="pin">4-Digit PIN (to reclaim your card later)</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              placeholder="****"
              value={form.pin}
              onChange={(e) => set('pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              className="mt-2 bg-white/5 border-white/10 rounded-2xl font-mono text-lg tracking-wider"
            />
            {errors.pin && <p className="text-destructive text-sm mt-2">{errors.pin}</p>}
          </div>

          {/* Project Description */}
          <div>
            <Label htmlFor="project">What are you building?</Label>
            <Textarea
              id="project"
              placeholder="AI-powered recipe app that turns your fridge into a personal chef"
              value={form.project}
              onChange={(e) => set('project', e.target.value)}
              rows={3}
              maxLength={200}
              className="mt-2 bg-white/5 border-white/10 rounded-2xl resize-none"
            />
            {errors.project && <p className="text-destructive text-sm mt-2">{errors.project}</p>}
          </div>

          {/* I need */}
          <div>
            <Label htmlFor="need">I need...</Label>
            <Textarea
              id="need"
              placeholder="A backend wizard, design feedback, someone who knows React Native"
              value={form.need}
              onChange={(e) => set('need', e.target.value)}
              rows={2}
              maxLength={400}
              className="mt-2 bg-white/5 border-white/10 rounded-2xl resize-none"
            />
            {errors.need && <p className="text-destructive text-sm mt-2">{errors.need}</p>}
            {!errors.need && form.need.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{form.need.length} chars</p>
            )}
          </div>

          {/* I offer */}
          <div>
            <Label htmlFor="offer">I offer...</Label>
            <Textarea
              id="offer"
              placeholder="Frontend skills, UX expertise, can explain blockchain without putting you to sleep"
              value={form.offer}
              onChange={(e) => set('offer', e.target.value)}
              rows={2}
              maxLength={400}
              className="mt-2 bg-white/5 border-white/10 rounded-2xl resize-none"
            />
            {errors.offer && <p className="text-destructive text-sm mt-2">{errors.offer}</p>}
            {!errors.offer && form.offer.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{form.offer.length} chars</p>
            )}
          </div>

          {/* Energy Slider */}
          <div>
            <Label>Energy Level: {form.energy}/10</Label>
            <Slider
              value={[form.energy]}
              onValueChange={(value) => set('energy', value[0])}
              min={1}
              max={10}
              step={1}
              className="mt-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>Chill</span>
              <span>HYPED</span>
            </div>
          </div>

          {/* LinkedIn */}
          <div>
            <Label htmlFor="linkedin">LinkedIn (optional)</Label>
            <Input
              id="linkedin"
              placeholder="https://linkedin.com/in/yourname"
              value={form.linkedin}
              onChange={(e) => set('linkedin', e.target.value)}
              maxLength={200}
              className="mt-2 bg-white/5 border-white/10 rounded-2xl"
            />
            <p className="text-xs text-muted-foreground mt-1">So your matches can connect with you</p>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold rounded-2xl py-6 text-lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {submitting ? 'Saving...' : 'Enter Room'}
          </Button>
        </div>

        {/* Card Preview */}
        <div>
          <div className="sticky top-24">
            <h3 className="font-bold text-lg mb-4">Preview</h3>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-primary/50 transition-all">
              <div className="flex items-start gap-4 mb-4">
                <div className="text-5xl">{form.emoji}</div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl">{form.name || 'Your Name'}</h3>
                  <p className="text-muted-foreground text-sm">Energy: {form.energy}/10</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Building:</p>
                  <p className="text-sm">{form.project || 'Your project description...'}</p>
                </div>

                {form.need && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Need:</p>
                    <p className="text-sm">{form.need}</p>
                  </div>
                )}

                {form.offer && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Offer:</p>
                    <p className="text-sm">{form.offer}</p>
                  </div>
                )}

                <div className="pt-3">
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${form.energy * 10}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}
