import { useTranslation } from "react-i18next";

/**
 * Maps Supabase auth errors onto translation keys so the UI never shows a raw
 * server string.
 */
export function useAuthErrorMessage() {
  const { t } = useTranslation();

  return (error: unknown): string => {
    if (!error) return "";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code ?? "")
        : "";
    const message =
      error instanceof Error ? error.message : String(error ?? "");

    if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) {
      return t("auth.errors.invalidCredentials");
    }
    if (code === "email_not_confirmed" || /email not confirmed/i.test(message)) {
      return t("auth.errors.emailNotConfirmed");
    }
    if (code === "user_already_exists" || /already registered/i.test(message)) {
      return t("auth.errors.emailTaken");
    }
    if (code === "weak_password" || /password should be/i.test(message)) {
      return t("auth.errors.passwordWeak");
    }
    if (code === "over_email_send_rate_limit" || /rate limit/i.test(message)) {
      return t("auth.errors.rateLimited");
    }
    if (/username/i.test(message)) {
      return t("auth.errors.usernameTaken");
    }
    return t("auth.errors.generic");
  };
}
