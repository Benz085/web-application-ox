import '@/web-app-ox/test/setup'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ADMIN, SIGNED_OUT, renderAt } from '@/web-app-ox/test/render'
import Header from '@/web-app-ox/components/Header'
import Layout from '@/web-app-ox/components/Layout'

const nav = () => screen.getByRole('navigation', { name: 'Main' })

describe('Header navigation (UI-8, AC-28)', () => {
  it('renders nothing while signed out', () => {
    const { container } = renderAt(<Header />, { auth: SIGNED_OUT })
    expect(container.querySelector('header')).toBeNull()
  })

  it('renders nothing while loading', () => {
    const { container } = renderAt(<Header />, { auth: { loading: true } })
    expect(container.querySelector('header')).toBeNull()
  })

  it('shows Play and Leaderboard (no Admin) to a player', () => {
    renderAt(<Header />)
    expect(within(nav()).getByRole('link', { name: 'Play' })).toHaveAttribute('href', '/')
    expect(within(nav()).getByRole('link', { name: 'Leaderboard' })).toHaveAttribute('href', '/leaderboard')
    expect(within(nav()).queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
  })

  it('shows Leaderboard and Admin, and NO Play, to an admin', () => {
    renderAt(<Header />, { auth: ADMIN })
    expect(within(nav()).getAllByRole('link').map((a) => a.textContent)).toEqual(['Leaderboard', 'Admin'])
    expect(within(nav()).queryByRole('link', { name: 'Play' })).not.toBeInTheDocument()
    expect(within(nav()).getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin')
  })

  it('marks the current page with aria-current', () => {
    renderAt(<Header />, { route: '/leaderboard' })
    expect(screen.getByRole('link', { name: 'Leaderboard' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Play' })).not.toHaveAttribute('aria-current')
  })

  it('marks Play current only on "/" (end match)', () => {
    renderAt(<Header />, { route: '/' })
    expect(screen.getByRole('link', { name: 'Play' })).toHaveAttribute('aria-current', 'page')
  })

  it('marks Admin current on /admin for an admin', () => {
    renderAt(<Header />, { route: '/admin', auth: ADMIN })
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('aria-current', 'page')
  })

  it('has a brand link home', () => {
    renderAt(<Header />)
    expect(screen.getByRole('link', { name: /OX Game/ })).toHaveAttribute('href', '/')
  })
})

describe('Header user block', () => {
  it('shows the display name and initials avatar', () => {
    const { container } = renderAt(<Header />)
    expect(screen.getByText('Alex Morgan')).toHaveAttribute('title', 'Alex Morgan')
    expect(container.querySelector('span.avatar')).toHaveTextContent('AM')
  })

  it('shows the fixed admin name and initials', () => {
    const { container } = renderAt(<Header />, { auth: ADMIN })
    expect(screen.getByText('Admin OX')).toBeInTheDocument()
    expect(container.querySelector('span.avatar')).toHaveTextContent('AO')
  })

  it('shows the photo instead of initials when the user has one', () => {
    const user = { uid: 'p', displayName: 'Alex', email: null, photoURL: 'https://img.example.test/a.png' }
    const { container } = renderAt(<Header />, { auth: { user } })
    const img = container.querySelector('img.avatar')
    expect(img).toHaveAttribute('src', 'https://img.example.test/a.png')
    expect(img).toHaveAttribute('alt', '')
    expect(container.querySelector('span.avatar')).toBeNull()
  })
})

describe('Header sign out (AC-3, AC-25)', () => {
  function routes() {
    return (
      <Routes>
        <Route path="/login" element={<p>player login</p>} />
        <Route path="/login/admin" element={<p>admin login</p>} />
        <Route path="*" element={<Header />} />
      </Routes>
    )
  }

  it('signs a player out and goes to /login', async () => {
    const view = renderAt(routes(), { route: '/leaderboard' })
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(view.auth.signOut).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('player login')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/login')
  })

  it('signs an admin out and goes to /login/admin', async () => {
    const view = renderAt(routes(), { route: '/admin', auth: ADMIN })
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(view.auth.signOut).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('admin login')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/login/admin')
  })
})

describe('Layout', () => {
  it('renders skip link, header and the routed page in <main>', () => {
    renderAt(
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<p>page body</p>} />
        </Route>
      </Routes>,
    )
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByText('page body')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })
})
