import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AppProviders } from './context/AppProviders'

// Global Error Handler for debugging
window.onerror = function (message, source, lineno, colno, error) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:black;color:red;padding:20px;z-index:9999;white-space:pre-wrap;font-family:monospace;overflow:auto;';
  errorDiv.innerHTML = `<h1>💥 Application Crashed</h1><p>${message}</p><p>${source}:${lineno}:${colno}</p><pre>${error?.stack || ''}</pre>`;
  document.body.appendChild(errorDiv);
};

try {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase keys missing! Check .env or Vercel Settings.");
    const warning = document.createElement('div');
    warning.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;text-align:center;padding:10px;z-index:9999;';
    warning.innerText = '⚠️ Supabase Keys Missing! App running in Guest Mode. Check Vercel Environment Variables.';
    document.body.appendChild(warning);
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>,
  )
} catch (e) {
  console.error("Render Error:", e);
  throw e; // Re-throw to trigger window.onerror
}
