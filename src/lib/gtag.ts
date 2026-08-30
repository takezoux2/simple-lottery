export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url: string): void => {
  if (!GA_TRACKING_ID || typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  window.gtag("config", GA_TRACKING_ID, {
    page_path: url,
  });
};

export interface GTagEvent {
  action: string;
  category?: string;
  label?: string;
  value?: number;
  [key: string]: unknown;
}

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = ({ action, category, label, value, ...otherParams }: GTagEvent): void => {
  if (!GA_TRACKING_ID || typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  window.gtag("event", action, {
    event_category: category,
    event_label: label,
    value: value,
    ...otherParams,
  });
};
