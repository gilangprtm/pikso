# PIKSO-STORY-ACCESS-MIGRATION/r1

## Bounded operational contract

- Execution: direct_native; level: full; responsibility: native_pi.
- Owner authorization: “ya jalankan migration”, limited to migration operation.
- Target: PostgreSQL selected by this project's `.env`, verified read-only as database `pikso`, schema `public`, PostgreSQL 18.6; initial migration history 001/002, 3 books.
- Objective: apply only `003-book-access-codes` using existing ordered transactional migrator; 001/002 must remain no-ops.
- Scope: verify identity/history, record schema/count/fingerprints without exposing row data, run migrator once, verify added columns/index/defaults/history and unchanged legacy book/category/account data.
- Exclusions: seed, manual book/status/code changes, env/credential changes, service restart/deploy, commit/push, unrelated migrations.
- Acceptance: only migration 003 newly applied; nullable text hash, non-null UUID version with generated default, valid index; existing books remain open; legacy-data fingerprints/counts unchanged.
- Evidence: safe pre/post SQL snapshots and command exit/output in `/tmp/pikso-access-migration-*`; source `db/003-book-access-codes.sql`, canonical runner `scripts/migrate.ts`.
- Reuse: existing migrator reused unchanged; no application code implementation.
- Recovery: migrator is transactional; on error or ambiguous outcome stop and inspect read-only, never blind-retry or drop columns. Retain additive columns for application rollback.
- Phases: native-workflow → kitab-operator / STD-023 authority check → bounded direct operation → native-quality-review (self_review) → close/report.

## Outcome

- Lifecycle: **completed**; migration gate: **PASS**; runtime activation remains separate and pending explicit authorization.
- Preflight read-only target: `pikso`, `public`, PostgreSQL 18.6. Existing migration history: 001/002 applied, 003 absent. Baseline: 3 books, 1 category, 3 book-category links, 1 user, 1 account.
- Command: `npm run db:migrate` (exit 0). Output: 001 and 002 already applied/no changes; only `003-book-access-codes` applied.
- Postflight read-only verifies expected columns (`access_code_hash text NULL`; `access_version uuid NOT NULL DEFAULT gen_random_uuid()`), index `books_access_version_idx` on `(id, access_version)`, and migration history 001/002/003.
- Data invariants: 3 books, 1 category, 3 relations, 1 user, 1 account; all 3 pre-existing books have null access hashes and assigned versions; zero missing versions. Pre/post book and category fingerprints match exactly.
- A first postflight fingerprint attempt used a differently escaped separator; it was recognized as incomparable and was not used. Exact preflight query was rerun read-only, produced matching fingerprints, and migration was not retried.
- Evidence files: `/tmp/pikso-access-migration-pre.json`, `/tmp/pikso-access-migration-run.json`, `/tmp/pikso-access-migration-post.json`, `/tmp/pikso-access-migration-integrity.json` and corresponding logs.
- No seed, book/status/code changes, app restart, build activation, commit, or push.
