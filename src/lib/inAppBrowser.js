// In-app browser (embedded WebView) detection + escape helpers.
//
// WHY: Google blocks OAuth inside embedded WebViews (error=disallowed_useragent)
// on every path — GIS and our /api/oauth redirect alike. The app spreads by
// word-of-mouth (links shared in WhatsApp / Instagram / Gmail), so many users
// open it inside an app's in-app browser and hit a dead "Sign in with Google".
// There's no code that makes OAuth complete in a WebView; the only fix is to
// detect it and coach the user into a real browser. See AuthGate's SignIn.
//
// UA sniffing is inherently fuzzy, so callers MUST treat a positive as a
// *suggestion* (offer a "try anyway" fallback), never a hard gate — a false
// positive must not lock a real browser out.

// Explicit in-app WebView signatures, by host app.
const APP_WEBVIEW_RE = /\b(FBAN|FBAV|FB_IAB|FBIOS|Instagram|Line\/|MicroMessenger|BytedanceWebview|musical_ly|Snapchat|Twitter|LinkedInApp|Pinterest|GSA)\b/i;

// Android System WebView: Chrome UA carrying the "; wv" token.
const ANDROID_WV_RE = /; wv\)/i;

// Real iOS browsers (NOT in-app WebViews) — used to avoid false positives on iOS.
const IOS_REAL_BROWSER_RE = /(CriOS|FxiOS|EdgiOS|OPiOS|Safari)/;

export function platformOS(ua = navigatorUA()) {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

// Is this an embedded in-app browser (WebView) rather than a real browser?
export function isInAppBrowser(ua = navigatorUA()) {
  if (!ua) return false;
  if (APP_WEBVIEW_RE.test(ua)) return true;
  if (ANDROID_WV_RE.test(ua)) return true;
  // iOS heuristic: a WKWebView reports "AppleWebKit … Mobile" but omits the
  // "Safari" token — and isn't one of the real third-party iOS browsers.
  if (platformOS(ua) === 'ios' && /AppleWebKit/i.test(ua) && /Mobile/i.test(ua)
      && !IOS_REAL_BROWSER_RE.test(ua)) {
    return true;
  }
  return false;
}

// Android-only escape hatch: an intent:// URL that force-opens the link in
// Chrome (with an https browser_fallback_url so it degrades gracefully).
export function chromeIntentUrl(href = currentHref()) {
  try {
    const u = new URL(href);
    const hostPath = `${u.host}${u.pathname}${u.search}${u.hash}`;
    const fallback = encodeURIComponent(href);
    return `intent://${hostPath}#Intent;scheme=https;package=com.android.chrome;`
      + `S.browser_fallback_url=${fallback};end`;
  } catch {
    return href;
  }
}

function navigatorUA() {
  return (typeof navigator !== 'undefined' && navigator.userAgent) || '';
}

function currentHref() {
  return (typeof window !== 'undefined' && window.location && window.location.href) || '';
}
