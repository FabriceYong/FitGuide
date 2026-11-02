'use client';

/**
 * A friend's invite, from an invite link (/?signup=1&invite=CODE): kept for
 * this tab until sign-up sends it with the new account.
 */
const KEY = 'fitguide_invite';

/** Keep the link's invite code, if there is one. */
export function rememberInvite() {
  try {
    const code = new URLSearchParams(window.location.search).get('invite');
    if (code && /^[A-Za-z0-9]{4,20}$/.test(code)) sessionStorage.setItem(KEY, code.toUpperCase());
  } catch { /* storage unavailable: the invite is just not kept */ }
}

export function pendingInvite(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/** The link that invites someone with `code`. */
export const inviteLink = (code: string) => `${window.location.origin}/?signup=1&invite=${encodeURIComponent(code)}`;
