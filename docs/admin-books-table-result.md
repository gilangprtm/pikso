# PIKSO-ADMIN-BOOK-TABLE/r1

- Execution: `direct_native`; contract: full, bounded; responsibility: Native Pi.
- Target: working source under `/mnt/storage/projects/nana-website` (no Git metadata); baseline copies: `/tmp/pikso-table-before`; source diff: `/tmp/pikso-table-source.diff`.
- Objective: replace row action buttons with a three-dot Lihat/Edit/Hapus menu and add standard table controls.
- Scope: admin book listing, its server query, reused DataTable optional server-sorting contract, and functional regressions. No schema/data/auth/upload/proxy/environment changes, dependencies, commit, or push.
- Governance: KITAB `STD-023`, registry HEALTHY, 0 errors/warnings at inspection. Existing Owner standing authorization covers build/activation after successful checks, with listener identity verified before restart.

## Design / reuse

`DESIGN_BOUNDED`: extend the existing `listBooks(page, admin)` with optional admin-only settings rather than downloading all books for client-side sorting. Public callers keep their original four-book page size and publication restriction. Sort column/direction are allowlisted; values are parameterized, and search wildcard characters escaped. Stable ID tie-breaking prevents order ambiguity across equal sort values.

`EXTEND_EXISTING` / `REUSE_EXISTING`: retain DataTable rendering, Base Nova DropdownMenu, Select, Button, and AlertDialog. A small client-safe `admin-books-query.ts` owns admin parameter normalization and URL encoding for the page, server query, and table. No new packages. Existing category relation remains canonical. Stable row keys preserve the correct per-book action state across sorting/navigation.

## Acceptance / self_review

1. Three-dot row menu contains Lihat (existing admin preview), Edit (existing edit route), Hapus (confirmation required): implemented. Closed-menu SSR semantics and source composition checked; real keyboard/pointer interaction not tested.
2. Admin default 10 rows; choices 10/25/50: tested using isolated PGlite with 32 books; public limit remains four.
3. Server-side ascending/descending sorting across the full result set: tested, including numeric page count and category.
4. Search title/author/category, filter publication status, reset, and pagination preserve query state: SQL behavior and URL encoding tested. Sort, filter, search, and size changes reset to page one.
5. Footer remains visible for a single/empty page, with range and total count; empty search and empty catalog have different messages: SSR/source inspection. Form/footer wrap on narrow layouts; horizontal table overflow retained. Not browser/visual evidence.
6. Existing authorization boundary and routes unchanged; public query ignores admin options. No production test data created.

Phases: intake/classify/contract → architecture/reuse inspection → native-programmer implementation → native-quality-review (`self_review`) → activation/report. No delegated workers or independent QA.

## Checks observed (2026-11-01 UTC)

- `npm test`: PASS, 35/35; in-memory/test-only DB, no production mutations.
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm run build`: PASS; build ID `0vo5x2nmLPusKI0sCuM-w`.
- Final source diff reviewed against saved baseline; new query/tests read in full.

Limitations: no Playwright/browser/visual tests, no authenticated live administration test or actual book deletion. Those surfaces are not established by SSR/build. Existing unrelated audit/security findings remain outside scope.

Activation completed: verified port-3000 listener PID 55703, command `next-server (v16.4.3)`, project cwd, and socket inode 160953913 through `/proc` immediately before SIGTERM. Started the successful build with `npm run start -- --port 3000`. Verified new listener PID 57015, same project cwd/command, socket inode 161088842 at `0.0.0.0:3000`. Evidence: `/tmp/pikso-table-activation.json`. Post-activation local/domain `/admin/login`: HTTP 200; `/admin/books`: HTTP 307 to login, as expected without a session. No authenticated live table interaction was attempted.

Lifecycle: `completed`. Review mode: `self_review`; gate: `PASS` for the defined functional/source/build/activation scope. Visual and authenticated served interaction remain unverified. Next: Owner can inspect `/admin/books` with their existing admin session; no additional authorization required for that manual check.
