import { useState } from 'react'

const EMOJI_OPTIONS = [
  '🚀', '💡', '🔥', '⚡', '🎯', '🧠', '🛠️', '🌊',
  '🎨', '🤝', '💎', '🌱', '🔮', '🎮', '🦾', '✨',
  '🐉', '🏗️', '📡', '🧬', '🪄', '🎲', '🦋', '🌀',
]

function Field({ label, error, hint, children, className = '' }) {
  return (
    <div className={`space-y-1 ${className}`}>
      <label className="block text-xs font-semibold uppercase tracking-widest text-white/40">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-white/25">{hint}</p>
      )}
    </div>
  )
}

function inputCls(hasError) {
  return [
    'w-full rounded-xl border bg-white/5 px-3 py-2.5 text-sm text-white',
    'placeholder-white/20 outline-none transition-colors',
    'focus:bg-white/10',
    hasError
      ? 'border-red-500/60 focus:border-red-400'
      : 'border-white/10 focus:border-white/30',
  ].join(' ')
}

export function VibeCardForm({ onSubmit, initial = {}, submitting = false }) {
  const [form, setForm] = useState({
    name:    initial.name    ?? '',
    emoji:   initial.emoji   ?? '🚀',
    project: initial.project ?? '',
    need:    initial.need    ?? '',
    offer:   initial.offer   ?? '',
    energy:  initial.energy  ?? 5,
  })
  const [errors, setErrors]           = useState({})
  const [emojiOpen, setEmojiOpen]     = useState(false)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim())    e.name    = 'Name is required'
    if (!form.project.trim()) e.project = 'What are you building?'
    if (form.need.trim().length < 10)            e.need    = `${10 - form.need.trim().length} more chars needed`
    if (form.offer.trim().length < 10)           e.offer   = `${10 - form.offer.trim().length} more chars needed`
    return e
  }

  function handleSubmit(ev) {
    ev.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSubmit({
      name:    form.name.trim(),
      emoji:   form.emoji,
      project: form.project.trim(),
      need:    form.need.trim(),
      offer:   form.offer.trim(),
      energy:  form.energy,
    })
  }

  const energyColor = form.energy <= 3
    ? 'text-blue-300'
    : form.energy <= 6
    ? 'text-white'
    : 'text-yellow-400'

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-5 backdrop-blur"
    >
      {/* Name + Emoji row */}
      <div className="flex gap-3 items-end">
        {/* Emoji picker */}
        <div className="space-y-1 shrink-0">
          <label className="block text-xs font-semibold uppercase tracking-widest text-white/40">
            Vibe
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setEmojiOpen(o => !o)}
              className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl transition-colors hover:bg-white/10 focus:outline-none focus:border-white/30"
            >
              {form.emoji}
            </button>
            {emojiOpen && (
              <div className="absolute top-full left-0 z-10 mt-1 w-52 grid grid-cols-6 gap-1 rounded-xl border border-white/10 bg-zinc-900/95 p-2 backdrop-blur shadow-xl">
                {EMOJI_OPTIONS.map(e => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => { set('emoji', e); setEmojiOpen(false) }}
                    className={[
                      'flex h-7 w-7 items-center justify-center rounded-lg text-base transition-colors',
                      form.emoji === e
                        ? 'bg-yellow-400/20 ring-1 ring-yellow-400/50'
                        : 'hover:bg-white/10',
                    ].join(' ')}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <Field label="Name" error={errors.name} className="flex-1 min-w-0">
          <input
            className={inputCls(!!errors.name)}
            placeholder="Your name"
            value={form.name}
            maxLength={80}
            onChange={e => set('name', e.target.value)}
          />
        </Field>
      </div>

      {/* Project */}
      <Field label="What are you building?" error={errors.project}>
        <input
          className={inputCls(!!errors.project)}
          placeholder="One line pitch"
          maxLength={200}
          value={form.project}
          onChange={e => set('project', e.target.value)}
        />
      </Field>

      {/* Need */}
      <Field
        label="What do you need?"
        error={errors.need}
        hint={form.need.length > 0 ? `${form.need.length} chars` : 'min 10 characters'}
      >
        <textarea
          className={inputCls(!!errors.need) + ' resize-none'}
          rows={2}
          placeholder="e.g. a designer who can make it not look like this"
          maxLength={400}
          value={form.need}
          onChange={e => set('need', e.target.value)}
        />
      </Field>

      {/* Offer */}
      <Field
        label="What do you offer?"
        error={errors.offer}
        hint={form.offer.length > 0 ? `${form.offer.length} chars` : 'min 10 characters'}
      >
        <textarea
          className={inputCls(!!errors.offer) + ' resize-none'}
          rows={2}
          placeholder="e.g. backend wizardry and strong opinions on API design"
          maxLength={400}
          value={form.offer}
          onChange={e => set('offer', e.target.value)}
        />
      </Field>

      {/* Energy slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-widest text-white/40">
            Energy level
          </label>
          <span className={`text-sm font-bold tabular-nums transition-colors ${energyColor}`}>
            {form.energy} / 10
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={form.energy}
          onChange={e => set('energy', Number(e.target.value))}
          className="w-full cursor-pointer accent-yellow-400"
          style={{ accentColor: form.energy >= 7 ? '#facc15' : form.energy >= 4 ? '#ffffff' : '#93c5fd' }}
        />
        <div className="flex justify-between text-xs text-white/25">
          <span>chill 🌙</span>
          <span>HYPE ⚡</span>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className={[
          'w-full rounded-xl py-3 text-sm font-bold transition-opacity',
          submitting
            ? 'opacity-50 cursor-not-allowed bg-white/10 text-white'
            : 'bg-yellow-400 text-black hover:opacity-90 active:scale-[0.98]',
        ].join(' ')}
      >
        {submitting ? 'Saving…' : 'Drop My Card 🎯'}
      </button>
    </form>
  )
}
