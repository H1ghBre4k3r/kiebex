import { jsonError, jsonOk } from "@/lib/http";
import { deleteReview, updateReview } from "@/lib/query";
import { parseJsonBody, withApiAuth } from "@/lib/route-handlers";
import { updateReviewBodySchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ reviewId: string }> };

export async function PATCH(request: Request, { params }: RouteContext): Promise<Response> {
  return withApiAuth(async (user) => {
    const { reviewId } = await params;
    const parsed = await parseJsonBody(request, updateReviewBodySchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    const review = await updateReview(reviewId, user.id, parsed.data);

    if (!review) {
      return jsonError(
        404,
        "REVIEW_NOT_FOUND",
        "Review not found or you do not have permission to edit it.",
      );
    }

    return jsonOk({ review });
  });
}

export async function DELETE(_request: Request, { params }: RouteContext): Promise<Response> {
  return withApiAuth(async (user) => {
    const { reviewId } = await params;

    const deleted = await deleteReview(reviewId, user.id);

    if (!deleted) {
      return jsonError(
        404,
        "REVIEW_NOT_FOUND",
        "Review not found or you do not have permission to delete it.",
      );
    }

    return jsonOk({ message: "Review deleted." });
  });
}
