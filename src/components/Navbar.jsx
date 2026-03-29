import { useNavigate, useLocation } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { Button } from './ui/button'

export function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const isLanding = location.pathname === '/'

  if (!isLanding) return null

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-white/10">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-black text-xl">VibeCheck</span>
        </button>

        <div className="flex items-center gap-3">
          <Button variant="ghost" className="font-semibold hover:text-primary" onClick={() => navigate('/enter')}>
            Join Room
          </Button>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-2xl px-6"
            onClick={() => navigate('/enter?tab=create')}
          >
            Create Room
          </Button>
        </div>
      </div>
    </nav>
  )
}
