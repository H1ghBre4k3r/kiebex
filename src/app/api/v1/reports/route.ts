import { jsonOk, jsonError } from "@/lib/http";
import { invalidatePendingQueueCountCache } from "@/lib/pending-queue-cache";
import { withApiAuth, parseJsonBody, withMetrics } from "@/lib/route-handlers";
import { createReport, hasUserReportedContent } from "@/lib/query";
import { createReportBodySchema } from "@/lib/validation";
import type { ReportContentType, ReportReason } from "@/lib/types";

async function postReport(request: Request): Promise<Response> {
  return withApiAuth(async (user) => {
    const parsed = await parseJsonBody(request, createReportBodySchema);
    if (!parsed.ok) return parsed.response;

    const { contentType, contentId, reason, note } = parsed.data;

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

    invalidatePendingQueueCountCache();

    return jsonOk({ report }, { status: 201 });
  });
}

export const POST = withMetrics("POST", "/api/v1/reports", postReport);
