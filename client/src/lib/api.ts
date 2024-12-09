import type { InsertWidget } from "@db/schema";

export async function createWidget(widget: {
  name: string;
  template: string;
  customization: Record<string, unknown>;
}) {
  const response = await fetch("/api/widgets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(widget),
  });

  if (!response.ok) {
    throw new Error("Failed to create widget");
  }

  return response.json();
}

export async function upgradeToPreview() {
  const response = await fetch("/api/billing/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to create checkout session");
  }

  return response.json();
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
