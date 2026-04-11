import { getCurrentAuthUser } from "@/lib/auth";
import { SiteHeaderClient } from "./site-header-client";

export async function SiteHeader() {
  const authUser = await getCurrentAuthUser();
  return <SiteHeaderClient authUser={authUser} />;
}
