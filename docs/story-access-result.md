# PIKSO-STORY-ACCESS/r1 — implementation result

## Identity and boundary

- Path: `direct_native`; full contract: `docs/story-access-contract.md`.
- Baseline: `fd1634db8321e8bb02e9b11c2ab83628cdd95f68`; target: uncommitted working tree in `/mnt/storage/projects/nana-website`.
- Phases: native-workflow → bounded architecture/reuse inspection → native-programmer → native-quality-review (`self_review`) → close/report.
- KITAB Engine status observed HEALTHY (0 errors/warnings); STD-023 resolved/read.
- Objective: optional story access codes, browser-remembered access without application expiry, server reader/PDF enforcement.
- Excluded: active database migration/data mutations, seed, environment/credentials/dependencies, original PDFs/covers, unrelated UI, commit/push.

## Implementation and reuse

- EXTEND_EXISTING: `bookInput`, `writeBook`, create/finalize/edit flows, `books` selectors, existing admin BookForm, published lookup, `serveFile`, PDF range transport.
- REUSE_EXISTING: Better Auth salted password hashing, configured authentication signing secret, Base UI Dialog/Input/Button, existing 40px control conventions.
- CREATE_NEW_WITH_JUSTIFICATION: shared per-book/version access-proof verifier, bounded same-origin access POST, client proof helper, StartReading/UnlockRequired components. Existing admin sessions do not model anonymous per-story access.
- Additive migration `db/003-book-access-codes.sql`; existing stories default open. Migration registered after 001/002.
- Hash stored, plaintext never returned/saved in browser storage. Public/admin book getters expose only `access_locked`, not hash/version.
- Blank edit preserves code; replacement rotates version; explicit removal opens the story and revokes the previous proof.
- Lifetime signed proof in localStorage; HttpOnly SameSite session cookie restored through same-origin POST. Neither proof nor cookie has application expiry; no token in URL.
- Public reader and PDF GET/HEAD authorize before rendering/serving, conditional validation or ranges. Locked PDFs are `private, no-store`, use memory-only transport, and do not read/write IndexedDB chunks. Open-story caching remains intact; admin serving unchanged.
- Single-host in-memory per-book verification limit: 20 expensive checks/minute; valid proofs bypass password verification. Not a distributed/per-client limiter; abusive attempts can temporarily exhaust a story's code-entry budget.

## Acceptance and evidence

| Criterion | Result | Evidence |
| --- | --- | --- |
| Optional string code, existing stories remain open | PASS | Validation, additive/idempotent migration, legacy-row tests |
| Create/edit hash, preserve/remove/replace, atomic rollback | PASS | PGlite shared writer/API integration and regression tests |
| Correct/incorrect code, modal, remembered-access path | PASS (source/callback level) | story-access and story-access-ui tests; not DOM/browser tests |
| No application expiry; forgery/cross-story/version revocation | PASS | Signature tests including changed clock and code version |
| Direct reader and PDF GET/HEAD/range/conditional protection | PASS | Reader component dependency tests and actual route handlers with isolated temporary file/PGlite DB |
| Locked PDF avoids persistent cache, open cache unaffected | PASS | reader-chunk-cache tests, existing reader suite |
| Existing admin/auth/upload/catalog behavior | PASS | Full regression suite |
| Full tests/lint/typecheck/production build/diff hygiene | PASS | Commands below, exit 0 |
| Active migration and feature activation | PASS | Subsequent Owner-authorized migration and build/restart verified; see `docs/story-access-migration-result.md` and `docs/story-access-activation-result.md` |
| Browser/Safari/device layout, cookie restoration across browser restarts | UNVERIFIED | No real-browser/device run |

Final commands (all exit 0): `npm test` (82/82), `npm run lint` (no warnings), `npm run typecheck`, `npm run build`, `git diff --check`.

Local command provenance: `/tmp/pikso-access-final-checks.json`, `/tmp/pikso-access-final-{tests,lint,types,build,diff}.log`. Build subprocess exit captured explicitly with Python; build log retains only the TypeScript completion line. Build artifacts include reader/access/file routes; resulting build ID: `OqQGf5-unAtyHXhKD9VWm`. Build generated local `.next` artifacts; no listener restart/activation was performed.

## Review and operational recovery

- Review mode: `self_review`, never independent QA. Implementation gate: **PASS** (`verified_self` for automated/source criteria); live/browser release gate: **PARTIAL**.
- Distinct review covered tracked diff and new modules/tests, authorization before bytes, hash/proof exposure, transaction rollback, revocation, public/admin regressions, and scope hygiene.
- Database tests used isolated PGlite and temporary test storage, not the application database. No active schema/data mutation performed.
- Deployment order after authorization: confirm active DB identity/status; apply migration 003 transactionally using ordered migrator (no seed); read back schema and invariants; only then activate compatible build after `/proc` listener identity checks and run post-activation HTTP checks. Do not activate new code on old schema.
- Migration script transaction rolls back an unsuccessful migration. For application rollback, retain additive columns and restore the previous compatible application build; do not drop populated access columns without a separately approved recovery plan.
- Browser storage can be cleared/unavailable/evicted; another browser/device must unlock again. If storage is unavailable, access can still work for the cookie session but cannot promise persistence after it ends. Signing-secret rotation also invalidates proofs.
- Signed proof is a bearer credential, not device binding or DRM. An authorized recipient can share it or downloaded PDF bytes. Previously downloaded bytes cannot be revoked; existing open-story cached bytes are not remotely erased. Future protected reads check access and bypass persistent cache.

Lifecycle: **completed** for implementation/evidence. Subsequent Owner-authorized migration 003 completed and verified on active `pikso` database. Owner then authorized build/restart: build `97BJtVvfXjIpOXPFCJAFj` active at port 3000, source/build/listener/HTTP checks PASS; see migration and activation result documents. No commit or push; browser/device behavior unverified.
