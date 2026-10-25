import { useLocation } from 'react-router-dom'

/** Renders the current router location so tests can assert redirects. */
export function LocationProbe() {
  const { pathname, search } = useLocation()
  return <div data-testid="location">{pathname + search}</div>
}
