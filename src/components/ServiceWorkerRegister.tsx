"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Register service worker after window load to prevent blocking initial paint
      const register = () => {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const swUrl = `${basePath}/sw.js`;
        const scope = basePath ? `${basePath}/` : "/";

        navigator.serviceWorker
          .register(swUrl, { scope })
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
