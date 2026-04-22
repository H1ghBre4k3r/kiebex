import { revalidateTag, unstable_cache } from "next/cache";
import { getPendingQueueCount } from "@/lib/query";

const PENDING_QUEUE_COUNT_TAG = "pending-queue-count";

function isMissingRevalidateContextError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes("static generation store missing in revalidateTag")
  );
}

const getCachedPendingQueueCountInternal = unstable_cache(
  async () => getPendingQueueCount(),
  ["pending-queue-count"],
  {
    tags: [PENDING_QUEUE_COUNT_TAG],
  },
);

export async function getCachedPendingQueueCount(): Promise<number> {
  return getCachedPendingQueueCountInternal();
}

export function invalidatePendingQueueCountCache(): void {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  try {
    revalidateTag(PENDING_QUEUE_COUNT_TAG, "max");
  } catch (error) {
    if (isMissingRevalidateContextError(error)) {
      return;
    }

    throw error;
  }
}
