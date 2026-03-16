import { createRoot } from 'react-dom/client'
import './styles/avenier.css'
import App from './App.jsx'
import { AppErrorBoundary } from './components/AppErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
)
