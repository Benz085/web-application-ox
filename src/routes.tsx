import { Route, Routes } from 'react-router-dom'
import RequireAdmin from './auth/RequireAdmin'
import RequireAuth from './auth/RequireAuth'
import Layout from './components/Layout'

// Placeholders: later tasks (T8-T10) replace these with real pages under src/features/.
function LoginPage() {
  return <h1>Login</h1>
}
function LoginAdminPage() {
  return <h1>Admin login</h1>
}
function GamePage() {
  return <h1>Game</h1>
}
function LeaderboardPage() {
  return <h1>Leaderboard</h1>
}
function AdminPage() {
  return <h1>Admin</h1>
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/admin" element={<LoginAdminPage />} />
      <Route element={<Layout />}>
        <Route element={<RequireAuth />}>
          <Route path="/" element={<GamePage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
        </Route>
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
