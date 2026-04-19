import { jsonOk, jsonError } from "@/lib/http";
import { withApiModerator, parseJsonBody, withMetrics } from "@/lib/route-handlers";
import { resolveReport, getReportById, logModerationAction } from "@/lib/query";
import { resolveReportBodySchema } from "@/lib/validation";

async function patchHandler(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
): Promise<Response> {
  return withApiModerator(async (moderator) => {
    const { reportId } = await params;

    const parsed = await parseJsonBody(request, resolveReportBodySchema);
    if (!parsed.ok) return parsed.response;

    const { decision } = parsed.data;

    const existing = await getReportById(reportId);
    if (!existing) {
      return jsonError(404, "NOT_FOUND", "Report not found.");
    }

    if (existing.status !== "open") {
      return jsonError(409, "ALREADY_RESOLVED", "This report has already been resolved.");
    }

    const resolved = await resolveReport(reportId, decision, moderator.id);
    if (!resolved) {
      return jsonError(404, "NOT_FOUND", "Report not found or already resolved.");
    }

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: decision === "dismissed" ? "dismiss" : "action",
      contentType: "report",
      contentId: reportId,
      details: {
        contentType: existing.contentType,
        contentId: existing.contentId,
        reason: existing.reason,
        reporter: existing.reporter?.displayName ?? "unknown",
        decision,
      },
    });

    return jsonOk({ report: resolved });
  });
}

export const PATCH = withMetrics("PATCH", "/api/v1/moderation/reports/:id", patchHandler);
