import { ForbiddenError, UnauthorizedError, requireModeratorUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import {
  deleteModerationReview,
  editModerationReview,
  logModerationAction,
  moderateReviewDecision,
} from "@/lib/query";
import { editModerationReviewBodySchema, reviewModerationDecisionSchema } from "@/lib/validation";

async function withModerator(
  handler: (moderator: { id: string; displayName: string }) => Promise<Response>,
): Promise<Response> {
  let moderator: { id: string; displayName: string };

  try {
    moderator = await requireModeratorUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }

    if (error instanceof ForbiddenError) {
      return jsonError(403, "FORBIDDEN", "Moderator permissions required.");
    }

    throw error;
  }

  return handler(moderator);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ reviewId: string }> },
): Promise<Response> {
  return withModerator(async (moderator) => {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const parsed = reviewModerationDecisionSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        400,
        "INVALID_BODY",
        "One or more fields are invalid.",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      );
    }

    const { reviewId } = await context.params;
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
    });

    return jsonOk({ review });
  });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ reviewId: string }> },
): Promise<Response> {
  return withModerator(async (moderator) => {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const parsed = editModerationReviewBodySchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        400,
        "INVALID_BODY",
        "One or more fields are invalid.",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      );
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
        fields: Object.keys(parsed.data).filter(
          (k) => parsed.data[k as keyof typeof parsed.data] !== undefined,
        ),
      },
    });

    return jsonOk({ review });
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ reviewId: string }> },
): Promise<Response> {
  return withModerator(async (moderator) => {
    const { reviewId } = await context.params;
    const deleted = await deleteModerationReview(reviewId);

    if (!deleted) {
      return jsonError(404, "REVIEW_NOT_FOUND", `No review found for id '${reviewId}'.`);
    }

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: "delete",
      contentType: "review",
      contentId: reviewId,
    });

    return jsonOk({ deleted: true });
  });
}
