/**
 * One place that turns an unknown failure into a sentence a person can act on.
 *
 * Postgres and Supabase return codes and English messages. Showing those raw is
 * how "duplicate key value violates unique constraint" reaches the user; the
 * mapping here is what the rest of the app should use.
 */
export interface ExplainedError {
  message: string;
  /** True when retrying later cannot help. */
  permanent: boolean;
}

const POSTGRES: Record<string, ExplainedError> = {
  "23505": { message: "errors.alreadyExists", permanent: true },
  "23503": { message: "errors.missingReference", permanent: true },
  "23502": { message: "errors.requiredField", permanent: true },
  "23514": { message: "errors.invalidValue", permanent: true },
  "42501": { message: "errors.forbidden", permanent: true },
  "42P01": { message: "errors.missingData", permanent: true },
  "22001": { message: "errors.tooLong", permanent: true },
  "22003": { message: "errors.outOfRange", permanent: true },
  PGRST116: { message: "errors.notFound", permanent: true },
  PGRST301: { message: "errors.sessionExpired", permanent: true },
};

const AUTH: Record<string, ExplainedError> = {
  invalid_credentials: { message: "errors.invalidCredentials", permanent: true },
  email_not_confirmed: { message: "errors.emailNotConfirmed", permanent: true },
  user_already_exists: { message: "errors.alreadyExists", permanent: true },
  email_exists: { message: "errors.emailInUse", permanent: true },
  weak_password: { message: "errors.weakPassword", permanent: true },
  over_email_send_rate_limit: { message: "errors.rateLimited", permanent: false },
  over_request_rate_limit: { message: "errors.rateLimited", permanent: false },
  session_not_found: { message: "errors.sessionExpired", permanent: true },
  same_password: { message: "errors.samePassword", permanent: true },
  insufficient_aal: { message: "errors.needsTwoFactor", permanent: true },
};

/** Postgres functions raise their own short strings; these are ours. */
const APP: Record<string, ExplainedError> = {
  insufficient_points: { message: "errors.insufficientPoints", permanent: true },
  unknown_item: { message: "errors.unknownItem", permanent: true },
  not_a_member: { message: "errors.notAMember", permanent: true },
  not_a_participant: { message: "errors.notAParticipant", permanent: true },
  group_too_large: { message: "errors.groupTooLarge", permanent: true },
  group_needs_two_members: { message: "errors.groupNeedsTwo", permanent: true },
  invalid_invite: { message: "errors.invalidInvite", permanent: true },
  "invalid invite": { message: "errors.invalidInvite", permanent: true },
  "invite expired": { message: "errors.inviteExpired", permanent: true },
  "invite exhausted": { message: "errors.inviteExhausted", permanent: true },
  not_allowed: { message: "errors.forbidden", permanent: true },
  livekit_not_configured: { message: "voice.notConfigured", permanent: true },
};

const NETWORK: RegExp[] = [
  /failed to fetch/i,
  /networkerror/i,
  /load failed/i,
  /timeout/i,
  /fetch failed/i,
];

interface ErrorLike {
  code?: string | number;
  status?: number;
  message?: string;
  error_description?: string;
  hint?: string;
  details?: string;
}

function keyOf(error: unknown): string | null {
  const e = error as ErrorLike | null;
  if (!e) return null;
  if (e.code !== undefined && e.code !== null) return String(e.code);
  return null;
}

export function explainError(error: unknown): ExplainedError {
  if (!error) return { message: "errors.unknown", permanent: false };

  if (typeof error === "string") {
    return APP[error] ?? { message: "errors.unknown", permanent: false };
  }

  const e = error as ErrorLike;
  const raw = (e.message ?? e.error_description ?? "").trim();
  const code = keyOf(error);

  if (code) {
    if (POSTGRES[code]) return POSTGRES[code];
    if (AUTH[code]) return AUTH[code];
    if (APP[code]) return APP[code];
  }

  // Auth often puts the reason in the message rather than a code.
  const normalized = raw.toLowerCase().replace(/\s+/g, "_");
  if (AUTH[normalized]) return AUTH[normalized];
  if (APP[raw]) return APP[raw];

  // Postgres embeds the code in the message text too.
  const embedded = /duplicate key/i.test(raw)
    ? POSTGRES["23505"]
    : /permission denied/i.test(raw)
      ? POSTGRES["42501"]
      : null;
  if (embedded) return embedded;

  if (NETWORK.some((pattern) => pattern.test(raw))) {
    return { message: "errors.network", permanent: false };
  }

  if (e.status === 401) return { message: "errors.sessionExpired", permanent: true };
  if (e.status === 403) return { message: "errors.forbidden", permanent: true };
  if (e.status === 404) return { message: "errors.notFound", permanent: true };
  if (e.status === 429) return { message: "errors.rateLimited", permanent: false };
  if (typeof e.status === "number" && e.status >= 500) {
    return { message: "errors.server", permanent: false };
  }

  // Unknown but present: keep the original text rather than lying.
  if (raw && raw.length < 200) return { message: raw, permanent: false };
  return { message: "errors.unknown", permanent: false };
}

/** Translate an explained error, falling back to the raw message when unmapped. */
export function translateError(
  t: (key: string) => string,
  error: unknown,
): string {
  const explained = explainError(error);
  const translated = t(explained.message);
  // i18next returns the key itself when it has no entry.
  return translated === explained.message ? explained.message : translated;
}
