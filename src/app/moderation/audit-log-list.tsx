import type { ReactNode } from "react";
import { formatDateTime } from "@/lib/display";
import type { ModerationAuditLogEntry } from "@/lib/types";
import { formatAuditContext, formatEditedFields, parseDetails } from "./audit-utils";
import styles from "./moderation.module.css";

type Props = {
  entries: ModerationAuditLogEntry[];
  emptyMessage: string;
  footer?: ReactNode;
  dateTimeOptions?: Intl.DateTimeFormatOptions;
};

export function AuditLogList({
  entries,
  emptyMessage,
  footer,
  dateTimeOptions = { dateStyle: "medium", timeStyle: "short" },
}: Props) {
  if (entries.length === 0) {
    return <p className={styles.notice}>{emptyMessage}</p>;
  }

  return (
    <>
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
                <span className={styles[`audit_${entry.action}` as keyof typeof styles] as string}>
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
              <p className={styles.auditMeta}>{formatDateTime(entry.createdAt, dateTimeOptions)}</p>
            </li>
          );
        })}
      </ul>

      {footer ? <div className={styles.auditFooter}>{footer}</div> : null}
    </>
  );
}
