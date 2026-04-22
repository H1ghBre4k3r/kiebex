import { jsonError, jsonOk } from "@/lib/http";
import { invalidatePendingQueueCountCache } from "@/lib/pending-queue-cache";
import { invalidatePublicDirectoryFilterMetadataCache } from "@/lib/public-directory-cache";
import {
  deleteModerationLocation,
  editModerationLocation,
  logModerationAction,
  moderateLocationSubmission,
} from "@/lib/query";
import { parseJsonBody, withApiModerator, withMetrics } from "@/lib/route-handlers";
import { editModerationLocationBodySchema, moderationDecisionSchema } from "@/lib/validation";

async function patchHandler(
  request: Request,
  context: { params: Promise<{ locationId: string }> },
): Promise<Response> {
  return withApiModerator(async (moderator) => {
    const parsed = await parseJsonBody(request, moderationDecisionSchema);

    if (!parsed.ok) {
      return parsed.response;
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

    invalidatePendingQueueCountCache();
    invalidatePublicDirectoryFilterMetadataCache();

    return jsonOk({ location });
  });
}

async function putHandler(
  request: Request,
  context: { params: Promise<{ locationId: string }> },
): Promise<Response> {
  return withApiModerator(async (moderator) => {
    const parsed = await parseJsonBody(request, editModerationLocationBodySchema);

    if (!parsed.ok) {
      return parsed.response;
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

    invalidatePendingQueueCountCache();
    invalidatePublicDirectoryFilterMetadataCache();

    return jsonOk({ location: result.location });
  });
}

async function deleteHandler(
  _request: Request,
  context: { params: Promise<{ locationId: string }> },
): Promise<Response> {
  return withApiModerator(async (moderator) => {
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

    invalidatePendingQueueCountCache();
    invalidatePublicDirectoryFilterMetadataCache();

    return jsonOk({ deleted: true });
  });
}

export const PATCH = withMetrics("PATCH", "/api/v1/moderation/locations/:id", patchHandler);
export const PUT = withMetrics("PUT", "/api/v1/moderation/locations/:id", putHandler);
export const DELETE = withMetrics("DELETE", "/api/v1/moderation/locations/:id", deleteHandler);
