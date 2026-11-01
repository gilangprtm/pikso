# PIKSO-READER-REPAIR/r1 — Result

## Closure
- execution_path: direct_native; contract: full, `docs/reader-repair-contract.md`; responsibility: native_pi.
- lifecycle: completed (bounded implementation and activation); review_mode: self_review; implementation/check gate PASS; on-device incident resolution UNKNOWN (overall served-interaction gate PARTIAL).
- Target baseline: `m2gNEV8-p9wazL1saSF-8`; final active build: `-dIDf9Fapg0HVKkfBmuJG` (the earlier `DAeFB2ystczhz3uaq0TZZ` build was superseded by the fresh final build and reactivation).
- Skills/phases: native-workflow, kitab-operator (healthy, STD-023 resolved/read), native-programmer, reuse-first-implementation, bounded architecture-review, native-quality-review.

## Evidence and findings
The Owner screenshot shows the global application boundary, not the underlying exception. HTTP success never established client rendering. Installed React-PDF 11 defaults Document/Page to Suspense and throws resource/render errors toward a boundary; the existing integration supplied callback-mode loading/error props without opting out. Standard PDF.js in isolated Node 24 with native canvas globals failed the real PDF with `UnknownErrorException: hashOriginal.toHex is not a function`. This is a demonstrated compatibility defect, not proof of the exact Safari exception.

## Changes/reuse
EXTEND_EXISTING Flipbook and ReaderLoader used by public read and admin preview. Browser-only Turbopack alias resolves PDF.js to its bundled legacy API; copy script serves matching legacy worker, with version/legacy worker query to avoid old cache reuse. React-PDF Document/Page explicitly opt into callback mode. Source/load/render failures stay in reader UI; first-page async errors and invalid dimensions are caught. Reader-local boundary catches import/render failures and offers retry, original file URL and back link. Direct PDF uses unchanged public/admin endpoint; no authentication bypass. Normal layout and flipping unchanged.

Artifacts: `next.config.ts`, `scripts/copy-pdf-worker.mjs`, generated `public/pdf.worker.min.mjs`, `src/components/reader/{flipbook,reader-loader}.tsx`, `tests/reader-repair.test.ts`, contract/result docs.

## Criteria / checks
- A1 PASS: reference PDF loads, 15 pages, valid first-page dimensions and nonempty operator list. Fresh child process repeats after deleting Map.getOrInsertComputed, Promise.try and typed-array toHex/fromBase64. Node/worker functional test only, not browser canvas rendering.
- A2 PASS: callback/tree harness executes actual transpiled onLoad callback for success, failed page and invalid dimensions; no rejected promise escapes; source/load callbacks set local errors; explicit Document/Page callback mode source checks.
- A3 PASS for functional scope: boundary fallback and retry exercised with public/admin supplied URLs; unexpected-error behavior in real React/browser remains unverified. A rejected dynamic-import cache may still require a tab reload; PDF fallback remains available.
- A4 PASS in diff/source and unauthenticated HTTP checks: no route/auth/schema/data/CSS changes. Public URL and ranged PDF return 200/206; admin preview 307, admin PDF 401.
- A5 PASS: final npm test 47/47; npm run lint exit 0; npm run typecheck exit 0; fresh final npm run build exit 0. Generated browser reader bundle includes legacy typed-array/Map support. Worker domain/local SHA-256 matches `a33cfe728c584fdba4fcc1fd54bcdc2f9f2f13889ddbb5b2bd1d0f8cbe49b84e` (1,317,034 bytes).

## Activation
Before first activation, verified actual `/proc` listener PID 60106, socket inode 161403036, cwd `/mnt/storage/projects/nana-website`, command `next-server (v16.4.3)`; new PID 61990, socket inode 162116551. A mandatory final fresh production build was then run and activated: before SIGTERM verified PID 61990/socket inode 162116551/cwd/command; final PID 62614/socket inode 162127740, same cwd/command, `0.0.0.0:3000`. Evidence `/tmp/pikso-reader-activation.json`. Final local/domain read route 200 and domain HTML contains final build ID. Initial activation checks: versioned worker 200 and PDF range 206 with `%PDF-`, total 32,647,158 bytes.

## Provenance / limitations
Source diff `/tmp/pikso-reader.diff`, snapshots `/tmp/pikso-reader-before`; ReaderLoader baseline reconstructed from previously read exact text, not originally copied. No Git metadata. Logs `/tmp/pikso-reader-final-{tests,lint,types,build}.log` (final full checks); HTTP captures `/tmp/pikso-reader-{local,domain}.html`, `/tmp/pikso-reader-file-headers`, `/tmp/pikso-reader-domain-worker.mjs`. Python urllib request hit HTTP 403; curl checks succeeded separately (not claimed a successful urllib run). An attempted optional core-js install failed with unrelated optional Tailwind ENOENT; not retried, package.json and package-lock byte-identical to baseline, no new dependency used. Initial test-harness transpilation target issue was corrected; final full suite passed.

No PDF/cover/book status/data/env/proxy/credential/migration/commit/push mutation. No browser/Playwright/visual testing or production test book. Does not promise iOS below React-PDF's documented minimum. Exact Safari exception and authenticated preview still unknown. Next decision: Owner reopens URL and confirms reader result; no data/infrastructure change requested.
