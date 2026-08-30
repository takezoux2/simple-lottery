"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Register service worker after window load to prevent blocking initial paint
      const register = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("[SW] Registered successfully:", registration.scope);
          })
          .catch((error) => {
            console.error("[SW] Registration failed:", error);
          });
      };

      if (document.readyState === "complete") {
        register();
      } else {
        window.addEventListener("load", register);
        return () => window.removeEventListener("load", register);
      }
    }
  }, []);

  return null;
}
