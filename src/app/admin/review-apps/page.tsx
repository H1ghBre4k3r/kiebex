import { requireAdminPageUser } from "@/lib/page-auth";
import { Breadcrumbs } from "@/components/breadcrumbs";
import styles from "./review-apps.module.css";

interface ReviewApp {
  prNumber: number;
  url: string;
  prUrl: string;
  status: "pending" | "success" | "inactive";
  createdAt: string;
  sha: string | null;
}

async function fetchReviewApps(): Promise<{ apps: ReviewApp[]; error: string | null }> {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return { apps: [], error: "GITHUB_TOKEN not configured" };
  }

  try {
    const res = await fetch(
      "https://api.github.com/repos/H1ghBre4k3r/kiebex/deployments?per_page=100",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "kiebex",
        },
        next: { revalidate: 60 },
      },
    );

    if (!res.ok) {
      return { apps: [], error: `GitHub API error: ${res.status}` };
    }

    const deployments = await res.json();

    const reviewDeployments = deployments.filter((d: { environment: string }) =>
      d.environment?.startsWith("review/"),
    );

    const apps: ReviewApp[] = await Promise.all(
      reviewDeployments.map(
        async (d: {
          id: number;
          environment: string;
          created_at: string;
          sha: string;
          statuses_url: string;
        }) => {
          const prNumber = parseInt(d.environment.replace("review/pr-", ""), 10);

          let status: "pending" | "success" | "inactive" = "pending";

          try {
            const statusRes = await fetch(d.statuses_url, {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "User-Agent": "kiebex",
              },
            });

            if (statusRes.ok) {
              const statuses = await statusRes.json();
              const latestStatus = statuses[0];
              if (latestStatus?.state) {
                status = latestStatus.state;
              }
            }
          } catch {
            // Keep default status
          }

          return {
            prNumber,
            url: `https://pr-${prNumber}.review.kiel.beer`,
            prUrl: `https://github.com/H1ghBre4k3r/kiebex/pull/${prNumber}`,
            status,
            createdAt: d.created_at,
            sha: d.sha?.substring(0, 7) ?? null,
          };
        },
      ),
    );

    const activeApps = apps
      .filter((a) => a.status !== "inactive")
      .sort((a, b) => b.prNumber - a.prNumber);
    return { apps: activeApps, error: null };
  } catch (e) {
    return { apps: [], error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export default async function ReviewAppsPage() {
  const authUser = await requireAdminPageUser();
  const { apps, error } = await fetchReviewApps();

  return (
    <main className={styles.page}>
      <Breadcrumbs
        crumbs={[
          { label: "Back to offer directory", href: "/" },
          { label: "Admin Hub", href: "/admin" },
        ]}
      />

      <section className={styles.panel}>
        <h1>Review Apps</h1>
        <p>Active ephemeral deployments for open pull requests.</p>
        <p className={styles.notice}>
          Signed in as <strong>{authUser.displayName}</strong> (admin).
        </p>
      </section>

      {error && (
        <section className={styles.panel}>
          <p className={styles.error}>{error}</p>
        </section>
      )}

      <section className={styles.panel}>
        <h2>Active Deployments ({apps.length})</h2>

        {apps.length === 0 ? (
          <p className={styles.empty}>No active review apps found.</p>
        ) : (
          <ul className={styles.list}>
            {apps.map((app) => (
              <li key={app.prNumber} className={styles.item}>
                <div className={styles.itemHeader}>
                  <span className={styles.itemTitle}>PR #{app.prNumber}</span>
                  <span className={`${styles.itemStatus} ${styles[app.status]}`}>{app.status}</span>
                </div>
                <dl className={styles.itemMeta}>
                  {app.sha && (
                    <div>
                      <dt>Commit</dt>
                      <dd>{app.sha}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Created</dt>
                    <dd>{new Date(app.createdAt).toLocaleString()}</dd>
                  </div>
                </dl>
                <div className={styles.itemLinks}>
                  <a href={app.url} target="_blank" rel="noopener noreferrer">
                    Open App →
                  </a>
                  <a href={app.prUrl} target="_blank" rel="noopener noreferrer">
                    View PR →
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
