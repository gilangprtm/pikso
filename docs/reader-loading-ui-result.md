# PIKSO-READER-LOADING-UI/r1

## Lightweight contract

Path direct_native; responsibility native_pi. Baseline build kBC1W3vU0ef3kkCXupB2f. Objective: keep only circled loading information from Owner screenshot IMG_8093.jpeg: spinner, percentage instead of MB, and progressive-reading caption. Remove slow-warning panel/retry/direct-PDF links from loading only; real errors/boundary keep recovery. Included shared Flipbook and existing tests; excluded PDF/data/status/API/cache/auth/CSS/theme changes, dependencies, proxy/env/migration/commit/push and browser tooling. Standing build/verified port-3000 activation applies.

Reuse EXTEND_EXISTING: inspected shared Flipbook, ReaderLoader, reader-repair/performance tests, installed Next client guide and PDF.js progress source. No separate UI component/percentage simulator. Existing public HEAD and admin auto-HEAD supply file size without downloading bytes because range progress can omit total; errors ignored (indeterminate fallback, not a fabricated percentage). Initial unknown size uses spinner/indeterminate progress, then actual received bytes / known total clamped to 100. Percentage is data-loading progress, not readiness or guaranteed download of entire book.

Skills/phases: native-workflow, kitab-operator healthy/STD-023, native-programmer, reuse-first-implementation, distinct native-quality-review self_review. Native checks only. Acceptance: single uncluttered loader, no MB/extra links/warning/retry in loading, actual percentages with unknown-total fallback, unchanged data/cache/error behavior, full tests/lint/types/build/activation.

## Implementation

`src/components/reader/flipbook.tsx`: remove slow-warning timer/state/unused onReady wiring; preserve lazy range options and rendering. Loader contains spinner, caption, native progress and percentage. One cancellable HEAD request to same supplied public/protected PDF URL acquires total. No new route/API contract. `tests/reader-repair.test.ts` updates callback harness for HEAD/progress and loading shape; `tests/reader-performance.test.ts` replaces obsolete warning assertions while retaining real PDF/range/cache regressions. First old warning test failed as expected after intentional removal; revised to Owner's current acceptance.

Provenance: prior performance diff and current snapshots; Flipbook baseline reconstructed from `/tmp/pikso-performance-before` + `/tmp/pikso-performance.diff` (not originally copied before current first edit). No Git metadata. Screenshot supplied by Owner is only device visual evidence, not assistant browser testing.

## Checks / self_review / activation

- Reused test harness expanded to inspect actual loader element: progress 25% for 250/1000; clamped to 100%; unknown size keeps indeterminate “Menyiapkan halaman cerita…”; loading content contains spinner/progress/caption but no MB, download link or retry. Existing error branch still provides direct PDF and back links. HEAD called on exact supplied URL, response content type/length checked, request aborted on unmount. Separate performance regression continues verifying demand ranges/cache/authorization.
- Targeted `npx tsx --test tests/reader-repair.test.ts tests/reader-performance.test.ts`: 11/11 PASS. Full `npm test`: 57/57 PASS. `npm run lint`, `npm run typecheck`, `npm run build`: PASS. Logs `/tmp/pikso-loading-{tests,lint,types,build}.log`.
- Review caught potential inaccurate “0%” when PDF.js has not yet reported progress; now percentage is shown only when size and actual byte count are known, otherwise spinner/indeterminate title. An obsolete performance assertion for the intentionally removed delay-warning was replaced with loading clarity assertions. No independent reviewer; `self_review PASS` for requested presentation/code behavior. Browser rendering not established.
- Final build `3eAbTB61Xrw68De5oiRts`; authorized activation helper `/tmp/pikso-loading-activate.py`. `/proc` before: sole PID 69776, `next-server (v16.4.3)`, project cwd `/mnt/storage/projects/nana-website`, socket 163126362. After: sole PID 70898, same command/cwd, socket 163285876 on 0.0.0.0:3000. Evidence `/tmp/pikso-loading-activation.json`.
- Local and domain detail reader routes HTTP 200, include final build ID. Public PDF HEAD HTTP 200, content-length 32,647,158 and PDF type; unauthenticated admin HEAD 401. Captures `/tmp/pikso-loading-{local,domain,head,admin-head}.*`. No browser/visual-tool testing.
- Final diff `/tmp/pikso-loading.diff`; no Git metadata. No cache/server changes in this narrow follow-up, no PDF/book/db/env/auth/proxy/credential/migration/commit/push mutations. Overall task completed; code/test gate PASS, device visual confirmation next: Tuan reloads reader and checks the loading text shows percentage without MB or extra loading links.
