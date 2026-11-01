# PIKSO-READER-PERFORMANCE/r1

- Path direct_native; full bounded contract; responsibility native_pi. Target `/mnt/storage/projects/nana-website`, baseline build `P01eywcz-1dAm5rKNP7dI`; no Git metadata. Owner authorizes implementation of discussed reader loading/cache improvements and standing successful-build activation on verified port 3000.
- Objective: demand-driven PDF loading, bounded server I/O/render memory, reusable validated browser responses, observable loading/recovery. Diagnose without pretending to reproduce Safari.
- Governance: KITAB healthy; STD-023 resolve/read. Skills native-workflow, architecture-review, native-programmer, reuse-first-implementation, native-quality-review (self_review).
- Included: existing serveFile helper, public PDF route, read URL version, shared public/admin Flipbook, functional tests and evidence. No data/PDF/cover mutation, new dependency, migration, env/proxy/credential changes, offline/service-worker caching, commit/push or browser tooling.

## Architecture review — DESIGN_BOUNDED

Inspected serveFile and all four consumers (public/admin PDF and cover), getPublicBook published guard, admin authorizeAdmin, storage saveUpload unique UUID/wx immutable writes, public/admin read pages, shared Flipbook/loader, React-PDF Document options/progress/callback handling and PDF.js installed options documentation, Next route/client guides.

Options: (1) long-lived public immutable/CDN cache: maximizes reuse but bypasses publish-state checks after unpublish; rejected to preserve existing draft privacy. (2) browser private no-cache with validators on public PDF: permits storage/revalidation, preserves server published lookup before 304; chosen. (3) IndexedDB/service-worker range cache or prerendered image pipeline: unnecessary persistence/processing/auth contracts; excluded. Do not convert PDFs/linearize existing production files in this task.

EXTEND_EXISTING serveFile and Flipbook; preserve route URLs (optional version query only), auth, cover default no-store, public published guard. Public PDF opts into private no-cache, strong version validator from unique immutable file identity + size/high-resolution mtime; original files only written once through wx. HEAD, conditional GET, If-Range and single byte ranges; stream bounded 64 KiB pulls with cancellation/close rather than whole-file read. Covers/admin remain no-store. No public CDN retention or promise of offline access; browser reuse of partial HTTP responses depends on browser implementation and eviction. Reopening may still involve parsing/rendering.

PDF.js stable options: range enabled, disableStream and disableAutoFetch true (required together by installed docs), 256 KiB range size. First-page data can span distant offsets or most of file: no universal byte/time promise. Render current/adjacent pages only; cap canvas DPR. Expose bytes loaded vs total as transfer, not guaranteed readiness percentage; render/loading states + delayed slow warning and explicit reload/direct-PDF recovery without an automatic retry loop.

## Acceptance / evidence

1. Exact full/single-range bytes, suffix/open-ended/oversize end handling, HEAD bodyless, invalid/unsatisfiable and missing files; bounded lazy I/O and cancelled stream closure. Functional temp-storage tests.
2. Public PDF revalidates via ETag/Last-Modified; changed version not 304, If-Range match/mismatch; no auth/draft bypass; admin/cover default no-store. Actual route functional tests with test-only DB/auth or transpiled guards.
3. Demand-driven real reference PDF via local HTTP server actual route helper + PDF.js: first page and operators, observe range requests and transferred bytes; no production test data. Not browser/Safari proof.
4. Shared reader stable options, progress, slow warning cleanup, direct endpoint recovery, bounded adjacent rendering/DPR; callback/tree/effect harness, not React lifecycle/browser simulation.
5. Full npm test, lint, typecheck, build; separate self_review of final diff. Verify actual listener cwd/command/socket before authorized activation; local/domain HTTP evidence. Device incident gate stays PARTIAL until Owner confirms.

Next boundary: if data conversion/CDN/offline storage/unsupported-iOS support needed, request separate decision. State completed; self_review implementation/functional/HTTP gate PASS, device incident gate PARTIAL. See `docs/reader-performance-result.md`.
