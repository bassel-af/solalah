import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TreeProvider } from '@/context/TreeContext';
import App from './App';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TreeProvider>
      <App />
    </TreeProvider>
  </StrictMode>
);
