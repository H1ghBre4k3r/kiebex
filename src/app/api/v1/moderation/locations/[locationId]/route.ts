import { ForbiddenError, UnauthorizedError, requireModeratorUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import {
  deleteModerationLocation,
  editModerationLocation,
  logModerationAction,
  moderateLocationSubmission,
} from "@/lib/query";
import { editModerationLocationBodySchema, moderationDecisionSchema } from "@/lib/validation";

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
  context: { params: Promise<{ locationId: string }> },
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

    const { locationId } = await context.params;
    const location = await moderateLocationSubmission(locationId, parsed.data.status);

    if (!location) {
      return jsonError(
        404,
        "LOCATION_SUBMISSION_NOT_FOUND",
        `No pending location submission found for id '${locationId}'.`,
      );
    }

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: parsed.data.status === "approved" ? "approve" : "reject",
      contentType: "location",
      contentId: locationId,
    });

    return jsonOk({ location });
  });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ locationId: string }> },
): Promise<Response> {
  return withModerator(async (moderator) => {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const parsed = editModerationLocationBodySchema.safeParse(body);

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

    const { locationId } = await context.params;
    const location = await editModerationLocation(locationId, parsed.data);

    if (!location) {
      return jsonError(404, "LOCATION_NOT_FOUND", `No location found for id '${locationId}'.`);
    }

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: "edit",
      contentType: "location",
      contentId: locationId,
      details: { fields: Object.keys(parsed.data) },
    });

    return jsonOk({ location });
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ locationId: string }> },
): Promise<Response> {
  return withModerator(async (moderator) => {
    const { locationId } = await context.params;
    const deleted = await deleteModerationLocation(locationId);

    if (!deleted) {
      return jsonError(404, "LOCATION_NOT_FOUND", `No location found for id '${locationId}'.`);
    }

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: "delete",
      contentType: "location",
      contentId: locationId,
    });

    return jsonOk({ deleted: true });
  });
}
