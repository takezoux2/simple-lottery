export {};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (
      command: "config" | "event" | "js" | "set",
      targetIdOrAction: string | Date,
      params?: Record<string, unknown>,
    ) => void;
  }
}
