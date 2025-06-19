import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '../styles/index.css'
import '../styles/demo.css'
import App from './App'
import { ErrorBoundary } from './ErrorBoundary'
import { WebSocketProvider } from '@shelltender/client'

// Configure WebSocket based on environment
const wsConfig = {
  port: (import.meta as any).env?.VITE_WS_PORT || '8081'
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <WebSocketProvider config={wsConfig}>
      <App />
    </WebSocketProvider>
  </ErrorBoundary>
)
