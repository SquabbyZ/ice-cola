import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { useAuthStore } from './stores/authStore';
import './index.css';

// Initialize auth on app start
const initAuth = () => {
  const checkAuth = useAuthStore.getState().checkAuth;
  checkAuth();
};

initAuth();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
