import { jsonError, jsonOk } from "@/lib/http";
import { isPrismaErrorCode } from "@/lib/prisma";
import { createAdminStyle, logModerationAction } from "@/lib/query";
import { parseJsonBody, withApiAdmin } from "@/lib/route-handlers";
import { createAdminStyleBodySchema } from "@/lib/validation";

export async function POST(request: Request): Promise<Response> {
  return withApiAdmin(async (admin) => {
    const parsed = await parseJsonBody(request, createAdminStyleBodySchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    let style;

    try {
      style = await createAdminStyle(parsed.data.name);
    } catch (error) {
      if (isPrismaErrorCode(error, "P2002")) {
        return jsonError(409, "STYLE_NAME_CONFLICT", "A beer style with that name already exists.");
      }

      throw error;
    }

    if (!style) {
      return jsonError(409, "STYLE_NAME_CONFLICT", "A beer style with that name already exists.");
    }

    await logModerationAction({
      moderatorId: admin.id,
      moderatorName: admin.displayName,
      action: "approve",
      contentType: "style",
      contentId: style.id,
      details: { name: parsed.data.name },
    });

    return jsonOk({ style }, { status: 201 });
  });
}
