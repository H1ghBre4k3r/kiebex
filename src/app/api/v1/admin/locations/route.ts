import { jsonOk } from "@/lib/http";
import { invalidatePublicDirectoryFilterMetadataCache } from "@/lib/public-directory-cache";
import { createLocation, logModerationAction } from "@/lib/query";
import { parseJsonBody, withApiAdmin, withMetrics } from "@/lib/route-handlers";
import { createAdminLocationBodySchema } from "@/lib/validation";

async function postHandler(request: Request): Promise<Response> {
  return withApiAdmin(async (admin) => {
    const parsed = await parseJsonBody(request, createAdminLocationBodySchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    const location = await createLocation({
      name: parsed.data.name,
      locationType: parsed.data.locationType,
      district: parsed.data.district,
      address: parsed.data.address,
      createdById: admin.id,
      status: "approved",
    });

    await logModerationAction({
      moderatorId: admin.id,
      moderatorName: admin.displayName,
      action: "approve",
      contentType: "location",
      contentId: location.id,
      details: {
        name: location.name,
        locationType: location.locationType,
        district: location.district,
        address: location.address,
      },
    });

    invalidatePublicDirectoryFilterMetadataCache();

    return jsonOk({ location }, { status: 201 });
  });
}

export const POST = withMetrics("POST", "/api/v1/admin/locations", postHandler);
