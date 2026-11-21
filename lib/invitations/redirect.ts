const redirectOrigin = "https://mindlab.invalid";

export function getSafePostAuthPath(value: string | null) {
  if (!value) return "/workspaces";

  try {
    const url = new URL(value, redirectOrigin);
    if (url.origin !== redirectOrigin) return "/workspaces";
    if (
      url.pathname !== "/dashboard" &&
      url.pathname !== "/workspaces" &&
      url.pathname !== "/pricing" &&
      !url.pathname.startsWith("/invite/")
    ) {
      return "/workspaces";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/workspaces";
  }
}
