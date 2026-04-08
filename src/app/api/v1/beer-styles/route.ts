import { jsonOk } from "@/lib/http";
import { getBeerStyles } from "@/lib/query";

export async function GET(): Promise<Response> {
  const styles = await getBeerStyles();
  return jsonOk({
    count: styles.length,
    styles,
  });
}
