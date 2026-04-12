import Link from "next/link";
import { requireModeratorPageUser } from "@/lib/page-auth";
import { getModerationAuditLogPage } from "@/lib/query";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AuditLogList } from "../audit-log-list";
import styles from "../moderation.module.css";

const PAGE_SIZE = 25;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const authUser = await requireModeratorPageUser();

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
          <AuditLogList
            entries={entries}
            emptyMessage="No moderation actions recorded yet."
            footer={
              <nav className={styles.pagination} aria-label="Audit log pagination">
                {safePage > 1 ? (
                  <Link href={`/moderation/audit-log?page=${safePage - 1}`}>← Previous</Link>
                ) : (
                  <span aria-disabled="true" className={styles.paginationDisabled}>
                    ← Previous
                  </span>
                )}

                <span>
                  Page {safePage} / {totalPages}
                </span>

                {safePage < totalPages ? (
                  <Link href={`/moderation/audit-log?page=${safePage + 1}`}>Next →</Link>
                ) : (
                  <span aria-disabled="true" className={styles.paginationDisabled}>
                    Next →
                  </span>
                )}
              </nav>
            }
          />
        )}
      </section>
    </main>
  );
}
