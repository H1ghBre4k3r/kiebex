import { requestApi } from "@/lib/client-api";

type RunAdminMutationOptions = {
  input: RequestInfo | URL;
  init: RequestInit;
  fallbackMessage: string;
  onSuccess?: () => void;
  refresh?: () => void;
};

export async function runAdminMutation({
  input,
  init,
  fallbackMessage,
  onSuccess,
  refresh,
}: RunAdminMutationOptions): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await requestApi<null>(input, init, fallbackMessage);

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  onSuccess?.();
  refresh?.();

  return { ok: true };
}
