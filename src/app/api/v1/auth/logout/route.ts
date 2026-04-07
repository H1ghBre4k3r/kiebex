import { clearCurrentSession } from "@/lib/auth";
import { jsonOk } from "@/lib/http";

export async function POST(): Promise<Response> {
  await clearCurrentSession();

  return jsonOk({
    message: "Logged out successfully.",
  });
}
