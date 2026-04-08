import { getCurrentAuthUser } from "@/lib/auth";
import { jsonOk } from "@/lib/http";

export async function GET(): Promise<Response> {
  const user = await getCurrentAuthUser();

  return jsonOk({
    authenticated: Boolean(user),
    user,
  });
}
