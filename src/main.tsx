import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

/**
 * PWA / офлайн-режим.
 * Service Worker (sw.js) генерується авто-скриптом scripts/prepare-deploy.mjs.
 * Реєструємо лише в продакшені по HTTPS, щоб не заважати розробці.
 */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const swUrl = new URL("sw.js", document.baseURI).href;
    navigator.serviceWorker.register(swUrl).catch(() => {
      /* офлайн-режим недоступний — не критично */
    });
  });
}
