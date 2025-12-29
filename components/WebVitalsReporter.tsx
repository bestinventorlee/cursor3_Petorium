"use client";

import { useEffect } from "react";
import { onCLS, onFID, onFCP, onLCP, onTTFB, Metric } from "web-vitals";
import { reportWebVitals, getRating } from "@/lib/web-vitals";

export default function WebVitalsReporter() {
  useEffect(() => {
    const handleMetric = (metric: Metric) => {
      const rating = getRating(metric.name, metric.value);
      
      reportWebVitals({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        delta: metric.delta,
        rating,
      });
    };

    onCLS(handleMetric);
    onFID(handleMetric);
    onFCP(handleMetric);
    onLCP(handleMetric);
    onTTFB(handleMetric);
  }, []);

  return null;
}

