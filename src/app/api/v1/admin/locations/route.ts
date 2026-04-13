import { jsonOk } from "@/lib/http";
import { createLocation, logModerationAction } from "@/lib/query";
import { parseJsonBody, withApiAdmin } from "@/lib/route-handlers";
import { createAdminLocationBodySchema } from "@/lib/validation";

export async function POST(request: Request): Promise<Response> {
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

    return jsonOk({ location }, { status: 201 });
  });
}
