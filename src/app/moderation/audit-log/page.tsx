import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAuthUser } from "@/lib/auth";
import { getModerationAuditLogPage } from "@/lib/query";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { parseDetails, formatAuditContext, formatEditedFields } from "../audit-utils";
import styles from "../moderation.module.css";

const PAGE_SIZE = 25;

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
              const details = parseDetails(entry.contentType, entry.details);
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
