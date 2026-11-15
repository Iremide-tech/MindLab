/**
 * Public origin used in emails and auth redirects.
 * Prefer NEXT_PUBLIC_SITE_URL; never fall back to localhost in production.
 */
export function getSiteUrl(fallbackOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

  if (configured) {
    try {
      const url = new URL(configured);
      const isLocal =
        url.hostname === "localhost" || url.hostname === "127.0.0.1";

      if (!isLocal) {
        return url.origin;
      }

      // Allow localhost only during local development.
      if (process.env.NODE_ENV !== "production") {
        return url.origin;
      }
    } catch {
      // ignore invalid env and continue to fallbacks
    }
  }

  if (fallbackOrigin) {
    try {
      const url = new URL(fallbackOrigin);
      const isLocal =
        url.hostname === "localhost" || url.hostname === "127.0.0.1";

      if (!isLocal) {
        return url.origin;
      }

      if (process.env.NODE_ENV !== "production") {
        return url.origin;
      }
    } catch {
      // ignore
    }
  }

  // Last resort for production deploys missing env configuration.
  if (process.env.NODE_ENV === "production") {
    return "https://www.usemindlab.com";
  }

  return "http://localhost:3000";
}

export function getAuthCallbackUrl(
  redirectPath = "/dashboard",
  fallbackOrigin?: string
) {
  const origin = getSiteUrl(fallbackOrigin);
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("redirect", redirectPath);
  return callback.toString();
}
