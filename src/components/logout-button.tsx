"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

    try {
      const response = await fetch("/api/v1/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        setPending(false);
        return;
      }

      router.refresh();
    } catch {
      setPending(false);
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={pending} className={className}>
      {pending ? "Signing out..." : "Sign Out"}
    </button>
  );
}
