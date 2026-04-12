import { Prisma } from "@/generated/prisma/client";
import { ForbiddenError, UnauthorizedError, requireAdminUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { deleteAdminStyle, editAdminStyle, logModerationAction } from "@/lib/query";
import type { BeerStyle } from "@/lib/types";
import { editAdminStyleBodySchema } from "@/lib/validation";

function isKnownRequestError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

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
  context: { params: Promise<{ styleId: string }> },
): Promise<Response> {
  return withAdmin(async (admin) => {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const parsed = editAdminStyleBodySchema.safeParse(body);

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

    const { styleId } = await context.params;

    let result: { style: BeerStyle; previousName: string } | null;

    try {
      result = await editAdminStyle(styleId, parsed.data.name);
    } catch (error) {
      if (isKnownRequestError(error) && error.code === "P2002") {
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
  return withAdmin(async (admin) => {
    const { styleId } = await context.params;

    let result: { deleted: false } | { deleted: true; name: string };

    try {
      result = await deleteAdminStyle(styleId);
    } catch (error) {
      if (isKnownRequestError(error) && error.code === "P2003") {
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
