"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { requestApi } from "@/lib/client-api";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className }: LogoutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) {
      return;
    }

    setPending(true);

    const result = await requestApi<{ message?: string }>(
      "/api/v1/auth/logout",
      { method: "POST" },
      "Unable to sign out.",
    );

    if (result.ok) {
      router.refresh();
    } else {
      setPending(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={pending} className={className}>
      {pending ? "Signing out..." : "Sign Out"}
    </button>
  );
}
