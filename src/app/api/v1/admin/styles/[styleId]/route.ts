import { jsonError, jsonOk } from "@/lib/http";
import { isPrismaErrorCode } from "@/lib/prisma-errors";
import { deleteAdminStyle, editAdminStyle, logModerationAction } from "@/lib/query";
import { parseJsonBody, withApiAdmin } from "@/lib/route-handlers";
import type { BeerStyle } from "@/lib/types";
import { editAdminStyleBodySchema } from "@/lib/validation";

export async function PUT(
  request: Request,
  context: { params: Promise<{ styleId: string }> },
): Promise<Response> {
  return withApiAdmin(async (admin) => {
    const parsed = await parseJsonBody(request, editAdminStyleBodySchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    const { styleId } = await context.params;

    let result: { style: BeerStyle; previousName: string } | null;

    try {
      result = await editAdminStyle(styleId, parsed.data.name);
    } catch (error) {
      if (isPrismaErrorCode(error, "P2002")) {
        return jsonError(409, "STYLE_NAME_CONFLICT", "A beer style with that name already exists.");
      }

      throw error;
    }

    if (!result) {
      return jsonError(404, "STYLE_NOT_FOUND", `No beer style found for id '${styleId}'.`);
    }

    await logModerationAction({
      moderatorId: admin.id,
      moderatorName: admin.displayName,
      action: "edit",
      contentType: "style",
      contentId: styleId,
      details: { name: result.style.name, previousName: result.previousName },
    });

    return jsonOk({ style: result.style });
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ styleId: string }> },
): Promise<Response> {
  return withApiAdmin(async (admin) => {
    const { styleId } = await context.params;

    let result: { deleted: false } | { deleted: true; name: string };

    try {
      result = await deleteAdminStyle(styleId);
    } catch (error) {
      if (isPrismaErrorCode(error, "P2003")) {
        return jsonError(
          409,
          "STYLE_IN_USE",
          "This beer style is used by one or more variants and cannot be deleted.",
        );
      }

      throw error;
    }

    if (!result.deleted) {
      return jsonError(404, "STYLE_NOT_FOUND", `No beer style found for id '${styleId}'.`);
    }

    await logModerationAction({
      moderatorId: admin.id,
      moderatorName: admin.displayName,
      action: "delete",
      contentType: "style",
      contentId: styleId,
      details: { name: result.name },
    });

    return jsonOk({ deleted: true });
  });
}
