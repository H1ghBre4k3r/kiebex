import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import {
  createEmailVerificationToken,
  requestEmailChange,
  requestPasswordReset,
  resetPassword,
  updateDisplayName,
  updatePassword,
  verifyEmailToken,
  verifyPassword,
} from "@/lib/auth";
import { assert, fail, runIntegrationTest, seedAuthUser } from "./helpers";

type IntegrationCheck = {
  name: string;
  fn: () => Promise<void>;
};

async function testUpdateDisplayNamePersistsNormalizedValue(): Promise<void> {
  await runIntegrationTest("update-display-name", async ({ namespace }) => {
    const { user } = await seedAuthUser(namespace, "display-name");

    const updated = await updateDisplayName(user.id, "  Updated Display Name  ");
    const stored = await db.user.findUnique({
      where: { id: user.id },
      select: { displayName: true },
    });

    assert(updated.displayName === "Updated Display Name", "Expected display name to be trimmed.");
    assert(
      stored?.displayName === "Updated Display Name",
      "Expected trimmed display name to persist in the database.",
    );
  });
}

async function testUpdatePasswordRejectsWrongCurrentPassword(): Promise<void> {
  await runIntegrationTest("update-password-wrong-current", async ({ namespace }) => {
    const { user, password } = await seedAuthUser(namespace, "wrong-current-password");
    const before = await db.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    const result = await updatePassword(user.id, "WrongPassword123!", "NewPassword456!");
    const after = await db.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    assert(!result.ok, "Expected wrong current password to be rejected.");
    assert(
      before?.passwordHash === after?.passwordHash,
      "Expected password hash to remain unchanged when validation fails.",
    );
    if (!after?.passwordHash) {
      fail("Expected password hash to remain available after a failed password update.");
    }

    assert(
      await verifyPassword(password, after.passwordHash),
      "Expected the original password to remain valid.",
    );
  });
}

async function testUpdatePasswordReplacesStoredHash(): Promise<void> {
  await runIntegrationTest("update-password-success", async ({ namespace }) => {
    const { user, password } = await seedAuthUser(namespace, "update-password-success");
    const newPassword = "NewPassword456!";

    const result = await updatePassword(user.id, password, newPassword);
    const stored = await db.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });

    assert(result.ok, "Expected password update to succeed.");
    if (!stored?.passwordHash) {
      fail("Expected updated user to keep a password hash.");
    }

    assert(
      !(await verifyPassword(password, stored.passwordHash)),
      "Expected the old password to stop working after replacement.",
    );
    assert(
      await verifyPassword(newPassword, stored.passwordHash),
      "Expected the new password to verify successfully.",
    );
  });
}

async function testRequestEmailChangeValidatesPasswordAndEmailState(): Promise<void> {
  await runIntegrationTest("request-email-change-validation", async ({ namespace }) => {
    const { user, password } = await seedAuthUser(namespace, "email-change-user", {
      email: namespace.email("current-email"),
    });
    const takenEmail = namespace.email("taken-email");

    await seedAuthUser(namespace, "email-taken-user", { email: takenEmail });

    const sameEmail = await requestEmailChange(user.id, user.email, password);
    const wrongPassword = await requestEmailChange(
      user.id,
      namespace.email("new-email"),
      "wrong-password",
    );
    const taken = await requestEmailChange(user.id, takenEmail, password);
    const stored = await db.user.findUnique({
      where: { id: user.id },
      select: { pendingEmail: true },
    });

    assert(
      !sameEmail.ok && sameEmail.code === "SAME_EMAIL",
      "Expected same-email changes to be blocked.",
    );
    assert(
      !wrongPassword.ok && wrongPassword.code === "WRONG_PASSWORD",
      "Expected email changes to require the current password.",
    );
    assert(
      !taken.ok && taken.code === "EMAIL_TAKEN",
      "Expected already-claimed emails to be blocked.",
    );
    assert(
      stored?.pendingEmail === null,
      "Expected invalid email change requests to leave pendingEmail empty.",
    );
  });
}

