# PIKSO-BOOK-CATEGORIES/r1

## Contract

- Execution path: `direct_native`; level: `full`; responsibility: `native_pi`.
- Target: `/mnt/storage/projects/nana-website`, filesystem revision inspected on 2026-11-01 UTC. No Git metadata; pre-change baseline: `/tmp/pikso-categories-before/`.
- Objective: searchable shadcn multi-select with checkbox indicators, user-created category names, persistent category master, and multiple categories per book.
- Included: create/edit form, category validation, transactional persistence, master/join migration, legacy backfill, admin/public read compatibility, functional tests and documentation.
- Excluded: category management/rename/delete screen, unrelated visual changes, PDF/cover behavior, auth changes, `.env`, operational database writes, migration apply, restart/deployment, commit/push, browser/visual testing.
- Governing context: KITAB healthy at intake; resolved/read `STD-023`; project `AGENTS.md`; local Next.js server/client and route handler guides.
- Next boundary: Owner authorization for migration on the verified target database and runtime activation.

## Architecture and reuse

Decision: `DESIGN_BOUNDED` by the requested master + multi-select behavior.

Options considered:
1. Keep one comma-separated text field: rejected because it is not a permanent master or relational multi-select; names can themselves contain commas.
2. Master + book/category join: selected; explicit foreign keys, unique case-insensitive names, transactional updates, category lifetime independent of books.
3. Master + JSON/array IDs on books: rejected because it weakens foreign-key integrity and duplicates relationship semantics.

- `REUSE_EXISTING`: shadcn/Base Nova Combobox/Chips/Checkbox/Field, existing tokens, database pool, validation, admin authorization/origin checks, upload/cleanup flow, and PGlite test dependency.
- `EXTEND_EXISTING`: book validation/read queries, form props and create/PATCH handlers, explicit migration runner.
- `CREATE_NEW_WITH_JUSTIFICATION`: `src/lib/book-categories.ts` owns category queries/relationship writes; `src/lib/book-write.ts` is the transaction boundary for both create and edit (the previous separate route-level queries cannot guarantee book+category atomicity). `category-combobox.tsx` owns local search/create/select state for the existing book form. No packages added.

## Data and compatibility

- `m_book_category`: UUID, name (1–50 characters), generated lowercase unique key, timestamp.
- `tr_book_category`: composite primary key, book FK `ON DELETE CASCADE`, category FK `ON DELETE RESTRICT`, category lookup index.
- Migration `002-book-categories` backfills comma-separated legacy labels; legacy text is preserved untouched. Current reads derive display text from relations, not that historical column.
- Existing admin/public Book consumers retain `category: string` as a display projection. Form/API writes intentionally change from `category: string` to `categories: string[]`; multipart uses repeated `categories` fields. Missing arrays in PATCH fail validation rather than silently clearing selections. All in-repo writers/call sites updated.
- Category names are committed only when the book is saved successfully. Cancelling the form has no persistent effect.
- Upsert preserves an existing name's spelling, handles case-insensitive reuse, and links use conflict protection. Master writes use stable name order to reduce lock-order conflicts.
- Book create/update, master upsert, and replacing selections are one transaction. Existing upload cleanup remains in the route, including category-write failures.
- Removing selections or deleting a book retains master categories.
- Migration runner applies pending IDs in order under its existing advisory lock/transaction and logs success only after commit.
- Migration must precede runtime activation. Do not drop new tables after new category writes; rollback requires an approved export/synchronization procedure because the retained legacy column does not track new selections.

## Verification and self_review

Review mode: `self_review`, not independent QA. Phases: intake/classify/contract → architecture/reuse inspection → native-programmer/adaptive-form-ux → native-quality-review → close/report.

