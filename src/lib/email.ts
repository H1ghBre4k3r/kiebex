import "server-only";

import { createTransport } from "nodemailer";
import { logger } from "@/lib/logger";

function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

export async function sendVerificationEmail(to: string, verificationUrl: string): Promise<void> {
  const subject = "Verify your Kiel Beer Index account";
  const text = [
    "Welcome to Kiel Beer Index!",
    "",
    "Please verify your email address by visiting the link below:",
    "",
    verificationUrl,
    "",
    "This link expires in 24 hours.",
    "",
    "If you did not create an account, you can safely ignore this email.",
  ].join("\n");

  const html = `
<p>Welcome to <strong>Kiel Beer Index</strong>!</p>
<p>Please verify your email address by clicking the link below:</p>
<p><a href="${verificationUrl}">${verificationUrl}</a></p>
<p>This link expires in <strong>24 hours</strong>.</p>
<p>If you did not create an account, you can safely ignore this email.</p>
`.trim();

  if (!isSmtpConfigured()) {
    logger.info("Email verification (SMTP not configured — logging link instead)", {
      to,
      verificationUrl,
    });
    return;
  }

  const transport = createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "noreply@kiel-beer-index.de",
    to,
    subject,
    text,
    html,
  });

  logger.info("Verification email sent", { to });
}

export async function sendEmailChangeVerificationEmail(
  to: string,
  verificationUrl: string,
): Promise<void> {
  const subject = "Confirm your new Kiel Beer Index email address";
  const text = [
    "You requested an email address change on Kiel Beer Index.",
    "",
    "Please confirm your new email address by visiting the link below:",
    "",
    verificationUrl,
    "",
    "This link expires in 24 hours.",
    "",
    "If you did not request this change, you can safely ignore this email.",
  ].join("\n");

  const html = `
<p>You requested an email address change on <strong>Kiel Beer Index</strong>.</p>
<p>Please confirm your new email address by clicking the link below:</p>
<p><a href="${verificationUrl}">${verificationUrl}</a></p>
<p>This link expires in <strong>24 hours</strong>.</p>
<p>If you did not request this change, you can safely ignore this email.</p>
`.trim();

  if (!isSmtpConfigured()) {
    logger.info("Email change verification (SMTP not configured — logging link instead)", {
      to,
      verificationUrl,
    });
    return;
  }

  const transport = createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "noreply@kiel-beer-index.de",
    to,
    subject,
    text,
    html,
  });

  logger.info("Email change verification email sent", { to });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const subject = "Reset your Kiel Beer Index password";
  const text = [
    "You requested a password reset for your Kiel Beer Index account.",
    "",
    "Click the link below to choose a new password:",
    "",
    resetUrl,
    "",
    "This link expires in 1 hour.",
    "",
    "If you did not request a password reset, you can safely ignore this email.",
  ].join("\n");

  const html = `
<p>You requested a password reset for your <strong>Kiel Beer Index</strong> account.</p>
<p>Click the link below to choose a new password:</p>
<p><a href="${resetUrl}">${resetUrl}</a></p>
<p>This link expires in <strong>1 hour</strong>.</p>
<p>If you did not request a password reset, you can safely ignore this email.</p>
`.trim();

  if (!isSmtpConfigured()) {
    logger.info("Password reset (SMTP not configured — logging link instead)", {
      to,
      resetUrl,
    });
    return;
  }

  const transport = createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "noreply@kiel-beer-index.de",
    to,
    subject,
    text,
    html,
  });

  logger.info("Password reset email sent", { to });
}
