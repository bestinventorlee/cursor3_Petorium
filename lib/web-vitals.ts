/**
 * Web Vitals Monitoring
 * Track Core Web Vitals for performance monitoring
 */

export interface WebVitalsMetric {
  name: string;
  value: number;
  id: string;
  delta: number;
  rating: "good" | "needs-improvement" | "poor";
}

/**
 * Send Web Vitals to analytics endpoint
 */
export function reportWebVitals(metric: WebVitalsMetric) {
  // In production, send to your analytics service
  if (process.env.NODE_ENV === "production") {
    // Example: Send to analytics API
    fetch("/api/analytics/web-vitals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metric),
    }).catch((error) => {
      console.error("Error reporting web vitals:", error);
    });
  } else {
    // Log in development
    console.log("Web Vital:", metric);
  }
}

/**
 * Get rating for metric value
 */
export function getRating(
  name: string,
  value: number
): "good" | "needs-improvement" | "poor" {
  // Core Web Vitals thresholds
  const thresholds: Record<string, { good: number; poor: number }> = {
    CLS: { good: 0.1, poor: 0.25 },
    FID: { good: 100, poor: 300 },
    FCP: { good: 1800, poor: 3000 },
    LCP: { good: 2500, poor: 4000 },
    TTFB: { good: 800, poor: 1800 },
  };

  const threshold = thresholds[name];
  if (!threshold) return "good";

  if (value <= threshold.good) return "good";
  if (value <= threshold.poor) return "needs-improvement";
  return "poor";
}

