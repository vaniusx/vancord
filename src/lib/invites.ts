/** The hosted fallback domain for invite links. */
export const INVITE_HOST = "vancord.vercel.app";

/** Canonical https link, which opens the app or shows the code in a browser. */
export function inviteLink(code: string): string {
  return `https://${INVITE_HOST}/${code}`;
}

/** Native scheme, used by the desktop and Android intent filters. */
export function inviteDeepLink(code: string): string {
  return `vancord://join/${code}`;
}

/** Vanity server link, only available from boost level 2. */
export function vanityLink(slug: string): string {
  return `https://${INVITE_HOST}/${slug}`;
}

/**
 * Accepts a pasted link, a deep link or a bare code and returns the code.
 * People paste whatever they were given, so the join dialog has to cope.
 */
export function extractInviteCode(input: string): string {
  const value = input.trim();
  if (!value) return "";

  const deep = /^vancord:\/\/join\/(.+)$/i.exec(value);
  if (deep) return decodeURIComponent(deep[1]).replace(/\/+$/, "");

  try {
    if (/^https?:\/\//i.test(value)) {
      const url = new URL(value);
      const segments = url.pathname.split("/").filter(Boolean);
      return decodeURIComponent(segments[segments.length - 1] ?? "");
    }
  } catch {
    // not a URL; fall through and treat it as a code
  }

  return value.replace(/^\/+|\/+$/g, "");
}
