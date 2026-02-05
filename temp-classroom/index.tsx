import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  /* StrictMode removed to prevent double-connect on Live API in dev mode. 
     This prevents the "hanging" sensation caused by race conditions in websocket setup. */
  <App />
);