async function testVerifyEmailTokenMarksNewUserVerified(): Promise<void> {
  await runIntegrationTest("verify-email-token-registration", async ({ namespace }) => {
    const { user } = await seedAuthUser(namespace, "verify-registration-user", {
      emailVerified: false,
    });
    const token = await createEmailVerificationToken(user.id);

    const result = await verifyEmailToken(token);
    const stored = await db.user.findUnique({
      where: { id: user.id },
      select: { emailVerified: true },
    });
    const remainingTokens = await db.emailVerificationToken.count({ where: { userId: user.id } });

    assert(result.ok, "Expected a valid verification token to succeed.");
    assert(
      stored?.emailVerified === true,
      "Expected email verification to mark the user verified.",
    );
    assert(remainingTokens === 0, "Expected verification tokens to be deleted after use.");
  });
}

async function testEmailChangeRequestAndVerificationFlow(): Promise<void> {
  await runIntegrationTest("email-change-verification-flow", async ({ namespace }) => {
    const { user, password } = await seedAuthUser(namespace, "email-change-flow", {
      email: namespace.email("before-change"),
    });
    const nextEmail = namespace.email("after-change");

    const changeRequest = await requestEmailChange(user.id, nextEmail, password);
    const beforeVerification = await db.user.findUnique({
      where: { id: user.id },
      select: { email: true, pendingEmail: true, emailVerified: true },
    });

    assert(changeRequest.ok, "Expected a valid email change request to succeed.");
    if (!changeRequest.ok) {
      fail("Expected a valid email change request to produce a verification token.");
    }

    assert(
      beforeVerification?.email === user.email,
      "Expected the current email to stay unchanged until verification completes.",
    );
    assert(
      beforeVerification?.pendingEmail === nextEmail,
      "Expected the requested email to be stored as pendingEmail.",
    );

    const verification = await verifyEmailToken(changeRequest.token);
    const afterVerification = await db.user.findUnique({
      where: { id: user.id },
      select: { email: true, pendingEmail: true, emailVerified: true },
    });

    assert(verification.ok, "Expected email change verification to succeed.");
    assert(
      afterVerification?.email === nextEmail,
      "Expected verification to promote pendingEmail to email.",
    );
    assert(
      afterVerification?.pendingEmail === null,
      "Expected pendingEmail to be cleared after verification.",
    );
    assert(
      afterVerification?.emailVerified === true,
      "Expected the email to remain verified after change.",
    );
  });
}

