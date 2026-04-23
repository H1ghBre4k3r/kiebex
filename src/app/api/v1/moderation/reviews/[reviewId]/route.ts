import { jsonError, jsonOk } from "@/lib/http";
import { invalidatePendingQueueCountCache } from "@/lib/pending-queue-cache";
import {
  deleteModerationReview,
  editModerationReview,
  getReviewStatusById,
  logModerationAction,
  moderateReviewDecision,
} from "@/lib/query";
import { parseJsonBody, withApiModerator, withMetrics } from "@/lib/route-handlers";
import { editModerationReviewBodySchema, reviewModerationDecisionSchema } from "@/lib/validation";

async function patchHandler(
  request: Request,
  context: { params: Promise<{ reviewId: string }> },
): Promise<Response> {
  return withApiModerator(async (moderator) => {
    const parsed = await parseJsonBody(request, reviewModerationDecisionSchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    const { reviewId } = await context.params;

    const currentStatus = await getReviewStatusById(reviewId);

    if (currentStatus === null) {
      return jsonError(404, "REVIEW_NOT_FOUND", `No review found for id '${reviewId}'.`);
    }

    if (currentStatus === "approved") {
      return jsonError(
        409,
        "REVIEW_ALREADY_APPROVED",
        "Approved reviews cannot have their status changed. Use Edit or Delete instead.",
      );
    }

    const review = await moderateReviewDecision(reviewId, parsed.data.status);

    if (!review) {
      return jsonError(404, "REVIEW_NOT_FOUND", `No review found for id '${reviewId}'.`);
    }

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: parsed.data.status === "approved" ? "approve" : "reject",
      contentType: "review",
      contentId: reviewId,
      details: {
        rating: review.rating,
        title: review.title,
        author: review.author.displayName,
        locationName: review.locationName,
      },
    });

    invalidatePendingQueueCountCache();

    return jsonOk({ review });
  });
}

async function putHandler(
  request: Request,
  context: { params: Promise<{ reviewId: string }> },
): Promise<Response> {
  return withApiModerator(async (moderator) => {
    const parsed = await parseJsonBody(request, editModerationReviewBodySchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    const { reviewId } = await context.params;
    const review = await editModerationReview(reviewId, parsed.data);

    if (!review) {
      return jsonError(404, "REVIEW_NOT_FOUND", `No review found for id '${reviewId}'.`);
    }

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: "edit",
      contentType: "review",
      contentId: reviewId,
      details: {
        rating: review.rating,
        title: review.title,
        author: review.author.displayName,
        locationName: review.locationName,
        fields: Object.keys(parsed.data).filter(
          (k) => parsed.data[k as keyof typeof parsed.data] !== undefined,
        ),
      },
    });

    return jsonOk({ review });
  });
}

async function deleteHandler(
  _request: Request,
  context: { params: Promise<{ reviewId: string }> },
): Promise<Response> {
  return withApiModerator(async (moderator) => {
    const { reviewId } = await context.params;
    const result = await deleteModerationReview(reviewId);

    if (!result.deleted) {
      return jsonError(404, "REVIEW_NOT_FOUND", `No review found for id '${reviewId}'.`);
    }

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: "delete",
      contentType: "review",
      contentId: reviewId,
      details: {
        rating: result.rating,
        title: result.title,
        author: result.author,
        locationName: result.locationName,
      },
    });

    invalidatePendingQueueCountCache();

    return jsonOk({ deleted: true });
  });
}

export const PATCH = withMetrics("PATCH", "/api/v1/moderation/reviews/:id", patchHandler);
export const PUT = withMetrics("PUT", "/api/v1/moderation/reviews/:id", putHandler);
export const DELETE = withMetrics("DELETE", "/api/v1/moderation/reviews/:id", deleteHandler);
