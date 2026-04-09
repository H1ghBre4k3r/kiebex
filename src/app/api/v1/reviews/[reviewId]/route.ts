import { UnauthorizedError, requireAuthUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { deleteReview, updateReview } from "@/lib/query";
import { updateReviewBodySchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ reviewId: string }> };

export async function PATCH(request: Request, { params }: RouteContext): Promise<Response> {
  let userId: string;

  try {
    const user = await requireAuthUser();
    userId = user.id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }

    throw error;
  }

  const { reviewId } = await params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = updateReviewBodySchema.safeParse(body);

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

  const review = await updateReview(reviewId, userId, parsed.data);

  if (!review) {
    return jsonError(
      404,
      "REVIEW_NOT_FOUND",
      "Review not found or you do not have permission to edit it.",
    );
  }

  return jsonOk({ review });
}

export async function DELETE(_request: Request, { params }: RouteContext): Promise<Response> {
  let userId: string;

  try {
    const user = await requireAuthUser();
    userId = user.id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }

    throw error;
  }

  const { reviewId } = await params;

  const deleted = await deleteReview(reviewId, userId);

  if (!deleted) {
    return jsonError(
      404,
      "REVIEW_NOT_FOUND",
      "Review not found or you do not have permission to delete it.",
    );
  }

  return jsonOk({ message: "Review deleted." });
}