async function testExpiredEmailVerificationTokenIsRejectedAndDeleted(): Promise<void> {
  await runIntegrationTest("verify-email-token-expired", async ({ namespace }) => {
    const { user } = await seedAuthUser(namespace, "expired-email-token", {
      emailVerified: false,
    });
    const token = await createEmailVerificationToken(user.id);
    const tokenHash = createHash("sha256").update(token).digest("hex");

    await db.emailVerificationToken.update({
      where: { tokenHash },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const result = await verifyEmailToken(token);
    const stored = await db.user.findUnique({
      where: { id: user.id },
      select: { emailVerified: true },
    });
    const tokenRecord = await db.emailVerificationToken.findUnique({ where: { tokenHash } });

    assert(
      !result.ok && result.reason === "expired",
      "Expected expired email tokens to be rejected.",
    );
    assert(stored?.emailVerified === false, "Expected expired tokens not to verify the user.");
    assert(tokenRecord === null, "Expected expired email tokens to be deleted after rejection.");
  });
}

async function testEmailChangeVerificationConflictClearsPendingEmail(): Promise<void> {
  await runIntegrationTest("verify-email-token-conflict", async ({ namespace }) => {
    const { user, password } = await seedAuthUser(namespace, "email-conflict-owner", {
      email: namespace.email("original-owner"),
    });
    const claimedEmail = namespace.email("claimed-during-flow");
    const changeRequest = await requestEmailChange(user.id, claimedEmail, password);

    assert(changeRequest.ok, "Expected the initial email change request to succeed.");
    if (!changeRequest.ok) {
      fail("Expected the initial email change request to produce a verification token.");
    }

    await seedAuthUser(namespace, "email-conflict-claimer", {
      email: claimedEmail,
      emailVerified: true,
    });

    const verification = await verifyEmailToken(changeRequest.token);
    const stored = await db.user.findUnique({
      where: { id: user.id },
      select: { email: true, pendingEmail: true },
    });
    const remainingTokens = await db.emailVerificationToken.count({ where: { userId: user.id } });

    assert(
      !verification.ok && verification.reason === "email_conflict",
      "Expected verification to fail if another account claims the target email first.",
    );
    assert(
      stored?.email === user.email,
      "Expected the original email to remain unchanged on conflict.",
    );
    assert(stored?.pendingEmail === null, "Expected pendingEmail to be cleared after a conflict.");
    assert(remainingTokens === 0, "Expected the conflicting verification token to be deleted.");
  });
}

async function testRequestPasswordResetOnlyCreatesActiveUserTokens(): Promise<void> {
  await runIntegrationTest("request-password-reset", async ({ namespace }) => {
    const { user: activeUser } = await seedAuthUser(namespace, "reset-active", {
      email: namespace.email("reset-active"),
      emailVerified: true,
      isBanned: false,
    });
    const { user: unverifiedUser } = await seedAuthUser(namespace, "reset-unverified", {
      email: namespace.email("reset-unverified"),
      emailVerified: false,
    });
    const { user: bannedUser } = await seedAuthUser(namespace, "reset-banned", {
      email: namespace.email("reset-banned"),
      emailVerified: true,
      isBanned: true,
    });

    const missing = await requestPasswordReset(namespace.email("missing-user"));
    const unverified = await requestPasswordReset(unverifiedUser.email);
    const banned = await requestPasswordReset(bannedUser.email);
    const first = await requestPasswordReset(activeUser.email);
    const second = await requestPasswordReset(activeUser.email);

    assert(
      !missing.ok && missing.reason === "USER_NOT_FOUND",
      "Expected unknown users to be rejected.",
    );
    assert(
      !unverified.ok && unverified.reason === "USER_NOT_FOUND",
      "Expected unverified users not to receive password reset tokens.",
    );
    assert(
      !banned.ok && banned.reason === "USER_NOT_FOUND",
      "Expected banned users not to receive reset tokens.",
    );
    assert(first.ok, "Expected active verified users to receive reset tokens.");
    assert(second.ok, "Expected repeated password reset requests to remain valid.");
    if (!first.ok || !second.ok) {
      fail("Expected active verified users to receive password reset tokens.");
    }

    const tokenCount = await db.passwordResetToken.count({ where: { userId: activeUser.id } });
    const firstTokenHash = createHash("sha256").update(first.token).digest("hex");
    const firstTokenRecord = await db.passwordResetToken.findUnique({
      where: { tokenHash: firstTokenHash },
    });

    assert(tokenCount === 1, "Expected repeated reset requests to keep only one active token.");
    assert(
      firstTokenRecord === null,
      "Expected a newer password reset request to invalidate the older token.",
    );
  });
}

async function testResetPasswordRejectsInvalidAndExpiredTokens(): Promise<void> {
  await runIntegrationTest("reset-password-invalid-expired", async ({ namespace }) => {
    const { user } = await seedAuthUser(namespace, "reset-invalid-expired", {
      emailVerified: true,
    });
    const token = await requestPasswordReset(user.email);

    assert(token.ok, "Expected a reset token to be issued for an active verified user.");
    if (!token.ok) {
      fail("Expected a reset token to be issued for an active verified user.");
    }

    const invalid = await resetPassword("not-a-real-token", "NewPassword456!");
    const tokenHash = createHash("sha256").update(token.token).digest("hex");

    await db.passwordResetToken.update({
      where: { tokenHash },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const expired = await resetPassword(token.token, "NewPassword456!");
    const expiredTokenRecord = await db.passwordResetToken.findUnique({ where: { tokenHash } });

    assert(
      !invalid.ok && invalid.reason === "invalid",
      "Expected unknown reset tokens to be rejected.",
    );
    assert(
      !expired.ok && expired.reason === "expired",
      "Expected expired reset tokens to be rejected.",
    );
    assert(
      expiredTokenRecord === null,
      "Expected expired reset tokens to be deleted after rejection.",
    );
  });
}

async function testResetPasswordReplacesPasswordAndInvalidatesSessions(): Promise<void> {
  await runIntegrationTest("reset-password-success", async ({ namespace }) => {
    const { user, password } = await seedAuthUser(namespace, "reset-password-success", {
      emailVerified: true,
    });
    const request = await requestPasswordReset(user.email);

    assert(request.ok, "Expected a password reset token to be issued.");
    if (!request.ok) {
      fail("Expected a password reset token to be issued.");
    }

    await db.session.createMany({
      data: [
        {
          userId: user.id,
          tokenHash: namespace.id("session-one"),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
        {
          userId: user.id,
          tokenHash: namespace.id("session-two"),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      ],
    });

    const result = await resetPassword(request.token, "BrandNewPassword789!");
    const stored = await db.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    const sessionCount = await db.session.count({ where: { userId: user.id } });
    const tokenCount = await db.passwordResetToken.count({ where: { userId: user.id } });

    assert(result.ok, "Expected a valid reset token to update the password.");
    if (!stored?.passwordHash) {
      fail("Expected password reset to leave a password hash in place.");
    }

    assert(
      !(await verifyPassword(password, stored.passwordHash)),
      "Expected password reset to invalidate the previous password.",
    );
    assert(
      await verifyPassword("BrandNewPassword789!", stored.passwordHash),
      "Expected password reset to store the replacement password.",
    );
    assert(sessionCount === 0, "Expected password reset to invalidate all active sessions.");
    assert(tokenCount === 0, "Expected password reset to delete all outstanding reset tokens.");
  });
}

export const authIntegrationChecks: IntegrationCheck[] = [
  {
    name: "updateDisplayName persists normalized display names",
    fn: testUpdateDisplayNamePersistsNormalizedValue,
  },
  {
    name: "updatePassword rejects the wrong current password",
    fn: testUpdatePasswordRejectsWrongCurrentPassword,
  },
  {
    name: "updatePassword replaces the stored password hash",
    fn: testUpdatePasswordReplacesStoredHash,
  },
  {
    name: "requestEmailChange validates password and target email state",
    fn: testRequestEmailChangeValidatesPasswordAndEmailState,
  },
  {
    name: "verifyEmailToken marks new users verified",
    fn: testVerifyEmailTokenMarksNewUserVerified,
  },
  {
    name: "requestEmailChange and verifyEmailToken complete the email change flow",
    fn: testEmailChangeRequestAndVerificationFlow,
  },
  {
    name: "verifyEmailToken rejects and deletes expired tokens",
    fn: testExpiredEmailVerificationTokenIsRejectedAndDeleted,
  },
  {
    name: "verifyEmailToken clears pendingEmail on email conflicts",
    fn: testEmailChangeVerificationConflictClearsPendingEmail,
  },
  {
    name: "requestPasswordReset only issues tokens for active verified users",
    fn: testRequestPasswordResetOnlyCreatesActiveUserTokens,
  },
  {
    name: "resetPassword rejects invalid and expired tokens",
    fn: testResetPasswordRejectsInvalidAndExpiredTokens,
  },
  {
    name: "resetPassword replaces the password and invalidates sessions",
    fn: testResetPasswordReplacesPasswordAndInvalidatesSessions,
  },
];
