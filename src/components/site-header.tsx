import { getCurrentAuthUser } from "@/lib/auth";
import { getCachedPendingQueueCount } from "@/lib/pending-queue-cache";
import { SiteHeaderClient } from "./site-header-client";

export async function SiteHeader() {
  const authUser = await getCurrentAuthUser();

  let pendingCount = 0;
  if (authUser?.role === "moderator" || authUser?.role === "admin") {
    pendingCount = await getCachedPendingQueueCount();
  }

  return <SiteHeaderClient authUser={authUser} pendingCount={pendingCount} />;
}
