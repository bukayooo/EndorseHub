import type { InsertWidget } from "@db/schema";
import type { WidgetCustomization } from "@/components/testimonials/WidgetPreview";

export async function createWidget(widget: {
  name: string;
  template: string;
  customization: WidgetCustomization;
  testimonialIds?: number[];
}) {
  const response = await fetch("/api/widgets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(widget),
  });

  const data = await response.json();
  
  if (!response.ok) {
    if (response.status === 403 && data.code === "PREMIUM_REQUIRED") {
      throw new Error("PREMIUM_REQUIRED");
    }
    throw new Error(data.error || "Failed to create widget");
  }

  return data;
}

export async function upgradeToPreview(priceType: 'monthly' | 'yearly' = 'monthly') {
  const response = await fetch("/api/billing/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ priceType }),
  });

  if (!response.ok) {
    throw new Error("Failed to create checkout session");
  }

  const { url } = await response.json();
  if (url) {
    window.location.href = url;
  } else {
    throw new Error("Invalid checkout session response");
  }
}

export async function importExternalReviews(source: string) {
  const response = await fetch("/api/testimonials/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ source }),
  });

  if (!response.ok) {
    throw new Error("Failed to import reviews");
  }

  return response.json();
}

export async function getAnalytics(widgetId: number) {
  const response = await fetch(`/api/analytics/${widgetId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch analytics");
  }

  return response.json();
}
export async function deleteWidget(widgetId: number) {
  const response = await fetch(`/api/widgets/${widgetId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Failed to delete widget");
  }

  return response.json();
}
