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
      details: {
        name: location.name,
        locationType: location.locationType,
        district: location.district,
        address: location.address,
      },
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
    const result = await editModerationLocation(locationId, parsed.data);

    if (!result) {
      return jsonError(404, "LOCATION_NOT_FOUND", `No location found for id '${locationId}'.`);
    }

    const logDetails: Record<string, unknown> = {
      name: result.location.name,
      locationType: result.location.locationType,
      district: result.location.district,
      address: result.location.address,
      fields: Object.keys(parsed.data),
    };
    if (parsed.data.name !== undefined) {
      logDetails.previousName = result.previousName;
    }
    if (parsed.data.locationType !== undefined) {
      logDetails.previousLocationType = result.previousLocationType;
    }
    if (parsed.data.district !== undefined) {
      logDetails.previousDistrict = result.previousDistrict;
    }
    if (parsed.data.address !== undefined) {
      logDetails.previousAddress = result.previousAddress;
    }

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: "edit",
      contentType: "location",
      contentId: locationId,
      details: logDetails,
    });

    return jsonOk({ location: result.location });
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ locationId: string }> },
): Promise<Response> {
  return withModerator(async (moderator) => {
    const { locationId } = await context.params;
    const result = await deleteModerationLocation(locationId);

    if (!result.deleted) {
      return jsonError(404, "LOCATION_NOT_FOUND", `No location found for id '${locationId}'.`);
    }

    await logModerationAction({
      moderatorId: moderator.id,
      moderatorName: moderator.displayName,
      action: "delete",
      contentType: "location",
      contentId: locationId,
      details: {
        name: result.name,
        locationType: result.locationType,
        district: result.district,
        address: result.address,
      },
    });

    return jsonOk({ deleted: true });
  });
}
