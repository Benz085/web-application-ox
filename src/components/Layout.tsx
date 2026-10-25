import { Outlet } from 'react-router-dom'
import Header from '@/web-app-ox/components/Header'

export default function Layout() {
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main" className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
