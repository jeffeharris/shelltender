import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@shelltender/client/src/styles/mobile.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <App />
)
