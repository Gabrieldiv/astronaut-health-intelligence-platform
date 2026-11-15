import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App'
import { initI18n } from './i18n'
import { initPseudoLocale } from './i18n/pseudo'

initI18n()
initPseudoLocale()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
