import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRouter from './AppRouter'
import DnDProvider from './components/DnDProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DnDProvider>
      <AppRouter />
    </DnDProvider>
  </StrictMode>,
)
