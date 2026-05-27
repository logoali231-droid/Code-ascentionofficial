"use client";

import type {
  Metric,
} from "web-vitals";

export function reportWebVitals(
  metric: Metric,
) {

  const body = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,

    memory:
      (performance as any)?.memory
        ?.usedJSHeapSize || null,

    deviceMemory:
      (navigator as any)
        ?.deviceMemory || null,

    userAgent:
      navigator.userAgent,
  };

  console.log(
    "[WEB VITALS]",
    body,
  );

  /*
    depois tu pode mandar:
    - API route
    - Supabase
    - telemetry db
    - edge analytics
  */
}