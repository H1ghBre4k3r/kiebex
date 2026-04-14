import { jsonOk, jsonError } from "@/lib/http";
import { withApiAuth, parseJsonBody } from "@/lib/route-handlers";
import { createReport, hasUserReportedContent } from "@/lib/query";
import { createReportBodySchema } from "@/lib/validation";
import type { ReportContentType, ReportReason } from "@/lib/types";

export async function POST(request: Request): Promise<Response> {
  return withApiAuth(async (user) => {
    const parsed = await parseJsonBody(request, createReportBodySchema);
    if (!parsed.ok) return parsed.response;

    const { contentType, contentId, reason, note } = parsed.data;

    // Prevent duplicate open reports from the same user for the same content.
    const alreadyReported = await hasUserReportedContent(
      user.id,
      contentType as ReportContentType,
      contentId,
    );

    if (alreadyReported) {
      return jsonError(409, "ALREADY_REPORTED", "You have already reported this content.");
    }

    const report = await createReport({
      reporterId: user.id,
      contentType: contentType as ReportContentType,
      contentId,
      reason: reason as ReportReason,
      note,
    });

    return jsonOk({ report }, { status: 201 });
  });
}
