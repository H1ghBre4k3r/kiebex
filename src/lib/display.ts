import type { LocationType, ReviewStatus, ServingType, SubmissionStatus } from "@/lib/types";

const EUR_FORMATTER = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

export const LOCATION_TYPES = ["pub", "bar", "restaurant", "supermarket"] as const;

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  pub: "Pub",
  bar: "Bar",
  restaurant: "Restaurant",
  supermarket: "Supermarket",
};

export const LOCATION_TYPE_OPTIONS = [
  { value: "pub", label: LOCATION_TYPE_LABELS.pub },
  { value: "bar", label: LOCATION_TYPE_LABELS.bar },
  { value: "restaurant", label: LOCATION_TYPE_LABELS.restaurant },
  { value: "supermarket", label: LOCATION_TYPE_LABELS.supermarket },
] as const satisfies ReadonlyArray<{ value: LocationType; label: string }>;

export const SERVING_TYPES = ["tap", "bottle", "can"] as const;

export const SERVING_TYPE_LABELS: Record<ServingType, string> = {
  tap: "On Tap",
  bottle: "Bottle",
  can: "Can",
};

export const SERVING_TYPE_OPTIONS = [
  { value: "tap", label: SERVING_TYPE_LABELS.tap },
  { value: "bottle", label: SERVING_TYPE_LABELS.bottle },
  { value: "can", label: SERVING_TYPE_LABELS.can },
] as const satisfies ReadonlyArray<{ value: ServingType; label: string }>;

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  new: "New",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export function formatEur(value: number): string {
  return EUR_FORMATTER.format(value);
}

export function formatDate(value: Date | string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(value).toLocaleDateString("en-GB", options);
}

export function formatDateTime(value: Date | string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(value).toLocaleString("en-GB", options);
}

export function getServingLabel(serving: ServingType): string {
  return SERVING_TYPE_LABELS[serving];
}

export function locationTypeLabel(locationType: LocationType): string {
  return LOCATION_TYPE_LABELS[locationType];
}

export function submissionStatusLabel(status: SubmissionStatus): string {
  return SUBMISSION_STATUS_LABELS[status];
}

export function reviewStatusLabel(status: ReviewStatus): string {
  return REVIEW_STATUS_LABELS[status];
}
