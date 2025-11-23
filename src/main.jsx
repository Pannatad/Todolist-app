import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase keys missing! Check .env or Vercel Settings.");
  // Optional: Render a warning banner to the body
  const warning = document.createElement('div');
  warning.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;text-align:center;padding:10px;z-index:9999;';
  warning.innerText = '⚠️ Supabase Keys Missing! App running in Guest Mode. Check Vercel Environment Variables.';
  document.body.appendChild(warning);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
