import { ForbiddenError, UnauthorizedError, requireModeratorUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import {
  deleteModerationBrand,
  logModerationAction,
  moderateBeerBrandSubmission,
} from "@/lib/query";
import { moderationDecisionSchema } from "@/lib/validation";

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
  context: { params: Promise<{ brandId: string }> },
): Promise<Response> {
  return withModerator(async (moderator) => {
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

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: parsed.data.status === "approved" ? "approve" : "reject",
      contentType: "brand",
      contentId: brandId,
    });

    return jsonOk({ brand });
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ brandId: string }> },
): Promise<Response> {
  return withModerator(async (moderator) => {
    const { brandId } = await context.params;
    const deleted = await deleteModerationBrand(brandId);

    if (!deleted) {
      return jsonError(404, "BRAND_NOT_FOUND", `No beer brand found for id '${brandId}'.`);
    }

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: "delete",
      contentType: "brand",
      contentId: brandId,
    });

    return jsonOk({ deleted: true });
  });
}
