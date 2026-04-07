import { jsonOk } from "@/lib/http";

export async function GET(): Promise<Response> {
  return jsonOk({
    service: "kiel-beer-index",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
}
