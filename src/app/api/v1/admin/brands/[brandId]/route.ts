import { ForbiddenError, UnauthorizedError, requireAdminUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { deleteModerationBrand, editAdminBrand, logModerationAction } from "@/lib/query";
import { editAdminBrandBodySchema } from "@/lib/validation";

async function withAdmin(
  handler: (admin: { id: string; displayName: string }) => Promise<Response>,
): Promise<Response> {
  let admin: { id: string; displayName: string };

  try {
    admin = await requireAdminUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }

    if (error instanceof ForbiddenError) {
      return jsonError(403, "FORBIDDEN", "Admin permissions required.");
    }

    throw error;
  }

  return handler(admin);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ brandId: string }> },
): Promise<Response> {
  return withAdmin(async (admin) => {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const parsed = editAdminBrandBodySchema.safeParse(body);

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
    const result = await editAdminBrand(brandId, parsed.data.name);

    if (!result) {
      return jsonError(404, "BRAND_NOT_FOUND", `No brand found for id '${brandId}'.`);
    }

    await logModerationAction({
      moderatorId: admin.id,
      moderatorName: admin.displayName,
      action: "edit",
      contentType: "brand",
      contentId: brandId,
      details: { name: result.brand.name, previousName: result.previousName },
    });

    return jsonOk({ brand: result.brand });
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ brandId: string }> },
): Promise<Response> {
  return withAdmin(async (admin) => {
    const { brandId } = await context.params;
    const result = await deleteModerationBrand(brandId);

    if (!result.deleted) {
      return jsonError(404, "BRAND_NOT_FOUND", `No brand found for id '${brandId}'.`);
    }

    await logModerationAction({
      moderatorId: admin.id,
      moderatorName: admin.displayName,
      action: "delete",
      contentType: "brand",
      contentId: brandId,
      details: { name: result.name },
    });

    return jsonOk({ deleted: true });
  });
}
