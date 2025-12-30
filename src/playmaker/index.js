import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Defensive removal of any runtime-injected "Made with Emergent" badge
(() => {
  const removeEmergentBadge = () => {
    try {
      // Remove by id
      const byId = document.getElementById("emergent-badge");
      if (byId && byId.parentNode) byId.parentNode.removeChild(byId);

      // Remove any element containing the exact watermark text
      const candidates = document.querySelectorAll("a, div, footer, span, p");
      for (const el of candidates) {
        const text = (el.textContent || "").trim();
        if (text === "Made with Emergent") {
          // Remove the closest fixed-position container if present, else remove the node
          const fixedParent = el.closest('[style*="position: fixed"], .fixed');
          const target = fixedParent || el;
          if (target && target.parentNode) target.parentNode.removeChild(target);
        }
      }
    } catch (_) {
      // no-op
    }
  };

  // Initial sweep after hydration
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", removeEmergentBadge);
  } else {
    removeEmergentBadge();
  }

  // Observe future DOM mutations to re-remove if re-injected
  const observer = new MutationObserver(() => removeEmergentBadge());
  try {
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } catch (_) {
    // ignore
  }
})();
