import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

const FEATURES = [
  { emoji: '🎴', title: 'Drop your card', desc: 'Share what you\'re building, what you need, and what you offer.' },
  { emoji: '🤖', title: 'AI-powered matching', desc: 'Semantic matching finds the people you actually need to meet.' },
  { emoji: '🎯', title: 'Shoot your shot', desc: 'Send a personalized AI icebreaker and start the conversation.' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Hero */}
      <div className="relative flex flex-col items-center justify-center min-h-[80vh] px-4">
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-400/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative text-center space-y-6 max-w-lg"
        >
          <h1 className="text-6xl sm:text-7xl font-black tracking-tight leading-none">
            Vibe<span className="text-yellow-400">Check</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/50 leading-relaxed">
            Stop awkward networking. Drop your card, let AI find your people, and shoot your shot.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <button
              onClick={() => navigate('/enter')}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-bold px-8 py-3.5 rounded-2xl text-sm transition-all hover:scale-105"
            >
              Join a Room
            </button>
            <button
              onClick={() => navigate('/enter?tab=create')}
              className="border border-white/20 hover:border-white/40 text-white font-bold px-8 py-3.5 rounded-2xl text-sm transition-all hover:scale-105"
            >
              Create a Room
            </button>
          </div>
        </motion.div>
      </div>

      {/* Features */}
      <div className="max-w-3xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-center"
            >
              <span className="text-3xl">{f.emoji}</span>
              <p className="font-bold text-white text-sm">{f.title}</p>
              <p className="text-white/40 text-xs leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center">
        <p className="text-white/20 text-xs">Built for hackathons. Powered by vibes.</p>
      </footer>
    </div>
  )
}
