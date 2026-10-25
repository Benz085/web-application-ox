import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/web-app-ox/auth/AuthContext'
import AppRoutes from '@/web-app-ox/routes'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
