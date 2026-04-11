import { ForbiddenError, UnauthorizedError, requireAdminUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { deleteModerationVariant, editAdminVariant, logModerationAction } from "@/lib/query";
import { editAdminVariantBodySchema } from "@/lib/validation";

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
  context: { params: Promise<{ variantId: string }> },
): Promise<Response> {
  return withAdmin(async (admin) => {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const parsed = editAdminVariantBodySchema.safeParse(body);

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
    const result = await editAdminVariant(variantId, parsed.data);

    if (!result) {
      return jsonError(404, "VARIANT_NOT_FOUND", `No variant found for id '${variantId}'.`);
    }

    await logModerationAction({
      moderatorId: admin.id,
      moderatorName: admin.displayName,
      action: "edit",
      contentType: "variant",
      contentId: variantId,
      details: {
        name: result.variant.name,
        previousName: result.previousName,
        style: result.variant.style?.name,
        previousStyle: result.previousStyle,
        fields: Object.keys(parsed.data),
      },
    });

    return jsonOk({ variant: result.variant });
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ variantId: string }> },
): Promise<Response> {
  return withAdmin(async (admin) => {
    const { variantId } = await context.params;
    const result = await deleteModerationVariant(variantId);

    if (!result.deleted) {
      return jsonError(404, "VARIANT_NOT_FOUND", `No variant found for id '${variantId}'.`);
    }

    await logModerationAction({
      moderatorId: admin.id,
      moderatorName: admin.displayName,
      action: "delete",
      contentType: "variant",
      contentId: variantId,
      details: { name: result.name },
    });

    return jsonOk({ deleted: true });
  });
}
