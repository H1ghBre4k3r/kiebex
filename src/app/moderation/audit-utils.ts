import type {
  AuditDetailsMap,
  LocationAuditDetails,
  ModerationContentType,
  OfferAuditDetails,
  PriceUpdateAuditDetails,
  ReviewAuditDetails,
  VariantAuditDetails,
} from "@/lib/types";

export type { AuditDetailsMap };

export function parseDetails<T extends ModerationContentType>(
  _contentType: T,
  json: string | null,
): AuditDetailsMap[T] | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as AuditDetailsMap[T];
  } catch {
    return null;
  }
}

export function formatAuditContext(
  contentType: ModerationContentType,
  details: AuditDetailsMap[ModerationContentType] | null,
): string | null {
  if (!details) return null;

  if (contentType === "brand" || contentType === "style") {
    const d = details as AuditDetailsMap["brand"];
    if (d.previousName !== undefined && d.previousName !== d.name) {
      return `${d.previousName} → ${d.name}`;
    }
    return d.name ?? null;
  }

  if (contentType === "location") {
    const d = details as LocationAuditDetails;
    const meta: string[] = [];
    if (d.locationType) meta.push(d.locationType);
    if (d.district) meta.push(d.district);
    const suffix = meta.length > 0 ? ` (${meta.join(", ")})` : "";
    if (d.previousName !== undefined && d.previousName !== d.name) {
      return `${d.previousName} → ${d.name}${suffix}`;
    }
    return d.name ? `${d.name}${suffix}` : null;
  }

  if (contentType === "variant") {
    const d = details as VariantAuditDetails;
    if (d.previousName !== undefined) {
      const namePart =
        d.previousName !== d.name
          ? `${d.previousName} → ${d.name}`
          : (d.name ?? d.previousName ?? null);
      const styleChanged = d.previousStyle !== undefined && d.previousStyle !== d.style;
      const stylePart = styleChanged ? `style: ${d.previousStyle} → ${d.style}` : null;
      const parts = [namePart, stylePart].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : null;
    }
    const label = d.brand && d.name ? `${d.brand} ${d.name}` : (d.name ?? null);
    const suffix = d.style ? ` (${d.style})` : "";
    return label ? `${label}${suffix}` : null;
  }

  if (contentType === "offer") {
    const d = details as OfferAuditDetails;
    const label = d.variant && d.brand ? `${d.brand} ${d.variant}` : (d.variant ?? d.brand ?? null);
    const meta: string[] = [];
    if (d.style) meta.push(d.style);
    if (d.sizeMl != null) meta.push(`${d.sizeMl}ml`);
    if (d.serving) meta.push(d.serving);
    const metaSuffix = meta.length > 0 ? ` (${meta.join(", ")})` : "";
    const atLocation = d.location ? ` @ ${d.location}` : "";
    let price = "";
    if (d.previousPriceEur != null && d.priceCents != null) {
      price = ` — €${d.previousPriceEur.toFixed(2)} → €${(d.priceCents / 100).toFixed(2)}`;
    } else if (d.priceEur != null) {
      price = ` — €${d.priceEur.toFixed(2)}`;
    } else if (d.priceCents != null) {
      price = ` — €${(d.priceCents / 100).toFixed(2)}`;
    }
    return label ? `${label}${metaSuffix}${atLocation}${price}` : null;
  }

  if (contentType === "price_update") {
    const d = details as PriceUpdateAuditDetails;
    const label = d.variant && d.brand ? `${d.brand} ${d.variant}` : (d.variant ?? d.brand ?? null);
    const atLocation = d.location ? ` @ ${d.location}` : "";
    let price = "";
    if (d.currentPriceEur != null && d.proposedPriceEur != null) {
      price = ` — €${d.currentPriceEur.toFixed(2)} → €${d.proposedPriceEur.toFixed(2)}`;
    } else if (d.proposedPriceEur != null) {
      price = ` — €${d.proposedPriceEur.toFixed(2)}`;
    }
    return label ? `${label}${atLocation}${price}` : null;
  }

  if (contentType === "review") {
    const d = details as ReviewAuditDetails;
    const parts: string[] = [];
    if (d.rating != null) parts.push(`${d.rating}★`);
    if (d.title) parts.push(`"${d.title}"`);
    if (d.author) parts.push(`by ${d.author}`);
    if (d.locationName) parts.push(`@ ${d.locationName}`);
    return parts.length > 0 ? parts.join(" ") : null;
  }

  return null;
}

export function formatEditedFields(
  details: AuditDetailsMap[ModerationContentType] | null,
): string | null {
  if (!details) return null;
  const fields = (details as { fields?: string[] }).fields;
  if (!fields || fields.length === 0) return null;
  return `edited: ${fields.join(", ")}`;
}
