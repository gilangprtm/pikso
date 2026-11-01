# PIKSO-READER-PERCENTAGE-ONLY/r1

## Lightweight contract / target

Execution `direct_native`, responsibility `native_pi`; baseline build `3eAbTB61Xrw68De5oiRts`. Objective: remove the loading progress bar but retain numeric percentage, spinner, caption and error handling; answer why reopening can still be slow based on current evidence. Owner screenshot `/tmp/aionui/508f1441/IMG_8095.png` shows the bar and 4% but does not expose network/cache diagnostics. Included `src/components/reader/flipbook.tsx`, focused regression test, read-only cache inspection, full checks and standing-authorized verified port-3000 activation. Excluded new persistent browser storage/service worker/CDN, cache/access-policy changes, PDF/book/status/data/env/proxy/credentials/dependencies/migrations/commit/push and browser tooling. A new chunk cache changes persistence/integration and requires a separately bounded design/decision, not an invisible header-policy change.

## Phases / reuse

Intake → classify → lightweight contract → execute → self_review → close/report. Skills: kitab-operator (healthy, resolve/read STD-023), native-workflow, native-programmer/reuse-first-implementation, native-business-analysis for cache findings, native-quality-review. Reuse `EXTEND_EXISTING`: keep shared Flipbook loading text and callback percentage, remove only native `<progress>` element; extend actual element-tree regression in `tests/reader-repair.test.ts` with no progress element/source assertion. No new abstraction or storage.

## Cache findings / provenance

- `src/lib/serve-file.ts`: public PDF `private, max-age=0, must-revalidate` with ETag/Last-Modified. It allows browser storage but requires validation, not guaranteed reuse or offline storage. Admin remains no-store; published lookup in public file route precedes validator response.
- `src/app/books/[slug]/read/page.tsx` hashes immutable filename for stable query identity (not build ID). No date/random cache-busting added.
- Installed PDF.js `legacy/build/pdf.mjs` lines 20072–20220: GET with default fetch caching; initial full-response reader cancels when range is supported and streaming disabled, then separate Range GETs. It does not explicitly store persistent chunks. Source inspection of shared reader finds no IndexedDB/Cache Storage/service worker integration.
- Browser may not keep/combine incomplete/206 responses; local PDF.js document/render state is rebuilt on reopening. HTTP validators cannot skip PDF parse/render. Numeric progress is byte-loading progress, not proof of network transfer versus cached data or first-page readiness.
- Domain read-only GET range: 206 / 1024 bytes / ~0.43s; HEAD: 200 / PDF / 32,647,158 length / ~0.70s; explicit If-None-Match request: 304 / zero body / ~0.42s. Captures `/tmp/pikso-percent-cache-{head,range,304}.*`. This proves server validation, not Safari cache-hit behavior. Diagnostic query `v=inspect` intentionally does not establish actual reader-cache reuse.
- Exact cause of Safari delay unknown: no device network trace/iOS version available, browser tooling prohibited. Do not claim cache is disabled, bytes were retransferred, or screenshot 4% establishes failure. Previous implementation delivered HTTP cache eligibility, not deterministic persisted-range reuse; correct that expectation explicitly.

## Acceptance / verification

1. No visual progress bar, numeric actual percentage preserved: PASS by transpiled actual-element-tree test at 25%, 100% clamp and unknown-total state, plus source assertion no `<progress>`.
2. Loading spinner/caption and errors/access/cache unchanged: PASS source/test review; only loader child removed; public/admin transport and error branches untouched.
3. Cache question separated into observed facts/inferences/unknowns: PASS for source + live HTTP observations; no unsupported Safari root-cause assertion.
4. `npm test` 57/57, `npm run lint`, `npm run typecheck`, `npm run build`: PASS. Logs `/tmp/pikso-percent-{tests,lint,types,build}.log`.

Build `uyXlV7IaRy-DAPt59I1VC` activated using standing authorization. `/proc` preactivation sole listener PID 70898, `next-server (v16.4.3)`, cwd `/mnt/storage/projects/nana-website`, socket 163285876; after PID 71808 same project/command, socket 163587069 on `0.0.0.0:3000`. Evidence `/tmp/pikso-percent-activation.json`; helper `/tmp/pikso-percent-activate.py`. Local/domain reader routes both HTTP 200, latest build ID. Review diff `/tmp/pikso-percent.diff`; no Git metadata. `self_review PASS` for bounded change; no device/browser validation. Overall task lifecycle `completed`, code gate PASS; cache follow-up remains separate decision: Owner may authorize a persistent per-device PDF chunk cache with mandatory access revalidation. No new persistence authorized/implemented by this task.
