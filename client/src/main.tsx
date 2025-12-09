import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Mobile viewport height fix - handles keyboard appearing/disappearing
function setViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Set initial viewport height
setViewportHeight();

// Update on resize (handles keyboard open/close)
window.addEventListener('resize', setViewportHeight);

// Also listen to visualViewport changes for better keyboard handling
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', setViewportHeight);
}

createRoot(document.getElementById("root")!).render(<App />);
