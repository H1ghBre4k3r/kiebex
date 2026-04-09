import { Prisma } from "@/generated/prisma/client";
import { ForbiddenError, UnauthorizedError, requireAdminUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { createAdminStyle, logModerationAction } from "@/lib/query";
import { createAdminStyleBodySchema } from "@/lib/validation";

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

export async function POST(request: Request): Promise<Response> {
  return withAdmin(async (admin) => {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
    }

    const parsed = createAdminStyleBodySchema.safeParse(body);

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

    let style;

    try {
      style = await createAdminStyle(parsed.data.name);
    } catch (error) {
      if (isKnownRequestError(error) && error.code === "P2002") {
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
