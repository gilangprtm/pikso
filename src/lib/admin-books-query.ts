export const ADMIN_BOOK_PAGE_SIZES = [10, 25, 50] as const;
export const ADMIN_BOOK_SORTS = ["title", "author", "category", "status", "pdf_pages", "created_at"] as const;
export type AdminBookStatus = "all" | "draft" | "published";
export type AdminBookSort = (typeof ADMIN_BOOK_SORTS)[number];
export type AdminBookListOptions = {
  pageSize?: number;
  search?: string;
  status?: string;
  sort?: string;
  direction?: string;
};
export type NormalizedAdminBookOptions = {
  pageSize: (typeof ADMIN_BOOK_PAGE_SIZES)[number];
  search: string;
  status: AdminBookStatus;
  sort: AdminBookSort;
  direction: "asc" | "desc";
};

export function adminBooksHref(options: NormalizedAdminBookOptions, page = 1) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(options.pageSize), sort: options.sort, direction: options.direction });
  if (options.search) query.set("search", options.search);
  if (options.status !== "all") query.set("status", options.status);
  return `/admin/books?${query}`;
}

export function normalizeAdminBookOptions(options: AdminBookListOptions = {}): NormalizedAdminBookOptions {
  const requestedSize = Number(options.pageSize);
  const search = typeof options.search === "string" ? options.search.trim().slice(0, 100) : "";
  const status: AdminBookStatus = options.status === "draft" || options.status === "published" ? options.status : "all";
  const sort: AdminBookSort = ADMIN_BOOK_SORTS.includes(options.sort as AdminBookSort) ? options.sort as AdminBookSort : "created_at";
  return {
    pageSize: ADMIN_BOOK_PAGE_SIZES.includes(requestedSize as (typeof ADMIN_BOOK_PAGE_SIZES)[number]) ? requestedSize as (typeof ADMIN_BOOK_PAGE_SIZES)[number] : 10,
    search,
    status,
    sort,
    direction: options.direction === "asc" ? "asc" : "desc",
  };
}
