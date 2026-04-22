import "server-only";

export type TestEmailKind = "verification" | "change_email_verification" | "password_reset";

export type CapturedTestEmail = {
  kind: TestEmailKind;
  to: string;
  subject: string;
  text: string;
  html: string;
  actionUrl: string;
  createdAt: Date;
};

type TestEmailStore = {
  messages: CapturedTestEmail[];
};

const MAX_CAPTURED_TEST_EMAILS = 100;

function getStore(): TestEmailStore {
  const globalStore = globalThis as typeof globalThis & {
    __kbiTestEmailStore?: TestEmailStore;
  };

  if (!globalStore.__kbiTestEmailStore) {
    globalStore.__kbiTestEmailStore = { messages: [] };
  }

  return globalStore.__kbiTestEmailStore;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isTestEmailCaptureEnabled(): boolean {
  return process.env.E2E_TEST_MODE === "true" || process.env.TEST_EMAIL_CAPTURE === "true";
}

export function captureTestEmail(
  email: Omit<CapturedTestEmail, "createdAt" | "to"> & { to: string },
): CapturedTestEmail {
  const captured: CapturedTestEmail = {
    ...email,
    to: normalizeEmail(email.to),
    createdAt: new Date(),
  };

  const store = getStore();
  store.messages.push(captured);

  if (store.messages.length > MAX_CAPTURED_TEST_EMAILS) {
    store.messages.splice(0, store.messages.length - MAX_CAPTURED_TEST_EMAILS);
  }

  return captured;
}

export function getLatestCapturedTestEmail(filter: {
  kind: TestEmailKind;
  to: string;
}): CapturedTestEmail | null {
  const to = normalizeEmail(filter.to);
  const messages = getStore().messages;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.kind === filter.kind && message.to === to) {
      return message;
    }
  }

  return null;
}

export function clearCapturedTestEmails(): void {
  getStore().messages.length = 0;
}
