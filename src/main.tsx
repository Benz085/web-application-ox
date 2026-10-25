import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'web-app-ox/index.css'
import App from 'web-app-ox/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
