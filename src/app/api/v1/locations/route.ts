import { Prisma } from "@/generated/prisma/client";
import { UnauthorizedError, requireAuthUser } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { createLocation } from "@/lib/query";
import { createLocationBodySchema } from "@/lib/validation";

function isKnownRequestError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

export async function POST(request: Request): Promise<Response> {
  let userId: string;

  try {
    const user = await requireAuthUser();
    userId = user.id;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(401, "UNAUTHORIZED", "Authentication required.");
    }

    throw error;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = createLocationBodySchema.safeParse(body);

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

  try {
    const location = await createLocation({
      ...parsed.data,
      createdById: userId,
      status: "pending",
    });

    return jsonOk({ location }, { status: 201 });
  } catch (error) {
    if (isKnownRequestError(error) && error.code === "P2002") {
      return jsonError(409, "LOCATION_CONFLICT", "A conflicting location already exists.");
    }

    throw error;
  }
}
