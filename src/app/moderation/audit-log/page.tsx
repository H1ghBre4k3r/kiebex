import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/auth";
import { getModerationAuditLogPage } from "@/lib/query";
import { Breadcrumbs } from "@/components/breadcrumbs";
import styles from "../moderation.module.css";

const PAGE_SIZE = 25;

type ModerationContentType =
  | "location"
  | "brand"
  | "style"
  | "variant"
  | "offer"
  | "price_update"
  | "review";

type AuditDetails = {
  name?: string;
  variant?: string;
  brand?: string;
  location?: string;
  priceEur?: number;
  priceCents?: number;
  proposedPriceEur?: number;
  rating?: number;
  title?: string | null;
  author?: string;
  fields?: string[];
  locationType?: string;
  district?: string;
  address?: string;
  style?: string;
  sizeMl?: number;
  serving?: string;
  previousName?: string;
  previousLocationType?: string;
  previousDistrict?: string;
  previousAddress?: string;
  previousStyle?: string;
  previousPriceEur?: number;
  currentPriceEur?: number;
  locationName?: string;
};

function parseDetails(json: string | null): AuditDetails | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as AuditDetails;
  } catch {
    return null;
  }
}

function formatAuditContext(
  contentType: ModerationContentType,
  details: AuditDetails | null,
): string | null {
  if (!details) return null;

  if (contentType === "brand" || contentType === "style") {
    if (details.previousName !== undefined && details.previousName !== details.name) {
      return `${details.previousName} → ${details.name}`;
    }
    return details.name ?? null;
  }

  if (contentType === "location") {
    const meta: string[] = [];
    if (details.locationType) meta.push(details.locationType);
    if (details.district) meta.push(details.district);
    const suffix = meta.length > 0 ? ` (${meta.join(", ")})` : "";
    if (details.previousName !== undefined && details.previousName !== details.name) {
      return `${details.previousName} → ${details.name}${suffix}`;
    }
    return details.name ? `${details.name}${suffix}` : null;
  }

  if (contentType === "variant") {
    if (details.previousName !== undefined) {
      const namePart =
        details.previousName !== details.name
          ? `${details.previousName} → ${details.name}`
          : (details.name ?? details.previousName ?? null);
      const styleChanged =
        details.previousStyle !== undefined && details.previousStyle !== details.style;
      const stylePart = styleChanged ? `style: ${details.previousStyle} → ${details.style}` : null;
      const parts = [namePart, stylePart].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : null;
    }
    const label =
      details.brand && details.name ? `${details.brand} ${details.name}` : (details.name ?? null);
    const suffix = details.style ? ` (${details.style})` : "";
    return label ? `${label}${suffix}` : null;
  }

  if (contentType === "offer") {
    const label =
      details.variant && details.brand
        ? `${details.brand} ${details.variant}`
        : (details.variant ?? details.brand ?? null);
    const meta: string[] = [];
    if (details.style) meta.push(details.style);
    if (details.sizeMl != null) meta.push(`${details.sizeMl}ml`);
    if (details.serving) meta.push(details.serving);
    const metaSuffix = meta.length > 0 ? ` (${meta.join(", ")})` : "";
    const atLocation = details.location ? ` @ ${details.location}` : "";
    let price = "";
    if (details.previousPriceEur != null && details.priceCents != null) {
      price = ` — €${details.previousPriceEur.toFixed(2)} → €${(details.priceCents / 100).toFixed(2)}`;
    } else if (details.priceEur != null) {
      price = ` — €${details.priceEur.toFixed(2)}`;
    } else if (details.priceCents != null) {
      price = ` — €${(details.priceCents / 100).toFixed(2)}`;
    }
    return label ? `${label}${metaSuffix}${atLocation}${price}` : null;
  }

  if (contentType === "price_update") {
    const label =
      details.variant && details.brand
        ? `${details.brand} ${details.variant}`
        : (details.variant ?? details.brand ?? null);
    const atLocation = details.location ? ` @ ${details.location}` : "";
    let price = "";
    if (details.currentPriceEur != null && details.proposedPriceEur != null) {
      price = ` — €${details.currentPriceEur.toFixed(2)} → €${details.proposedPriceEur.toFixed(2)}`;
    } else if (details.proposedPriceEur != null) {
      price = ` — €${details.proposedPriceEur.toFixed(2)}`;
    }
    return label ? `${label}${atLocation}${price}` : null;
  }

  if (contentType === "review") {
    const parts: string[] = [];
    if (details.rating != null) parts.push(`${details.rating}★`);
    if (details.title) parts.push(`"${details.title}"`);
    if (details.author) parts.push(`by ${details.author}`);
    if (details.locationName) parts.push(`@ ${details.locationName}`);
    return parts.length > 0 ? parts.join(" ") : null;
  }

  return null;
}

