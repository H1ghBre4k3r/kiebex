import { getContentType, getMetrics } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const metrics = await getMetrics();
  return new Response(metrics, {
    status: 200,
    headers: {
      "Content-Type": getContentType(),
      "Cache-Control": "no-cache",
    },
  });
}
