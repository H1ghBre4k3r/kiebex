import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/auth";
import { getModerationAuditLogPage } from "@/lib/query";
import styles from "../moderation.module.css";

const PAGE_SIZE = 25;

type ModerationAction = "approve" | "reject" | "delete" | "edit";
type ModerationContentType = "location" | "brand" | "variant" | "offer" | "price_update" | "review";

function auditActionLabel(action: ModerationAction): string {
  switch (action) {
    case "approve":
      return "approved";
    case "reject":
      return "rejected";
    case "delete":
      return "deleted";
    case "edit":
      return "edited";
  }
}

function auditContentLabel(type: ModerationContentType): string {
  switch (type) {
    case "location":
      return "location";
    case "brand":
      return "brand";
    case "variant":
      return "variant";
    case "offer":
      return "offer";
    case "price_update":
      return "price update";
    case "review":
      return "review";
  }
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
      <p>
        <Link href="/moderation">← Back to moderation</Link>
      </p>

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
            {entries.map((entry) => (
              <li key={entry.id} className={`${styles.item} ${styles.auditItem}`}>
                <p>
                  <strong>{entry.moderatorName}</strong>{" "}
                  <span
                    className={styles[`audit_${entry.action}` as keyof typeof styles] as string}
                  >
                    {auditActionLabel(entry.action as ModerationAction)}
                  </span>{" "}
                  {auditContentLabel(entry.contentType as ModerationContentType)}{" "}
                  <code>{entry.contentId.slice(0, 8)}…</code>
                </p>
                <p className={styles.auditMeta}>{formatDateTime(entry.createdAt)}</p>
              </li>
            ))}
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