function formatEditedFields(details: AuditDetails | null): string | null {
  if (!details?.fields || details.fields.length === 0) return null;
  return `edited: ${details.fields.join(", ")}`;
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const authUser = await getCurrentAuthUser();

  if (!authUser) {
    redirect("/login");
  }

  if (authUser.role !== "moderator" && authUser.role !== "admin") {
    redirect("/");
  }

  const rawParams = await searchParams;
  const rawPage = Array.isArray(rawParams.page) ? rawParams.page[0] : rawParams.page;
  const page = Math.max(1, parseInt(rawPage ?? "1", 10) || 1);

  const { entries, total } = await getModerationAuditLogPage(page, PAGE_SIZE);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  return (
    <main className={styles.page}>
      <Breadcrumbs
        crumbs={[
          { label: "Back to offer directory", href: "/" },
          ...(authUser.role === "admin" ? [{ label: "Admin Hub", href: "/admin" }] : []),
          { label: "Moderation Queue", href: "/moderation" },
        ]}
      />

      <section className={styles.panel}>
        <h1>Audit Log</h1>
        <p>
          Full history of all moderator actions. Showing page {safePage} of {totalPages} ({total}{" "}
          entries total).
        </p>
        <p className={styles.notice}>
          Signed in as <strong>{authUser.displayName}</strong> ({authUser.role}).
        </p>
      </section>

      <section className={styles.panel}>
        <h2>
          Entries {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, total)} of{" "}
          {total}
        </h2>

        {entries.length === 0 ? (
          <p className={styles.notice}>No moderation actions recorded yet.</p>
        ) : (
          <ul className={styles.list}>
            {entries.map((entry) => {
              const details = parseDetails(entry.details);
              const context = formatAuditContext(entry.contentType, details);
              const editedFields = entry.action === "edit" ? formatEditedFields(details) : null;
              const moderatorLabel = entry.currentModeratorName ?? entry.moderatorName;
              return (
                <li key={entry.id} className={`${styles.item} ${styles.auditItem}`}>
                  <p>
                    <strong>{moderatorLabel}</strong>{" "}
                    <span
                      className={styles[`audit_${entry.action}` as keyof typeof styles] as string}
                    >
                      {entry.action}
                    </span>{" "}
                    {entry.contentType.replace("_", " ")}
                    {context && (
                      <>
                        {" "}
                        <span className={styles.auditContext}>({context})</span>
                      </>
                    )}
                    {editedFields && (
                      <>
                        {" "}
                        <span className={styles.auditMeta}>[{editedFields}]</span>
                      </>
                    )}
                  </p>
                  <p className={styles.auditMeta}>{formatDateTime(entry.createdAt)}</p>
                </li>
              );
            })}
          </ul>
        )}

        <nav
          aria-label="Audit log pagination"
          style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", alignItems: "center" }}
        >
          {safePage > 1 ? (
            <Link href={`/moderation/audit-log?page=${safePage - 1}`}>← Previous</Link>
          ) : (
            <span aria-disabled="true" style={{ color: "var(--ink-muted)" }}>
              ← Previous
            </span>
          )}

          <span>
            Page {safePage} / {totalPages}
          </span>

          {safePage < totalPages ? (
            <Link href={`/moderation/audit-log?page=${safePage + 1}`}>Next →</Link>
          ) : (
            <span aria-disabled="true" style={{ color: "var(--ink-muted)" }}>
              Next →
            </span>
          )}
        </nav>
      </section>
    </main>
  );
}
