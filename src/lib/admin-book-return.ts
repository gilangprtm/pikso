// Only return to admin reading/list surfaces, never an external URL or another editor.
export function adminBookReturnHref(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/admin/books";
  try {
    const url = new URL(value, "https://admin.invalid");
    if (url.origin !== "https://admin.invalid" || !["/admin", "/admin/books"].includes(url.pathname)) return "/admin/books";
    url.searchParams.delete("created");
    return url.pathname + url.search + url.hash;
  } catch { return "/admin/books"; }
}

export function adminBookFormHref(path: string, returnTo: string) {
  return `${path}?${new URLSearchParams({ returnTo: adminBookReturnHref(returnTo) })}`;
}
