import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import Landing from './pages/Landing'
import Home from './pages/Home'
import CreateCard from './pages/CreateCard'
import Room from './pages/Room'
import Matches from './pages/Matches'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/enter" element={<Home />} />
          <Route path="/join/:code" element={<Home />} />
          <Route path="/create/:eventId" element={<CreateCard />} />
          <Route path="/room/:eventId" element={<Room />} />
          <Route path="/room/:eventId/edit" element={<CreateCard />} />
          <Route path="/matches/:eventId" element={<Matches />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
