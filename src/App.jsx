import { Routes, Route, useLocation } from 'react-router-dom'
import { useAppData } from './hooks/useAppData'
import Navigation from './components/Navigation'
import Dashboard from './pages/Dashboard'
import PlayRound from './pages/PlayRound'
import History from './pages/History'
import RoundDetail from './pages/RoundDetail'
import Courses from './pages/Courses'
import AddCourse from './pages/AddCourse'
import StrokeCard from './pages/StrokeCard'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <p className="text-4xl">⛳</p>
      <p className="text-gray-500 text-sm font-medium">Loading your data…</p>
    </div>
  )
}

function ErrorScreen({ message }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3 px-8 text-center">
      <p className="text-4xl">⚠️</p>
      <p className="text-gray-800 font-semibold">Could not connect</p>
      <p className="text-gray-500 text-sm">
        {message ?? 'Check your connection and reload the page.'}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-5 py-2.5 bg-golf-green text-white text-sm font-semibold rounded-xl"
      >
        Reload
      </button>
    </div>
  )
}

export default function App() {
  const data = useAppData()
  const location = useLocation()

  if (data.loading) return <LoadingScreen />
  if (data.error)   return <ErrorScreen message={data.error} />

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard {...data} />} />
        <Route path="/play" element={<PlayRound {...data} />} />
        <Route path="/history" element={<History {...data} />} />
        <Route path="/history/:id" element={<RoundDetail {...data} />} />
        <Route path="/courses" element={<Courses {...data} />} />
        <Route path="/courses/add" element={<AddCourse {...data} />} />
        <Route path="/courses/:courseId" element={<AddCourse {...data} />} />
        <Route path="/strokes" element={<StrokeCard {...data} />} />
      </Routes>
      {location.pathname !== '/play' && <Navigation />}
    </>
  )
}
