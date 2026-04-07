import { ForbiddenError, UnauthorizedError, requireModeratorUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { moderateBeerVariantSubmission } from "@/lib/query";
import { moderationDecisionSchema } from "@/lib/validation";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ variantId: string }> },
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

  const { variantId } = await context.params;
  const result = await moderateBeerVariantSubmission(variantId, parsed.data.status);

  if (result.outcome !== "updated") {
    if (result.outcome === "missing") {
      return jsonError(
        404,
        "VARIANT_SUBMISSION_NOT_FOUND",
        `No pending beer variant submission found for id '${variantId}'.`,
      );
    }

    return jsonError(
      409,
      "BRAND_NOT_APPROVED",
      "Cannot approve a variant while its brand is not approved.",
    );
  }

  return jsonOk({ variant: result.variant });
}
