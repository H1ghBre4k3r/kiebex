import { getCurrentAuthUser } from "@/lib/auth";
import { getPendingQueueCount } from "@/lib/query";
import { SiteHeaderClient } from "./site-header-client";

export async function SiteHeader() {
  const authUser = await getCurrentAuthUser();

  let pendingCount = 0;
  if (authUser?.role === "moderator" || authUser?.role === "admin") {
    pendingCount = await getPendingQueueCount();
  }

  return <SiteHeaderClient authUser={authUser} pendingCount={pendingCount} />;
}