| Acceptance criterion | Result | Evidence |
| --- | --- | --- |
| Searchable multi-select with checkbox/chips using existing shadcn | PARTIAL | Source inspection + SSR form rendering pass; no browser interaction/visual test |
| Add Petualangan and Fantasi and select both | PASS (persistence); PARTIAL (interactive UI) | Create upload test with repeated multipart fields, relational write test; UI callback implementation inspected |
| Categories permanent and reused by the next book | PASS | Isolated PGlite test creates two books using same master, including case variations |
| Edit/remove selections without deleting master | PASS | PATCH functional test, empty selection, missing book, retained master |
| Legacy categories retained/backfilled | PASS | Migration tested against seeded legacy labels; schema SQL rerun does not duplicate records |
| Atomic failures, access rules, regression safety | PASS | Rollback tests for new/existing books, duplicate slug, upload-file cleanup after category failure, unauthorized/non-admin/cross-origin PATCH; draft visibility |
| Quality checks | PASS | `npm test` (26/26), `npm run lint`, `npm run typecheck`, `npm run build`, all exit 0 |
| Active database schema/runtime | NOT PERFORMED | No operational migration, database mutation, or restart |

Evidence: `/tmp/pikso-categories-tests3.log`, `/tmp/pikso-categories-types3.log`, `/tmp/pikso-categories-lint3.log`, `/tmp/pikso-categories-build.log`; final repeat logs use `*-final.log`. The intentional rollback test emits `API request failed: Error` while correctly returning HTTP 400.

Diff: filesystem comparison against the snapshot, not Git. Reviewed tracked-scope mutations and new files individually; no `.env`, schema 001, auth module, PDF/cover implementation, dependency, or public-page markup changes. Source diff: `/tmp/pikso-categories-source.diff`.

## Close

- Implementation lifecycle: `completed` (source + local evidence).
- Overall gate: `PARTIAL` (browser interaction/visual and active database/runtime are unverified).
- No independent QA claim. No deployment/activation claim.
- Migration subsequently authorized and applied by Owner on 2026-11-01 UTC to PostgreSQL database `pikso`, schema `public` (server PostgreSQL 18.6). `npm run db:migrate`: `001-initial already applied; no changes.` and `Applied 002-book-categories`.
- Post-migration read-only verification PASS: migration IDs `001-initial` and `002-book-categories` recorded; both tables and expected unique/check/FK delete rules exist; counts are books=0, categories=0, relations=0, users=1, accounts=1. No existing book/account data was changed.
- Migration task lifecycle: `completed`; operational gate: `PASS`. No seed, restart, deployment, or HTTP/browser check was performed or authorized as part of migration-only scope.
- Owner subsequently authorized build and restart on 2026-11-01 UTC. Activation task `PIKSO-BOOK-CATEGORIES-ACTIVATE/r1`, full bounded operation, `direct_native`, responsibility `native_pi`: reuse existing npm build/start scripts; no source-code/configuration changes, migration/seed, commit/push, or proxy effects.
- Fresh `npm test` (26/26), `npm run lint`, `npm run build`, and `npm run typecheck`: all exit 0. Build log had no matched errors/warnings; intentional rollback test message remains expected.
- Verified the actual port-3000 socket owner through `/proc/net/tcp`, process descriptors, cwd and command before SIGTERM: old PID 42613, cwd `/mnt/storage/projects/nana-website`, command `next-server (v16.4.3)`. Port release confirmed; no forced kill.
- Started `nohup env NODE_ENV=production npm run start -- --port 3000`; new verified next-server PID 44805 listens on `0.0.0.0:3000` with project cwd. Build ID `4H8sdEjvuy7xUYMSpVdD8` matches served home HTML both locally and at `https://devreact.edjavu.cloud`.
- Local and domain checks: `/`, `/admin/login`, `/books` HTTP 200; `/admin/books/new` HTTP 307 to `/admin/login` without session. Catalog shows the genuine empty state, not database-unavailable fallback.
- Evidence: `/tmp/pikso-categories-activation-{tests,lint,build,types}.log`, runtime log `/tmp/nana-production-server.log`; `/proc` identity/socket verification and Node fetch assertions observed in session.
- Activation lifecycle `completed`; operational gate `PASS`; review `self_review` using native-workflow, kitab-operator, and native-quality-review. No remaining authorization needed for this bounded operation. Browser/visual and authenticated UI interaction remain unverified and excluded.
