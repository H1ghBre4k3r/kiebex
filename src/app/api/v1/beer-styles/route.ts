import { jsonOk } from "@/lib/http";
import { getBeerStyles } from "@/lib/query";
import { withMetrics } from "@/lib/route-handlers";

async function getStyles(): Promise<Response> {
  const styles = await getBeerStyles();
  return jsonOk({
    count: styles.length,
    styles,
  });
}

export const GET = withMetrics("GET", "/api/v1/beer-styles", getStyles);
