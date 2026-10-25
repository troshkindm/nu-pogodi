import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { tableTexture } from '../render/table';

import { App } from './App';

const prepareScene = () => {
  const root = document.documentElement.style;
  root.setProperty('--table', tableTexture());
  const updateHeight = () => root.setProperty('--app-height', `${window.innerHeight}px`);
  updateHeight();
  window.addEventListener('resize', updateHeight);
};

prepareScene();

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
