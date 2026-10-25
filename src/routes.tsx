import { Route, Routes } from 'react-router-dom'
import RequireAdmin from './auth/RequireAdmin'
import RequireAuth from './auth/RequireAuth'
import Layout from './components/Layout'
import AdminPage from './features/admin/AdminPage'
import GamePage from './features/game/GamePage'
import LeaderboardPage from './features/leaderboard/LeaderboardPage'
import LoginPage from './features/login/LoginPage'
import LoginAdminPage from './features/login-admin/LoginAdminPage'

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
