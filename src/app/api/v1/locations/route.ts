import { jsonError, jsonOk } from "@/lib/http";
import { isPrismaErrorCode } from "@/lib/prisma-errors";
import { createLocation } from "@/lib/query";
import { parseJsonBody, withApiAuth } from "@/lib/route-handlers";
import { createLocationBodySchema } from "@/lib/validation";

export async function POST(request: Request): Promise<Response> {
  return withApiAuth(async (user) => {
    const parsed = await parseJsonBody(request, createLocationBodySchema);

    if (!parsed.ok) {
      return parsed.response;
    }

    try {
      const location = await createLocation({
        ...parsed.data,
        createdById: user.id,
        status: "pending",
      });

      return jsonOk({ location }, { status: 201 });
    } catch (error) {
      if (isPrismaErrorCode(error, "P2002")) {
        return jsonError(409, "LOCATION_CONFLICT", "A conflicting location already exists.");
      }

      throw error;
    }
  });
}
