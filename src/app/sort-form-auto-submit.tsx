"use client";

import { useEffect } from "react";

type Props = {
  formId: string;
};

export function SortFormAutoSubmit({ formId }: Props) {
  useEffect(() => {
    const formElement = document.getElementById(formId);

    if (!(formElement instanceof HTMLFormElement)) {
      return;
    }

    const form = formElement;

    function handleChange(event: Event) {
      if (event.target instanceof HTMLInputElement) {
        form.requestSubmit();
      }
    }

    form.addEventListener("change", handleChange);
    return () => {
      form.removeEventListener("change", handleChange);
    };
  }, [formId]);

  return null;
}
