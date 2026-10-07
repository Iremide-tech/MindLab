const redirectOrigin = "https://mindlab.invalid";

export function getSafePostAuthPath(value: string | null) {
  if (!value) return "/dashboard";

  try {
    const url = new URL(value, redirectOrigin);
    if (url.origin !== redirectOrigin) return "/dashboard";
    if (
      url.pathname !== "/dashboard" &&
      url.pathname !== "/pricing" &&
      !url.pathname.startsWith("/invite/")
    ) {
      return "/dashboard";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/dashboard";
  }
}