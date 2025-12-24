import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress unknown runtime errors from the Vite error overlay in development
if (import.meta.env.DEV) {
  window.addEventListener('error', (event) => {
    // Suppress errors with no message (unknown runtime errors)
    if (!event.message || event.message === 'Script error.' || event.message === '') {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, true);
  
  window.addEventListener('unhandledrejection', (event) => {
    // Suppress promise rejections with no reason
    if (!event.reason || (typeof event.reason === 'object' && !event.reason.message)) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, true);
}

createRoot(document.getElementById("root")!).render(<App />);
