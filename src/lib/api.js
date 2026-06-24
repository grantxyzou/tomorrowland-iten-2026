// Thin wrapper around fetch for all /api/* calls.
//
// Two jobs:
//   1. Always send the session cookie (credentials:'include'). The app and the
//      API are same-origin so the cookie would ride along anyway, but being
//      explicit is robust and self-documenting.
//   2. Surface auth expiry: if any call comes back 401, notify the auth layer
//      so it can drop the UI back to the sign-in gate. We do NOT throw or clear
//      any offline outbox here — the caller's existing `!res.ok` handling keeps
//      queued writes intact, so they flush after re-login.

let onUnauthorized = null;

// AuthProvider registers a callback here so a 401 anywhere flips it to signed-out.
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

export async function apiFetch(url, opts = {}) {
  const res = await fetch(url, { ...opts, credentials: 'include' });
  if (res.status === 401 && onUnauthorized) onUnauthorized();
  return res;
}
