import { Route, Routes } from 'react-router-dom'
import RequireAdmin from 'web-app-ox/auth/RequireAdmin'
import RequireAuth from 'web-app-ox/auth/RequireAuth'
import Layout from 'web-app-ox/components/Layout'
import AdminPage from 'web-app-ox/features/admin/AdminPage'
import GamePage from 'web-app-ox/features/game/GamePage'
import LeaderboardPage from 'web-app-ox/features/leaderboard/LeaderboardPage'
import LoginPage from 'web-app-ox/features/login/LoginPage'
import LoginAdminPage from 'web-app-ox/features/login-admin/LoginAdminPage'

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
