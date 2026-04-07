import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { HelpGuide } from './components/HelpGuide.tsx'

const isHelpRoute = window.location.hash === '#help-guide' || window.location.pathname.endsWith('/help');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isHelpRoute ? <HelpGuide /> : <App />}
  </StrictMode>,
)
