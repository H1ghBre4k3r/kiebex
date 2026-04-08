import { ForbiddenError, UnauthorizedError, requireModeratorUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { moderateBeerBrandSubmission } from "@/lib/query";
import { moderationDecisionSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ brandId: string }> },
): Promise<Response> {
  try {
    await requireModeratorUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }

    if (error instanceof ForbiddenError) {
      return jsonError(403, "FORBIDDEN", "Moderator permissions required.");
    }

    throw error;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = moderationDecisionSchema.safeParse(body);

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

  const { brandId } = await context.params;
  const brand = await moderateBeerBrandSubmission(brandId, parsed.data.status);

  if (!brand) {
    return jsonError(
      404,
      "BRAND_SUBMISSION_NOT_FOUND",
      `No pending beer brand submission found for id '${brandId}'.`,
    );
  }

  return jsonOk({ brand });
}
