import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/chakra-petch/latin-500.css';
import '@fontsource/chakra-petch/latin-700.css';
import './ui/styles/theme.css';
import { App } from './ui/App';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
