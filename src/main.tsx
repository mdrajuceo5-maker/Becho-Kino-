import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './context/LanguageContext';
import { loadDynamicAdSense } from './lib/firebase';
import './index.css';

// ওয়েবসাইট বা অ্যাপ লোড হওয়ার সময় dynamic AdSense লোড করা
loadDynamicAdSense();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);

