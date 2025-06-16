import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './mobile.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <App />
)
