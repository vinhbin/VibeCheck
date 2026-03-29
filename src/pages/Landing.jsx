import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const FEATURES = [
  { emoji: '🎴', title: 'Drop Your Card', desc: 'Share your name, project, what you need, and what you bring to the table. Your vibe card is your hackathon identity.' },
  { emoji: '🤖', title: 'AI-Powered Matching', desc: 'Our semantic engine uses vector embeddings to find people whose offers match your needs — no more random intros.' },
  { emoji: '🎯', title: 'Shoot Your Shot', desc: 'Pick a vibe — hype, roast, philosopher, or investor — and let AI craft a personalized icebreaker to kick things off.' },
  { emoji: '⚡', title: 'Real-Time Room', desc: 'See everyone in the room live. Cards appear instantly as people join. Filter by energy level to find the most active builders.' },
  { emoji: '🔗', title: 'Instant Connections', desc: 'Get notified the moment someone shoots their shot at you. Accept, connect, and export contacts as vCards.' },
  { emoji: '📲', title: 'QR Code Sharing', desc: 'Share your room with a single scan. No app downloads, no sign-ups — just open the link and drop your card.' },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Create or join a room', desc: 'The organizer creates a room and shares the code or QR. Attendees join in seconds.' },
  { step: '02', title: 'Fill out your vibe card', desc: 'Tell us your name, project, what you need help with, and what skills you offer.' },
  { step: '03', title: 'Browse & get suggestions', desc: 'AI analyzes everyone\'s cards and surfaces your best matches based on complementary needs and offers.' },
  { step: '04', title: 'Shoot your shot', desc: 'Tap someone\'s card, pick a personality, and send an AI-generated icebreaker. They\'ll get notified instantly.' },
]

const PERSONALITIES = [
  { key: 'hype', emoji: '🔥', label: 'Hype', desc: 'Over-the-top excitement about your collab potential', color: 'from-orange-500/20 to-red-500/20 border-orange-500/30' },
  { key: 'roast', emoji: '😤', label: 'Roast', desc: 'Playful teasing that makes you both laugh', color: 'from-pink-500/20 to-purple-500/20 border-pink-500/30' },
  { key: 'philosopher', emoji: '🧠', label: 'Philosopher', desc: 'Deep, slightly absurd insights connecting your work', color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30' },
  { key: 'investor', emoji: '📈', label: 'Investor', desc: '90s infomercial energy pitching why you MUST meet', color: 'from-green-500/20 to-emerald-500/20 border-green-500/30' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.1 } }),
}

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-hidden">

      {/* ── Nav ── */}
      <nav className="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <p className="font-black text-lg tracking-tight">Vibe<span className="text-yellow-400">Check</span></p>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/enter')}
              className="text-xs font-bold text-white/60 hover:text-white px-4 py-2 rounded-xl transition"
            >
              Join Room
            </button>
            <button
              onClick={() => navigate('/enter?tab=create')}
              className="text-xs font-bold bg-yellow-400 text-black px-4 py-2 rounded-xl hover:bg-yellow-300 transition"
            >
              Create Room
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 pt-16">
        {/* Animated glows */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-yellow-400/8 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative text-center space-y-6 max-w-2xl"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-block bg-yellow-400/10 border border-yellow-400/20 rounded-full px-4 py-1.5 text-xs font-bold text-yellow-400 mb-2"
          >
            Built for hackathons & events
          </motion.div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9]">
            Stop Awkward<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-400">
              Networking
            </span>
          </h1>

          <p className="text-base sm:text-xl text-white/50 leading-relaxed max-w-lg mx-auto">
            Drop your vibe card, let AI find your perfect matches, and shoot your shot with a personalized icebreaker.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/enter')}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-10 py-4 rounded-2xl text-sm transition-colors shadow-lg shadow-yellow-400/20"
            >
              Join a Room
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/enter?tab=create')}
              className="border border-white/20 hover:border-white/40 hover:bg-white/5 text-white font-bold px-10 py-4 rounded-2xl text-sm transition-all"
            >
              Create a Room
            </motion.button>
          </div>

          <p className="text-white/20 text-xs pt-2">No sign-up required. Works on any device.</p>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-5 h-8 rounded-full border-2 border-white/20 flex items-start justify-center p-1"
          >
            <div className="w-1 h-2 rounded-full bg-white/40" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── How it Works ── */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-black">Four steps to your next collab</h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={item.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                custom={i}
                variants={fadeUp}
                className="relative bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-3 hover:border-white/20 transition-colors"
              >
                <span className="text-4xl font-black text-yellow-400/20">{item.step}</span>
                <p className="font-bold text-white text-lg">{item.title}</p>
                <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-4 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-black">Everything you need to connect</h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                custom={i}
                variants={fadeUp}
                className="group bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4 hover:border-yellow-400/30 hover:bg-yellow-400/[0.03] transition-all duration-300"
              >
                <span className="text-4xl block group-hover:scale-110 transition-transform duration-300">{f.emoji}</span>
                <p className="font-bold text-white">{f.title}</p>
                <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Personalities ── */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <p className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-3">AI Personalities</p>
            <h2 className="text-3xl sm:text-4xl font-black">Choose your icebreaker vibe</h2>
            <p className="text-white/40 mt-3 max-w-md mx-auto">Every icebreaker is AI-generated and tailored to both people's actual projects. Pick a personality that matches the moment.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PERSONALITIES.map((p, i) => (
              <motion.div
                key={p.key}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-50px' }}
                custom={i}
                variants={fadeUp}
                className={`bg-gradient-to-br ${p.color} border rounded-2xl p-5 flex items-start gap-4`}
              >
                <span className="text-3xl shrink-0">{p.emoji}</span>
                <div>
                  <p className="font-bold text-white">{p.label}</p>
                  <p className="text-white/50 text-sm mt-1">{p.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats / Social Proof ── */}
      <section className="py-24 px-4 bg-white/[0.02]">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
            className="text-center space-y-8"
          >
            <h2 className="text-3xl sm:text-4xl font-black">Built different</h2>
            <div className="grid grid-cols-3 gap-6">
              {[
                { value: '0', label: 'Sign-ups required' },
                { value: '<30s', label: 'To drop your card' },
                { value: '5', label: 'AI personalities' },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={i}
                  variants={fadeUp}
                >
                  <p className="text-3xl sm:text-4xl font-black text-yellow-400">{s.value}</p>
                  <p className="text-white/40 text-xs sm:text-sm mt-1">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeUp}
          className="max-w-2xl mx-auto text-center space-y-6"
        >
          <h2 className="text-3xl sm:text-5xl font-black leading-tight">
            Ready to find<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400">your people?</span>
          </h2>
          <p className="text-white/40 max-w-md mx-auto">
            No app to download. No account to create. Just vibes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/enter')}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-10 py-4 rounded-2xl text-sm transition-colors shadow-lg shadow-yellow-400/20"
            >
              Join a Room
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/enter?tab=create')}
              className="border border-white/20 hover:border-white/40 hover:bg-white/5 text-white font-bold px-10 py-4 rounded-2xl text-sm transition-all"
            >
              Create a Room
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-black text-sm">Vibe<span className="text-yellow-400">Check</span></p>
          <p className="text-white/20 text-xs">Built for hackathons. Powered by AI and good vibes.</p>
        </div>
      </footer>
    </div>
  )
}
